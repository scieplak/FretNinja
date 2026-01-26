# API Endpoint Implementation Plan: GET /api/stats/heatmap

## 1. Endpoint Overview

Get the user's error heatmap data for visualization. Returns aggregated error counts by fret position and string, allowing the frontend to display a visual heatmap of problem areas on the fretboard.

## 2. Request Details

- **HTTP Method:** GET
- **URL Structure:** `/api/stats/heatmap`
- **Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `quiz_type` | enum | - | Filter by quiz type |
| `from_date` | date | - | Start date (ISO 8601) |
| `to_date` | date | - | End date (ISO 8601) |

### Request Headers
- `Authorization: Bearer <access_token>` (required)

## 3. Used Types

### DTOs (from `src/types.ts`)
```typescript
// Output
interface HeatmapDataItemDTO {
  fret_position: number;
  string_number: number;
  error_count: number;
}

interface HeatmapFiltersDTO {
  quiz_type: QuizTypeEnum | null;
  from_date: string | null;
  to_date: string | null;
}

interface HeatmapResponseDTO {
  data: HeatmapDataItemDTO[];
  max_error_count: number;
  total_errors: number;
  filters: HeatmapFiltersDTO;
}
```

### Zod Validation Schema
```typescript
export const heatmapQuerySchema = z.object({
  quiz_type: z.enum(['find_note', 'name_note', 'mark_chord', 'recognize_interval']).optional(),
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
```

## 4. Response Details

### Success Response (200 OK)
```json
{
  "data": [
    {
      "fret_position": 3,
      "string_number": 5,
      "error_count": 12
    },
    {
      "fret_position": 7,
      "string_number": 2,
      "error_count": 8
    }
  ],
  "max_error_count": 12,
  "total_errors": 45,
  "filters": {
    "quiz_type": null,
    "from_date": null,
    "to_date": null
  }
}
```

### Error Responses

| Status | Code | Message | Scenario |
|--------|------|---------|----------|
| 400 | `VALIDATION_ERROR` | Invalid date format | Bad date string |
| 401 | `UNAUTHORIZED` | Authentication required | Missing token |
| 500 | `SERVER_ERROR` | Failed to fetch heatmap data | Database error |

## 5. Data Flow

```
┌─────────┐    ┌─────────┐    ┌────────────────┐    ┌──────────┐
│ Client  │───▶│API Route│───▶│  StatsService  │───▶│ Supabase │
└─────────┘    └─────────┘    └────────────────┘    └──────────┘
                    │                │                    │
                    ▼                ▼                    ▼
             1. Auth          2. Build query        3. Aggregate
             2. Validate      3. Execute query         FROM view or
             3. Call svc      4. Calculate stats       direct query
```

### Query Strategy:
- Use `user_error_heatmap` view for simple queries
- Or direct query with JOINs for filtered queries

## 6. Security Considerations

### Authentication & Authorization
- Requires valid token
- User ID from token ensures only own data
- View/query filtered by user_id

## 7. Implementation Steps

### Step 1: Create Stats Schemas
Create file: `src/lib/schemas/stats.schemas.ts`
```typescript
import { z } from 'zod';

export const heatmapQuerySchema = z.object({
  quiz_type: z.enum(['find_note', 'name_note', 'mark_chord', 'recognize_interval']).optional(),
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
});

export type HeatmapQueryInput = z.infer<typeof heatmapQuerySchema>;
```

