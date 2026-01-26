# API Endpoint Implementation Plan: POST /api/quiz-sessions/:sessionId/answers

## 1. Endpoint Overview

Submit an answer for a quiz question. Stores the answer data including correctness, timing, and position information. Each question (1-10) can only be answered once per session.

## 2. Request Details

- **HTTP Method:** POST
- **URL Structure:** `/api/quiz-sessions/:sessionId/answers`
- **Path Parameters:**
  - `sessionId` (required): UUID of the quiz session

### Request Body Examples

**Find the Note:**
```json
{
  "question_number": 1,
  "is_correct": true,
  "time_taken_ms": 3200,
  "fret_position": 3,
  "string_number": 5,
  "target_note": "C"
}
```

**Name the Note:**
```json
{
  "question_number": 2,
  "is_correct": false,
  "time_taken_ms": 4500,
  "fret_position": 5,
  "string_number": 2,
  "target_note": "E",
  "user_answer_note": "F"
}
```

**Mark the Chord:**
```json
{
  "question_number": 3,
  "is_correct": true,
  "time_taken_ms": 8200,
  "target_root_note": "C",
  "target_chord_type": "major",
  "user_answer_positions": [
    {"fret": 3, "string": 5},
    {"fret": 2, "string": 4},
    {"fret": 0, "string": 3}
  ]
}
```

**Recognize the Interval:**
```json
{
  "question_number": 4,
  "is_correct": true,
  "time_taken_ms": 2800,
  "fret_position": 7,
  "string_number": 3,
  "reference_fret_position": 5,
  "reference_string_number": 3,
  "target_interval": "minor_3rd",
  "user_answer_interval": "minor_3rd"
}
```

### Request Headers
- `Authorization: Bearer <access_token>` (required)
- `Content-Type: application/json`

## 3. Used Types

### DTOs (from `src/types.ts`)
```typescript
// Input
interface CreateQuizAnswerCommand {
  question_number: number;
  is_correct: boolean;
  time_taken_ms?: number | null;
  fret_position?: number | null;
  string_number?: number | null;
  target_note?: NoteEnum | null;
  user_answer_note?: NoteEnum | null;
  target_root_note?: NoteEnum | null;
  target_chord_type?: ChordTypeEnum | null;
  user_answer_positions?: FretPositionDTO[] | null;
  target_interval?: IntervalEnum | null;
  reference_fret_position?: number | null;
  reference_string_number?: number | null;
  user_answer_interval?: IntervalEnum | null;
}

// Output
interface CreateQuizAnswerResponseDTO {
  id: string;
  session_id: string;
  question_number: number;
  is_correct: boolean;
  created_at: string;
}
```

### Zod Validation Schema
```typescript
const noteEnum = z.enum(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']);
const chordTypeEnum = z.enum(['major', 'minor', 'diminished', 'augmented']);
const intervalEnum = z.enum([
  'minor_2nd', 'major_2nd', 'minor_3rd', 'major_3rd',
  'perfect_4th', 'tritone', 'perfect_5th', 'minor_6th',
  'major_6th', 'minor_7th', 'major_7th', 'octave'
]);

export const createQuizAnswerCommandSchema = z.object({
  question_number: z.number().int().min(1).max(10),
  is_correct: z.boolean(),
  time_taken_ms: z.number().int().nonnegative().nullable().optional(),
  fret_position: z.number().int().min(0).max(24).nullable().optional(),
  string_number: z.number().int().min(1).max(6).nullable().optional(),
  target_note: noteEnum.nullable().optional(),
  user_answer_note: noteEnum.nullable().optional(),
  target_root_note: noteEnum.nullable().optional(),
  target_chord_type: chordTypeEnum.nullable().optional(),
  user_answer_positions: z.array(z.object({
    fret: z.number().int().min(0).max(24),
    string: z.number().int().min(1).max(6),
  })).nullable().optional(),
  target_interval: intervalEnum.nullable().optional(),
  reference_fret_position: z.number().int().min(0).max(24).nullable().optional(),
  reference_string_number: z.number().int().min(1).max(6).nullable().optional(),
  user_answer_interval: intervalEnum.nullable().optional(),
});
```

## 4. Response Details

### Success Response (201 Created)
```json
{
  "id": "uuid",
  "session_id": "uuid",
  "question_number": 1,
  "is_correct": true,
  "created_at": "2024-01-15T14:00:03Z"
}
```

### Error Responses

