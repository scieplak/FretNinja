# API Endpoint Implementation Plan: GET /api/quiz-sessions/:id

## 1. Endpoint Overview

Get detailed information about a specific quiz session, including all submitted answers. This endpoint returns the complete session data for reviewing past quiz attempts.

## 2. Request Details

- **HTTP Method:** GET
- **URL Structure:** `/api/quiz-sessions/:id`
- **Path Parameters:**
  - `id` (required): UUID of the quiz session
- **Query Parameters:** None

### Request Headers
- `Authorization: Bearer <access_token>` (required)

## 3. Used Types

### DTOs (from `src/types.ts`)
```typescript
// Output
interface QuizAnswerSummaryDTO {
  question_number: number;
  is_correct: boolean;
  time_taken_ms: number | null;
  fret_position: number | null;
  string_number: number | null;
  target_note: NoteEnum | null;
  target_interval: IntervalEnum | null;
  target_root_note: NoteEnum | null;
  target_chord_type: ChordTypeEnum | null;
  reference_fret_position: number | null;
  reference_string_number: number | null;
  user_answer_note: NoteEnum | null;
  user_answer_interval: IntervalEnum | null;
  user_answer_positions: FretPositionDTO[] | null;
}

interface QuizSessionDetailDTO {
  id: string;
  user_id: string;
  quiz_type: QuizTypeEnum;
  difficulty: DifficultyEnum;
  score: number | null;
  status: SessionStatusEnum;
  time_limit_seconds: number | null;
  time_taken_seconds: number | null;
  started_at: string;
  completed_at: string | null;
  answers: QuizAnswerSummaryDTO[];
}
```

## 4. Response Details

### Success Response (200 OK)
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "quiz_type": "find_note",
  "difficulty": "medium",
  "score": 8,
  "status": "completed",
  "time_limit_seconds": null,
  "time_taken_seconds": 145,
  "started_at": "2024-01-15T14:00:00Z",
  "completed_at": "2024-01-15T14:02:25Z",
  "answers": [
    {
      "question_number": 1,
      "is_correct": true,
      "time_taken_ms": 3200,
      "fret_position": 3,
      "string_number": 5,
      "target_note": "C"
    }
  ]
}
```

### Error Responses

| Status | Code | Message | Scenario |
|--------|------|---------|----------|
| 401 | `UNAUTHORIZED` | Authentication required | Missing or invalid token |
| 403 | `FORBIDDEN` | You cannot access this session | Session belongs to another user |
| 404 | `NOT_FOUND` | Quiz session not found | Session doesn't exist |
| 500 | `SERVER_ERROR` | Failed to fetch quiz session | Database error |

## 5. Data Flow

```
┌─────────────┐      ┌─────────────┐      ┌────────────────┐      ┌──────────┐
│   Client    │─────▶│  API Route  │─────▶│QuizSessionSvc  │─────▶│ Supabase │
│             │      │  (Astro)    │      │                │      │    DB    │
└─────────────┘      └─────────────┘      └────────────────┘      └──────────┘
                            │                     │                    │
                            ▼                     ▼                    ▼
                     1. Verify auth        2. Fetch session      3. JOIN query
                     2. Extract ID         3. Verify ownership      session +
                     3. Call service       4. Fetch answers         answers
```

### Steps:
1. Verify authentication
2. Extract session ID from URL path
3. Fetch session with answers
4. Verify user owns the session (or rely on RLS)
5. Return session with answers array

## 6. Security Considerations

### Authentication
- Requires valid access token

### Authorization
- RLS ensures user can only access their own sessions
- Additional application-level check for 403 vs 404 distinction

### UUID Validation
- Validate session ID is valid UUID format

## 7. Error Handling

### Session Not Found vs Forbidden
```typescript
// First check if session exists at all (service role or bypass RLS)
// Then check ownership for proper error code
// Alternatively, rely on RLS and treat all failures as 404

