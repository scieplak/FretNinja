# API Endpoint Implementation Plan: POST /api/quiz-sessions

## 1. Endpoint Overview

Start a new quiz session. Creates a session record with the specified quiz type, difficulty, and optional time limit. Only one active (in_progress) session is allowed per user at a time.

## 2. Request Details

- **HTTP Method:** POST
- **URL Structure:** `/api/quiz-sessions`
- **Parameters:**
  - Required: None (all data in body)
  - Optional: None
- **Request Body:**
```json
{
  "quiz_type": "find_note",
  "difficulty": "medium",
  "time_limit_seconds": 30
}
```

### Request Headers
- `Authorization: Bearer <access_token>` (required)
- `Content-Type: application/json`

## 3. Used Types

### DTOs (from `src/types.ts`)
```typescript
// Input
interface CreateQuizSessionCommand {
  quiz_type: QuizTypeEnum;
  difficulty: DifficultyEnum;
  time_limit_seconds?: number | null;
}

// Output
interface QuizSessionDTO {
  id: string;
  user_id: string;
  quiz_type: QuizTypeEnum;
  difficulty: DifficultyEnum;
  status: SessionStatusEnum;
  time_limit_seconds: number | null;
  started_at: string;
  created_at: string;
}

// Enums
type QuizTypeEnum = 'find_note' | 'name_note' | 'mark_chord' | 'recognize_interval';
type DifficultyEnum = 'easy' | 'medium' | 'hard';
type SessionStatusEnum = 'in_progress' | 'completed' | 'abandoned';
```

### Zod Validation Schema
```typescript
import { z } from 'zod';

export const createQuizSessionCommandSchema = z.object({
  quiz_type: z.enum(['find_note', 'name_note', 'mark_chord', 'recognize_interval']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  time_limit_seconds: z.number().int().positive().nullable().optional(),
}).refine(
  (data) => {
    if (data.difficulty === 'hard') {
      return data.time_limit_seconds != null && data.time_limit_seconds > 0;
    }
    return true;
  },
  { message: 'time_limit_seconds required for hard difficulty' }
);
```

## 4. Response Details

### Success Response (201 Created)
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "quiz_type": "find_note",
  "difficulty": "medium",
  "status": "in_progress",
  "time_limit_seconds": null,
  "started_at": "2024-01-15T14:00:00Z",
  "created_at": "2024-01-15T14:00:00Z"
}
```

### Error Responses

| Status | Code | Message | Scenario |
|--------|------|---------|----------|
| 400 | `VALIDATION_ERROR` | Invalid quiz_type | Unknown quiz type |
| 400 | `VALIDATION_ERROR` | Invalid difficulty | Unknown difficulty |
| 400 | `VALIDATION_ERROR` | time_limit_seconds required for hard difficulty | Hard mode without time limit |
| 400 | `VALIDATION_ERROR` | time_limit_seconds must be a positive integer | Invalid time limit |
| 401 | `UNAUTHORIZED` | Authentication required | Missing or invalid token |
| 409 | `SESSION_IN_PROGRESS` | You have an unfinished quiz session | Active session exists |
| 500 | `SERVER_ERROR` | Failed to create quiz session | Database error |

## 5. Data Flow

```
┌─────────────┐      ┌─────────────┐      ┌────────────────┐      ┌──────────┐
│   Client    │─────▶│  API Route  │─────▶│QuizSessionSvc  │─────▶│ Supabase │
│             │      │  (Astro)    │      │                │      │    DB    │
└─────────────┘      └─────────────┘      └────────────────┘      └──────────┘
                            │                     │                    │
                            ▼                     ▼                    ▼
                     1. Verify auth        2. Check active       3. Query/Insert
                     2. Validate body         session
                     3. Call service       3. Create session
```

### Steps:
1. Verify authentication and extract user ID
2. Parse and validate request body
3. Check if user has an active (in_progress) session
4. If active session exists, return 409 error
5. Create new session with status 'in_progress'
6. Return 201 with session data

## 6. Security Considerations

### Authentication
- Requires valid access token

### Authorization
- RLS ensures user can only create sessions for themselves
- user_id is set from authenticated user, not from request

### Business Rules
- Only one active session per user
- time_limit_seconds required for hard difficulty
- time_limit_seconds ignored for easy/medium

## 7. Error Handling

### Active Session Check
```typescript
const { data: activeSession } = await this.supabase
  .from('quiz_sessions')
  .select('id')
  .eq('user_id', userId)
  .eq('status', 'in_progress')
  .single();

