# API Endpoint Implementation Plan: GET /api/quiz-sessions

## 1. Endpoint Overview

List the user's quiz sessions with pagination and filtering. Returns a paginated list of session summaries sorted by completion date (most recent first by default).

## 2. Request Details

- **HTTP Method:** GET
- **URL Structure:** `/api/quiz-sessions`
- **Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-indexed) |
| `limit` | integer | 20 | Items per page (max 100) |
| `quiz_type` | enum | - | Filter by quiz type |
| `difficulty` | enum | - | Filter by difficulty |
| `status` | enum | - | Filter by status |
| `sort` | string | `completed_at:desc` | Sort field and direction |

### Request Headers
- `Authorization: Bearer <access_token>` (required)

## 3. Used Types

### DTOs (from `src/types.ts`)
```typescript
// Output
interface QuizSessionListItemDTO {
  id: string;
  quiz_type: QuizTypeEnum;
  difficulty: DifficultyEnum;
  score: number | null;
  status: SessionStatusEnum;
  time_taken_seconds: number | null;
  started_at: string;
  completed_at: string | null;
}

interface PaginationDTO {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface QuizSessionListDTO {
  data: QuizSessionListItemDTO[];
  pagination: PaginationDTO;
}
```

### Zod Validation Schema
```typescript
import { z } from 'zod';

export const quizSessionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  quiz_type: z.enum(['find_note', 'name_note', 'mark_chord', 'recognize_interval']).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  status: z.enum(['in_progress', 'completed', 'abandoned']).optional(),
  sort: z.string().regex(/^(completed_at|started_at|score):(asc|desc)$/).default('completed_at:desc'),
});
```

## 4. Response Details

### Success Response (200 OK)
```json
{
  "data": [
    {
      "id": "uuid",
      "quiz_type": "find_note",
      "difficulty": "medium",
      "score": 8,
      "status": "completed",
      "time_taken_seconds": 145,
      "started_at": "2024-01-15T14:00:00Z",
      "completed_at": "2024-01-15T14:02:25Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

### Error Responses

| Status | Code | Message | Scenario |
|--------|------|---------|----------|
| 400 | `VALIDATION_ERROR` | Invalid query parameters | Bad page, limit, or filter values |
| 401 | `UNAUTHORIZED` | Authentication required | Missing or invalid token |
| 500 | `SERVER_ERROR` | Failed to fetch quiz sessions | Database error |

## 5. Data Flow

```
┌─────────────┐      ┌─────────────┐      ┌────────────────┐      ┌──────────┐
│   Client    │─────▶│  API Route  │─────▶│QuizSessionSvc  │─────▶│ Supabase │
│             │      │  (Astro)    │      │                │      │    DB    │
└─────────────┘      └─────────────┘      └────────────────┘      └──────────┘
       │                    │                     │                    │
       │                    ▼                     ▼                    ▼
       │             1. Verify auth        2. Build query        3. SELECT with
       │             2. Parse query        3. Execute with          filters,
       └─────────────3. Call service          pagination            pagination
        Query Params
```

### Steps:
1. Verify authentication
2. Parse and validate query parameters
3. Build database query with filters
4. Execute count query for total
5. Execute paginated select query
6. Return data with pagination metadata

## 6. Security Considerations

### Authentication
- Requires valid access token

### Authorization
- RLS ensures user only sees their own sessions
- `user_id = auth.uid()` policy

### Query Safety
- Validate and sanitize all query parameters
- Use parameterized queries (handled by Supabase SDK)
- Limit max results to prevent abuse

## 7. Error Handling

### Query Parameter Validation
```typescript
const validation = quizSessionsQuerySchema.safeParse(Object.fromEntries(url.searchParams));
if (!validation.success) {
  return new Response(
    JSON.stringify({ code: 'VALIDATION_ERROR', message: 'Invalid query parameters' }),
    { status: 400 }
  );
}
```

## 8. Performance Considerations

### Optimizations
- Index on (user_id, completed_at DESC) for default sort
- Count query uses same filters
- Limit max page size to 100

### Caching
- Consider caching recent queries briefly

## 9. Implementation Steps

### Step 1: Add Query Schema
Update file: `src/lib/schemas/quiz-session.schemas.ts`
```typescript
// ... existing schemas ...