// With RLS:
if (error?.code === 'PGRST116' || !data) {
  // Could be not found OR forbidden - RLS hides both
  return {
    error: {
      status: 404,
      body: { code: 'NOT_FOUND', message: 'Quiz session not found' }
    }
  };
}
```

## 8. Performance Considerations

### Optimizations
- Single query with JOIN for session + answers
- Answers ordered by question_number

### Indexes
- Primary key lookup for session
- Index on quiz_answers(session_id)

## 9. Implementation Steps

### Step 1: Add Get Session Method to Service
Update file: `src/lib/services/quiz-session.service.ts`
```typescript
import type { QuizSessionDetailDTO } from '../../types';

export class QuizSessionService {
  // ... existing methods ...

  async getSession(
    userId: string,
    sessionId: string
  ): Promise<{ data?: QuizSessionDetailDTO; error?: { status: number; body: ApiErrorDTO } }> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return {
        error: {
          status: 404,
          body: { code: 'NOT_FOUND', message: 'Quiz session not found' }
        }
      };
    }

    // Fetch session with answers
    const { data: session, error: sessionError } = await this.supabase
      .from('quiz_sessions')
      .select(`
        id,
        user_id,
        quiz_type,
        difficulty,
        score,
        status,
        time_limit_seconds,
        time_taken_seconds,
        started_at,
        completed_at
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      // RLS will block if user doesn't own session, returning same error as not found
      return {
        error: {
          status: 404,
          body: { code: 'NOT_FOUND', message: 'Quiz session not found' }
        }
      };
    }

    // Check ownership (for proper 403 response)
    if (session.user_id !== userId) {
      return {
        error: {
          status: 403,
          body: { code: 'FORBIDDEN', message: 'You cannot access this session' }
        }
      };
    }

    // Fetch answers
    const { data: answers, error: answersError } = await this.supabase
      .from('quiz_answers')
      .select(`
        question_number,
        is_correct,
        time_taken_ms,
        fret_position,
        string_number,
        target_note,
        target_interval,
        target_root_note,
        target_chord_type,
        reference_fret_position,
        reference_string_number,
        user_answer_note,
        user_answer_interval,
        user_answer_positions
      `)
      .eq('session_id', sessionId)
      .order('question_number', { ascending: true });

    if (answersError) {
      console.error('Failed to fetch answers:', answersError.message);
      return {
        error: {
          status: 500,
          body: { code: 'SERVER_ERROR', message: 'Failed to fetch quiz session' }
        }
      };
    }

    return {
      data: {
        ...session,
        answers: answers || []
      }
    };
  }
}
```

### Step 2: Create API Endpoint for Session Detail
Create file: `src/pages/api/quiz-sessions/[id].ts`
```typescript
import type { APIRoute } from 'astro';
import { QuizSessionService } from '../../../lib/services/quiz-session.service';
import { verifyAuth } from '../../../lib/helpers/auth.helper';

export const prerender = false;

export const GET: APIRoute = async ({ params, request, locals }) => {
  // 1. Verify authentication
  const authHeader = request.headers.get('Authorization');
  const authResult = await verifyAuth(locals.supabase, authHeader);

  if (authResult.error) {
    return new Response(
      JSON.stringify(authResult.error.body),
      { status: authResult.error.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. Get session ID from path
  const sessionId = params.id;
  if (!sessionId) {
    return new Response(
      JSON.stringify({ code: 'NOT_FOUND', message: 'Quiz session not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3. Call service
  const sessionService = new QuizSessionService(locals.supabase);
  const result = await sessionService.getSession(authResult.userId, sessionId);

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

### Step 3: Testing Checklist
- [ ] Valid session ID returns 200 with full data
- [ ] answers array is included and ordered
- [ ] Non-existent session ID returns 404
- [ ] Invalid UUID format returns 404
- [ ] Other user's session returns 403 (or 404 with RLS)
- [ ] Session with no answers returns empty array
- [ ] All answer fields are present for different quiz types
- [ ] Missing Authorization returns 401
