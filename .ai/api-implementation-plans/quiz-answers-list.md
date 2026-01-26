# API Endpoint Implementation Plan: GET /api/quiz-sessions/:sessionId/answers

## 1. Endpoint Overview

Get all answers for a specific quiz session. Returns a list of all submitted answers ordered by question number. Useful for reviewing quiz results.

## 2. Request Details

- **HTTP Method:** GET
- **URL Structure:** `/api/quiz-sessions/:sessionId/answers`
- **Path Parameters:**
  - `sessionId` (required): UUID of the quiz session
- **Query Parameters:** None

### Request Headers
- `Authorization: Bearer <access_token>` (required)

## 3. Used Types

### DTOs (from `src/types.ts`)
```typescript
// Output
interface QuizAnswerDTO {
  id: string;
  session_id: string;
  question_number: number;
  is_correct: boolean;
  time_taken_ms: number | null;
  fret_position: number | null;
  string_number: number | null;
  target_note: NoteEnum | null;
  user_answer_note: NoteEnum | null;
  target_root_note: NoteEnum | null;
  target_chord_type: ChordTypeEnum | null;
  user_answer_positions: FretPositionDTO[] | null;
  target_interval: IntervalEnum | null;
  reference_fret_position: number | null;
  reference_string_number: number | null;
  user_answer_interval: IntervalEnum | null;
  created_at: string;
}

interface QuizAnswersListDTO {
  session_id: string;
  answers: QuizAnswerDTO[];
}
```

## 4. Response Details

### Success Response (200 OK)
```json
{
  "session_id": "uuid",
  "answers": [
    {
      "id": "uuid",
      "question_number": 1,
      "is_correct": true,
      "time_taken_ms": 3200,
      "fret_position": 3,
      "string_number": 5,
      "target_note": "C",
      "user_answer_note": null,
      "target_root_note": null,
      "target_chord_type": null,
      "user_answer_positions": null,
      "target_interval": null,
      "reference_fret_position": null,
      "reference_string_number": null,
      "user_answer_interval": null,
      "created_at": "2024-01-15T14:00:03Z"
    }
  ]
}
```

### Error Responses

| Status | Code | Message | Scenario |
|--------|------|---------|----------|
| 401 | `UNAUTHORIZED` | Authentication required | Missing token |
| 403 | `FORBIDDEN` | You cannot access this session | Not owner |
| 404 | `NOT_FOUND` | Quiz session not found | Session doesn't exist |
| 500 | `SERVER_ERROR` | Failed to fetch answers | Database error |

## 5. Data Flow

```
┌─────────┐    ┌─────────┐    ┌────────────────┐    ┌──────────┐
│ Client  │───▶│API Route│───▶│QuizAnswerSvc   │───▶│ Supabase │
└─────────┘    └─────────┘    └────────────────┘    └──────────┘
                    │                │                    │
                    ▼                ▼                    ▼
             1. Auth          2. Verify session    3. SELECT answers
             2. Call svc      3. Fetch answers        ORDER BY
                              4. Return list          question_number
```

## 6. Security Considerations

### Authentication & Authorization
- Requires valid token
- User must own the session
- RLS ensures data access control

## 7. Implementation Steps

### Step 1: Add List Method to Quiz Answer Service
Update file: `src/lib/services/quiz-answer.service.ts`
```typescript
import type { QuizAnswersListDTO, QuizAnswerDTO } from '../../types';

export class QuizAnswerService {
  // ... existing createAnswer method ...

  async listAnswers(
    userId: string,
    sessionId: string
  ): Promise<{ data?: QuizAnswersListDTO; error?: { status: number; body: ApiErrorDTO } }> {
    // 1. Verify session exists and user owns it
    const { data: session, error: sessionError } = await this.supabase
      .from('quiz_sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return {
        error: { status: 404, body: { code: 'NOT_FOUND', message: 'Quiz session not found' } }
      };
    }

    if (session.user_id !== userId) {
      return {
        error: { status: 403, body: { code: 'FORBIDDEN', message: 'You cannot access this session' } }
      };
    }

    // 2. Fetch all answers
    const { data: answers, error: answersError } = await this.supabase
      .from('quiz_answers')
      .select(`
        id,
        session_id,
        question_number,
        is_correct,
        time_taken_ms,
        fret_position,
        string_number,
        target_note,
        user_answer_note,
        target_root_note,
        target_chord_type,
        user_answer_positions,
        target_interval,
        reference_fret_position,
        reference_string_number,
        user_answer_interval,
        created_at
      `)
      .eq('session_id', sessionId)
      .order('question_number', { ascending: true });

    if (answersError) {
      console.error('Failed to fetch answers:', answersError.message);
      return {
        error: { status: 500, body: { code: 'SERVER_ERROR', message: 'Failed to fetch answers' } }
      };
    }

    return {
      data: {
        session_id: sessionId,
        answers: (answers || []) as QuizAnswerDTO[],
      }
    };
  }
}
```

### Step 2: Add GET Handler to Endpoint
Update file: `src/pages/api/quiz-sessions/[sessionId]/answers/index.ts`
```typescript
// ... existing POST handler ...

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

  const sessionId = params.sessionId;
  if (!sessionId) {
    return new Response(
      JSON.stringify({ code: 'NOT_FOUND', message: 'Quiz session not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. Call service
  const answerService = new QuizAnswerService(locals.supabase);
  const result = await answerService.listAnswers(authResult.userId, sessionId);

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
- [ ] Valid session returns 200 with answers
- [ ] Answers ordered by question_number
- [ ] Empty session returns empty answers array
- [ ] All answer fields present
- [ ] Non-existent session returns 404
- [ ] Other user's session returns 403
- [ ] Missing Authorization returns 401