### Step 2: Create Stats Service
Create file: `src/lib/services/stats.service.ts`
```typescript
import type { SupabaseClient } from '../../db/supabase.client';
import type { HeatmapResponseDTO, HeatmapDataItemDTO, ApiErrorDTO } from '../../types';

export class StatsService {
  constructor(private supabase: SupabaseClient) {}

  async getHeatmap(
    userId: string,
    filters: {
      quiz_type?: string;
      from_date?: string;
      to_date?: string;
    }
  ): Promise<{ data?: HeatmapResponseDTO; error?: { status: number; body: ApiErrorDTO } }> {
    // If no filters, use the view directly
    if (!filters.quiz_type && !filters.from_date && !filters.to_date) {
      const { data, error } = await this.supabase
        .from('user_error_heatmap')
        .select('fret_position, string_number, error_count')
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to fetch heatmap:', error.message);
        return {
          error: { status: 500, body: { code: 'SERVER_ERROR', message: 'Failed to fetch heatmap data' } }
        };
      }

      return this.formatHeatmapResponse(data || [], filters);
    }

    // With filters, need to query directly with JOINs
    let query = this.supabase
      .from('quiz_answers')
      .select(`
        fret_position,
        string_number,
        quiz_sessions!inner (
          user_id,
          quiz_type,
          completed_at
        )
      `)
      .eq('is_correct', false)
      .not('fret_position', 'is', null)
      .not('string_number', 'is', null)
      .eq('quiz_sessions.user_id', userId);

    if (filters.quiz_type) {
      query = query.eq('quiz_sessions.quiz_type', filters.quiz_type);
    }

    if (filters.from_date) {
      query = query.gte('quiz_sessions.completed_at', `${filters.from_date}T00:00:00Z`);
    }

    if (filters.to_date) {
      query = query.lte('quiz_sessions.completed_at', `${filters.to_date}T23:59:59Z`);
    }

    const { data: rawData, error } = await query;

    if (error) {
      console.error('Failed to fetch heatmap:', error.message);
      return {
        error: { status: 500, body: { code: 'SERVER_ERROR', message: 'Failed to fetch heatmap data' } }
      };
    }

    // Aggregate the results
    const aggregated = this.aggregateHeatmapData(rawData || []);

    return this.formatHeatmapResponse(aggregated, filters);
  }

  private aggregateHeatmapData(
    rawData: Array<{ fret_position: number | null; string_number: number | null }>
  ): HeatmapDataItemDTO[] {
    const map = new Map<string, number>();

    for (const row of rawData) {
      if (row.fret_position === null || row.string_number === null) continue;
      const key = `${row.fret_position}-${row.string_number}`;
      map.set(key, (map.get(key) || 0) + 1);
    }

    const result: HeatmapDataItemDTO[] = [];
    for (const [key, count] of map) {
      const [fret, string] = key.split('-').map(Number);
      result.push({
        fret_position: fret,
        string_number: string,
        error_count: count,
      });
    }

    return result;
  }

  private formatHeatmapResponse(
    data: HeatmapDataItemDTO[],
    filters: { quiz_type?: string; from_date?: string; to_date?: string }
  ): { data: HeatmapResponseDTO } {
    const maxErrorCount = data.reduce((max, item) => Math.max(max, item.error_count), 0);
    const totalErrors = data.reduce((sum, item) => sum + item.error_count, 0);

    return {
      data: {
        data,
        max_error_count: maxErrorCount,
        total_errors: totalErrors,
        filters: {
          quiz_type: (filters.quiz_type as HeatmapResponseDTO['filters']['quiz_type']) || null,
          from_date: filters.from_date || null,
          to_date: filters.to_date || null,
        },
      }
    };
  }
}
```

### Step 3: Create API Endpoint
Create file: `src/pages/api/stats/heatmap.ts`
```typescript
import type { APIRoute } from 'astro';
import { StatsService } from '../../../lib/services/stats.service';
import { heatmapQuerySchema } from '../../../lib/schemas/stats.schemas';
import { verifyAuth } from '../../../lib/helpers/auth.helper';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals, url }) => {
  // 1. Verify authentication
  const authHeader = request.headers.get('Authorization');
  const authResult = await verifyAuth(locals.supabase, authHeader);

  if (authResult.error) {
    return new Response(
      JSON.stringify(authResult.error.body),
      { status: authResult.error.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. Parse and validate query parameters
  const queryParams = Object.fromEntries(url.searchParams);
  const validation = heatmapQuerySchema.safeParse(queryParams);

  if (!validation.success) {
    return new Response(
      JSON.stringify({ code: 'VALIDATION_ERROR', message: 'Invalid date format' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3. Call service
  const statsService = new StatsService(locals.supabase);
  const result = await statsService.getHeatmap(authResult.userId, validation.data);

  if (result.error) {
    return new Response(
      JSON.stringify(result.error.body),
      { status: result.error.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify(result.data),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
```

### Step 4: Testing Checklist
- [ ] Returns 200 with heatmap data
- [ ] No filters uses view efficiently
- [ ] quiz_type filter works
- [ ] from_date filter works
- [ ] to_date filter works
- [ ] Combined filters work
- [ ] max_error_count calculated correctly
- [ ] total_errors calculated correctly
- [ ] Invalid date format returns 400
- [ ] New user returns empty data array
- [ ] Missing Authorization returns 401