export const quizSessionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  quiz_type: z.enum(['find_note', 'name_note', 'mark_chord', 'recognize_interval']).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  status: z.enum(['in_progress', 'completed', 'abandoned']).optional(),
  sort: z.string().regex(/^(completed_at|started_at|score):(asc|desc)$/).default('completed_at:desc'),
});

export type QuizSessionsQueryInput = z.infer<typeof quizSessionsQuerySchema>;
```

### Step 2: Add List Method to Service
Update file: `src/lib/services/quiz-session.service.ts`
```typescript
import type {
  QuizSessionListDTO,
  QuizSessionListItemDTO,
  // ... other imports
} from '../../types';

export class QuizSessionService {
  // ... existing methods ...

  async listSessions(
    userId: string,
    query: {
      page: number;
      limit: number;
      quiz_type?: string;
      difficulty?: string;
      status?: string;
      sort: string;
    }
  ): Promise<{ data?: QuizSessionListDTO; error?: { status: number; body: ApiErrorDTO } }> {
    // Parse sort parameter
    const [sortField, sortDirection] = query.sort.split(':');
    const ascending = sortDirection === 'asc';

    // Build base query
    let baseQuery = this.supabase
      .from('quiz_sessions')
      .select('id, quiz_type, difficulty, score, status, time_taken_seconds, started_at, completed_at', { count: 'exact' })
      .eq('user_id', userId);

    // Apply filters
    if (query.quiz_type) {
      baseQuery = baseQuery.eq('quiz_type', query.quiz_type);
    }
    if (query.difficulty) {
      baseQuery = baseQuery.eq('difficulty', query.difficulty);
    }
    if (query.status) {
      baseQuery = baseQuery.eq('status', query.status);
    }

    // Apply sorting and pagination
    const offset = (query.page - 1) * query.limit;

    const { data, error, count } = await baseQuery
      .order(sortField, { ascending, nullsFirst: false })
      .range(offset, offset + query.limit - 1);

    if (error) {
      console.error('Failed to fetch quiz sessions:', error.message);
      return {
        error: {
          status: 500,
          body: { code: 'SERVER_ERROR', message: 'Failed to fetch quiz sessions' }
        }
      };
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / query.limit);

    return {
      data: {
        data: data as QuizSessionListItemDTO[],
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          total_pages: totalPages,
        }
      }
    };
  }
}
```

### Step 3: Add GET Handler
Update file: `src/pages/api/quiz-sessions/index.ts`
```typescript
import { quizSessionsQuerySchema } from '../../../lib/schemas/quiz-session.schemas';

// ... existing POST handler ...

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
  const validation = quizSessionsQuerySchema.safeParse(queryParams);

  if (!validation.success) {
    return new Response(
      JSON.stringify({ code: 'VALIDATION_ERROR', message: 'Invalid query parameters' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3. Call service
  const sessionService = new QuizSessionService(locals.supabase);
  const result = await sessionService.listSessions(authResult.userId, validation.data);

  // 4. Return response
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
- [ ] Default query returns paginated results
- [ ] page=2 returns correct offset
- [ ] limit=50 works, limit=101 fails
- [ ] quiz_type filter works
- [ ] difficulty filter works
- [ ] status filter works
- [ ] Multiple filters combine correctly
- [ ] sort=started_at:asc works
- [ ] sort=score:desc works
- [ ] Empty results return empty array with pagination
- [ ] Pagination total_pages calculated correctly
- [ ] Missing Authorization returns 401