| Status | Code | Message | Scenario |
|--------|------|---------|----------|
| 400 | `VALIDATION_ERROR` | question_number must be between 1 and 10 | Invalid question number |
| 400 | `VALIDATION_ERROR` | Answer for this question already submitted | Duplicate answer |
| 400 | `VALIDATION_ERROR` | fret_position must be between 0 and 24 | Invalid fret |
| 400 | `VALIDATION_ERROR` | string_number must be between 1 and 6 | Invalid string |
| 400 | `VALIDATION_ERROR` | Invalid note value | Bad note enum |
| 400 | `VALIDATION_ERROR` | Invalid chord_type value | Bad chord type |
| 400 | `VALIDATION_ERROR` | Invalid interval value | Bad interval |
| 401 | `UNAUTHORIZED` | Authentication required | Missing token |
| 403 | `FORBIDDEN` | You cannot add answers to this session | Not owner |
| 404 | `NOT_FOUND` | Quiz session not found | Session doesn't exist |
| 409 | `SESSION_NOT_ACTIVE` | Quiz session is not in progress | Session finalized |
| 500 | `SERVER_ERROR` | Failed to submit answer | Database error |

## 5. Data Flow

```
┌─────────┐    ┌─────────┐    ┌────────────────┐    ┌──────────┐
│ Client  │───▶│API Route│───▶│QuizAnswerSvc   │───▶│ Supabase │
└─────────┘    └─────────┘    └────────────────┘    └──────────┘
                    │                │                    │
                    ▼                ▼                    ▼
             1. Auth          2. Verify session    3. Check duplicate
             2. Validate      3. Check duplicate   4. INSERT answer
             3. Call svc      4. Insert answer
```

### Steps:
1. Verify authentication
2. Validate request body
3. Verify session exists and user owns it
4. Verify session is 'in_progress'
5. Check no existing answer for this question_number
6. Insert answer
7. Return created answer summary

## 6. Security Considerations

### Authentication & Authorization
- Requires valid token
- User must own the session
- RLS on quiz_answers checks session ownership

### Data Validation
- Strict validation of all enum values
- Fret/string ranges enforced
- Question number 1-10 only

## 7. Error Handling

### Duplicate Answer Check
```typescript
const { data: existingAnswer } = await this.supabase
  .from('quiz_answers')
  .select('id')
  .eq('session_id', sessionId)
  .eq('question_number', command.question_number)
  .maybeSingle();

if (existingAnswer) {
  return {
    error: {
      status: 400,
      body: { code: 'VALIDATION_ERROR', message: 'Answer for this question already submitted' }
    }
  };
}
```

### Session Status Check
```typescript
if (session.status !== 'in_progress') {
  return {
    error: {
      status: 409,
      body: { code: 'SESSION_NOT_ACTIVE', message: 'Quiz session is not in progress' }
    }
  };
}
```

## 8. Performance Considerations

### Optimizations
- Index on (session_id, question_number) for duplicate check
- Single insert operation

## 9. Implementation Steps

### Step 1: Create Quiz Answer Schemas
Create file: `src/lib/schemas/quiz-answer.schemas.ts`
```typescript
import { z } from 'zod';

const noteEnum = z.enum(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'], {
  errorMap: () => ({ message: 'Invalid note value' })
});

const chordTypeEnum = z.enum(['major', 'minor', 'diminished', 'augmented'], {
  errorMap: () => ({ message: 'Invalid chord_type value' })
});

const intervalEnum = z.enum([
  'minor_2nd', 'major_2nd', 'minor_3rd', 'major_3rd',
  'perfect_4th', 'tritone', 'perfect_5th', 'minor_6th',
  'major_6th', 'minor_7th', 'major_7th', 'octave'
], {
  errorMap: () => ({ message: 'Invalid interval value' })
});

const fretPositionSchema = z.object({
  fret: z.number().int().min(0, 'fret_position must be between 0 and 24').max(24, 'fret_position must be between 0 and 24'),
  string: z.number().int().min(1, 'string_number must be between 1 and 6').max(6, 'string_number must be between 1 and 6'),
});

export const createQuizAnswerCommandSchema = z.object({
  question_number: z.number().int().min(1, 'question_number must be between 1 and 10').max(10, 'question_number must be between 1 and 10'),
  is_correct: z.boolean(),
  time_taken_ms: z.number().int().nonnegative().nullable().optional(),
  fret_position: z.number().int().min(0, 'fret_position must be between 0 and 24').max(24, 'fret_position must be between 0 and 24').nullable().optional(),
  string_number: z.number().int().min(1, 'string_number must be between 1 and 6').max(6, 'string_number must be between 1 and 6').nullable().optional(),
  target_note: noteEnum.nullable().optional(),
  user_answer_note: noteEnum.nullable().optional(),
  target_root_note: noteEnum.nullable().optional(),
  target_chord_type: chordTypeEnum.nullable().optional(),
  user_answer_positions: z.array(fretPositionSchema).nullable().optional(),
  target_interval: intervalEnum.nullable().optional(),
  reference_fret_position: z.number().int().min(0).max(24).nullable().optional(),
  reference_string_number: z.number().int().min(1).max(6).nullable().optional(),
  user_answer_interval: intervalEnum.nullable().optional(),
});

export type CreateQuizAnswerCommandInput = z.infer<typeof createQuizAnswerCommandSchema>;
```

