# API Endpoint Implementation Plan: GET /api/achievements

## 1. Endpoint Overview

List all available achievements in the system. This is reference data that describes what achievements exist and their unlock criteria. Authentication is optional - both authenticated and anonymous users can access this endpoint.

## 2. Request Details

- **HTTP Method:** GET
- **URL Structure:** `/api/achievements`
- **Parameters:** None
- **Query Parameters:** None

### Request Headers
- `Authorization: Bearer <access_token>` (optional)

## 3. Used Types

### DTOs (from `src/types.ts`)
```typescript
// Output
type AchievementDTO = AchievementEntity;

// AchievementEntity structure:
interface AchievementDTO {
  id: string;
  name: string;
  display_name: string;
  description: string;
  criteria: Record<string, unknown>; // JSONB
  created_at: string;
}

interface AchievementsListDTO {
  data: AchievementDTO[];
}
```

## 4. Response Details

### Success Response (200 OK)
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "first_steps",
      "display_name": "First Steps",
      "description": "Complete your first quiz",
      "criteria": {
        "type": "total_quizzes",
        "count": 1
      },
      "created_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "name": "perfect_round",
      "display_name": "Perfect Round",
      "description": "Score 10/10 on any quiz",
      "criteria": {
        "type": "perfect_score"
      },
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Error Responses

| Status | Code | Message | Scenario |
|--------|------|---------|----------|
| 500 | `SERVER_ERROR` | Failed to fetch achievements | Database error |

## 5. Data Flow

```
┌─────────┐    ┌─────────┐    ┌─────────────────┐    ┌──────────┐
│ Client  │───▶│API Route│───▶│AchievementSvc   │───▶│ Supabase │
└─────────┘    └─────────┘    └─────────────────┘    └──────────┘
                    │                │                    │
                    ▼                ▼                    ▼
             1. (Optional auth) 2. Fetch all        3. SELECT *
             2. Call service       achievements        FROM achievements
```

## 6. Security Considerations

### Authentication
- Optional - endpoint is publicly accessible
- RLS policy allows anon and authenticated SELECT

### Data Exposure
- All achievement data is public reference data
- No sensitive information in achievements table

## 7. Implementation Steps

### Step 1: Update Achievement Service
Update file: `src/lib/services/achievement.service.ts`
```typescript
import type { SupabaseClient } from '../../db/supabase.client';
import type { AchievementDTO, AchievementsListDTO, ApiErrorDTO } from '../../types';

export class AchievementService {
  constructor(private supabase: SupabaseClient) {}

  async listAchievements(): Promise<{ data?: AchievementsListDTO; error?: { status: number; body: ApiErrorDTO } }> {
    const { data, error } = await this.supabase
      .from('achievements')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch achievements:', error.message);
      return {
        error: {
          status: 500,
          body: { code: 'SERVER_ERROR', message: 'Failed to fetch achievements' }
        }
      };
    }

    return {
      data: {
        data: (data || []) as AchievementDTO[]
      }
    };
  }

  // ... existing evaluateAndGrant method ...
}
```

### Step 2: Create API Endpoint
Create file: `src/pages/api/achievements/index.ts`
```typescript
import type { APIRoute } from 'astro';
import { AchievementService } from '../../../lib/services/achievement.service';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  // No authentication required - public endpoint
  const achievementService = new AchievementService(locals.supabase);
  const result = await achievementService.listAchievements();

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

### Step 3: Testing Checklist
- [ ] Returns 200 with all achievements
- [ ] Works without Authorization header
- [ ] Works with valid Authorization header
- [ ] All achievement fields present
- [ ] criteria is valid JSON object
- [ ] Returns seeded achievements (first_steps, perfect_round, etc.)