if (activeSession) {
  return {
    error: {
      status: 409,
      body: { code: 'SESSION_IN_PROGRESS', message: 'You have an unfinished quiz session' }
    }
  };
}
```

## 8. Performance Considerations

### Optimizations
- Index on (user_id, status) for active session check
- Single insert operation

## 9. Implementation Steps

### Step 1: Create Quiz Session Schemas
Create file: `src/lib/schemas/quiz-session.schemas.ts`
```typescript
import { z } from 'zod';

export const createQuizSessionCommandSchema = z.object({
  quiz_type: z.enum(['find_note', 'name_note', 'mark_chord', 'recognize_interval'], {
    errorMap: () => ({ message: 'Invalid quiz_type' })
  }),
  difficulty: z.enum(['easy', 'medium', 'hard'], {
    errorMap: () => ({ message: 'Invalid difficulty' })
  }),
  time_limit_seconds: z
    .number()
    .int('time_limit_seconds must be a positive integer')
    .positive('time_limit_seconds must be a positive integer')
    .nullable()
    .optional(),
}).refine(
  (data) => {
    if (data.difficulty === 'hard') {
      return data.time_limit_seconds != null && data.time_limit_seconds > 0;
    }
    return true;
  },
  { message: 'time_limit_seconds required for hard difficulty' }
);

export type CreateQuizSessionCommandInput = z.infer<typeof createQuizSessionCommandSchema>;
```

### Step 2: Create Quiz Session Service
Create file: `src/lib/services/quiz-session.service.ts`
```typescript
import type { SupabaseClient } from '../../db/supabase.client';
import type {
  CreateQuizSessionCommand,
  QuizSessionDTO,
  ApiErrorDTO
} from '../../types';

export class QuizSessionService {
  constructor(private supabase: SupabaseClient) {}

  async createSession(
    userId: string,
    command: CreateQuizSessionCommand
  ): Promise<{ data?: QuizSessionDTO; error?: { status: number; body: ApiErrorDTO } }> {
    // 1. Check for existing active session
    const { data: activeSession } = await this.supabase
      .from('quiz_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .maybeSingle();

    if (activeSession) {
      return {
        error: {
          status: 409,
          body: { code: 'SESSION_IN_PROGRESS', message: 'You have an unfinished quiz session' }
        }
      };
    }

    // 2. Create new session
    const { data, error } = await this.supabase
      .from('quiz_sessions')
      .insert({
        user_id: userId,
        quiz_type: command.quiz_type,
        difficulty: command.difficulty,
        time_limit_seconds: command.difficulty === 'hard' ? command.time_limit_seconds : null,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .select('id, user_id, quiz_type, difficulty, status, time_limit_seconds, started_at, created_at')
      .single();

    if (error) {
      console.error('Failed to create quiz session:', error.message);
      return {
        error: {
          status: 500,
          body: { code: 'SERVER_ERROR', message: 'Failed to create quiz session' }
        }
      };
    }

    return { data };
  }
}
```

### Step 3: Create API Endpoint
Create file: `src/pages/api/quiz-sessions/index.ts`
```typescript
import type { APIRoute } from 'astro';
import { QuizSessionService } from '../../../lib/services/quiz-session.service';
import { createQuizSessionCommandSchema } from '../../../lib/schemas/quiz-session.schemas';
import { verifyAuth } from '../../../lib/helpers/auth.helper';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  // 1. Verify authentication
  const authHeader = request.headers.get('Authorization');
  const authResult = await verifyAuth(locals.supabase, authHeader);

  if (authResult.error) {
    return new Response(
      JSON.stringify(authResult.error.body),
      { status: authResult.error.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ code: 'VALIDATION_ERROR', message: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3. Validate input
  const validation = createQuizSessionCommandSchema.safeParse(body);
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        code: 'VALIDATION_ERROR',
        message: validation.error.issues[0].message
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 4. Call service
  const sessionService = new QuizSessionService(locals.supabase);
  const result = await sessionService.createSession(authResult.userId, validation.data);

  // 5. Return response
  if (result.error) {
    return new Response(
      JSON.stringify(result.error.body),
      { status: result.error.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify(result.data),
    { status: 201, headers: { 'Content-Type': 'application/json' } }
  );
};
```

### Step 4: Testing Checklist
- [ ] Valid request creates session with 201
- [ ] status is 'in_progress' on creation
- [ ] started_at is set to current time
- [ ] Invalid quiz_type returns 400
- [ ] Invalid difficulty returns 400
- [ ] hard difficulty without time_limit returns 400
- [ ] hard difficulty with time_limit works
- [ ] easy/medium ignores time_limit_seconds
- [ ] Creating session while one is active returns 409
- [ ] Missing Authorization returns 401