### Step 2: Create Quiz Answer Service
Create file: `src/lib/services/quiz-answer.service.ts`
```typescript
import type { SupabaseClient } from '../../db/supabase.client';
import type { CreateQuizAnswerCommand, CreateQuizAnswerResponseDTO, ApiErrorDTO } from '../../types';

export class QuizAnswerService {
  constructor(private supabase: SupabaseClient) {}

  async createAnswer(
    userId: string,
    sessionId: string,
    command: CreateQuizAnswerCommand
  ): Promise<{ data?: CreateQuizAnswerResponseDTO; error?: { status: number; body: ApiErrorDTO } }> {
    // 1. Verify session exists and user owns it
    const { data: session, error: sessionError } = await this.supabase
      .from('quiz_sessions')
      .select('id, user_id, status')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return {
        error: { status: 404, body: { code: 'NOT_FOUND', message: 'Quiz session not found' } }
      };
    }

    if (session.user_id !== userId) {
      return {
        error: { status: 403, body: { code: 'FORBIDDEN', message: 'You cannot add answers to this session' } }
      };
    }

    if (session.status !== 'in_progress') {
      return {
        error: { status: 409, body: { code: 'SESSION_NOT_ACTIVE', message: 'Quiz session is not in progress' } }
      };
    }

    // 2. Check for duplicate answer
    const { data: existingAnswer } = await this.supabase
      .from('quiz_answers')
      .select('id')
      .eq('session_id', sessionId)
      .eq('question_number', command.question_number)
      .maybeSingle();

    if (existingAnswer) {
      return {
        error: { status: 400, body: { code: 'VALIDATION_ERROR', message: 'Answer for this question already submitted' } }
      };
    }

    // 3. Insert answer
    const { data, error } = await this.supabase
      .from('quiz_answers')
      .insert({
        session_id: sessionId,
        question_number: command.question_number,
        is_correct: command.is_correct,
        time_taken_ms: command.time_taken_ms ?? null,
        fret_position: command.fret_position ?? null,
        string_number: command.string_number ?? null,
        target_note: command.target_note ?? null,
        user_answer_note: command.user_answer_note ?? null,
        target_root_note: command.target_root_note ?? null,
        target_chord_type: command.target_chord_type ?? null,
        user_answer_positions: command.user_answer_positions ?? null,
        target_interval: command.target_interval ?? null,
        reference_fret_position: command.reference_fret_position ?? null,
        reference_string_number: command.reference_string_number ?? null,
        user_answer_interval: command.user_answer_interval ?? null,
      })
      .select('id, session_id, question_number, is_correct, created_at')
      .single();

    if (error || !data) {
      console.error('Failed to create answer:', error?.message);
      return {
        error: { status: 500, body: { code: 'SERVER_ERROR', message: 'Failed to submit answer' } }
      };
    }

    return { data };
  }
}
```

### Step 3: Create API Endpoint
Create file: `src/pages/api/quiz-sessions/[sessionId]/answers/index.ts`
```typescript
import type { APIRoute } from 'astro';
import { QuizAnswerService } from '../../../../../lib/services/quiz-answer.service';
import { createQuizAnswerCommandSchema } from '../../../../../lib/schemas/quiz-answer.schemas';
import { verifyAuth } from '../../../../../lib/helpers/auth.helper';

export const prerender = false;

export const POST: APIRoute = async ({ params, request, locals }) => {
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

  // 2. Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ code: 'VALIDATION_ERROR', message: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const validation = createQuizAnswerCommandSchema.safeParse(body);
  if (!validation.success) {
    return new Response(
      JSON.stringify({ code: 'VALIDATION_ERROR', message: validation.error.issues[0].message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3. Call service
  const answerService = new QuizAnswerService(locals.supabase);
  const result = await answerService.createAnswer(authResult.userId, sessionId, validation.data);

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
- [ ] Valid answer creates with 201
- [ ] question_number < 1 returns 400
- [ ] question_number > 10 returns 400
- [ ] Duplicate question_number returns 400
- [ ] Invalid note enum returns 400
- [ ] Invalid chord_type returns 400
- [ ] Invalid interval returns 400
- [ ] fret_position > 24 returns 400
- [ ] string_number > 6 returns 400
- [ ] Non-existent session returns 404
- [ ] Other user's session returns 403
- [ ] Completed session returns 409
- [ ] Abandoned session returns 409
