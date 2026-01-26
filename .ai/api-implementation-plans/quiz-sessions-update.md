# API Endpoint Implementation Plan: PATCH /api/quiz-sessions/:id

## 1. Endpoint Overview

Update a quiz session to mark it as completed or abandoned. When completing, the score is calculated from answers, streaks are updated, and achievements are evaluated. Returns any newly earned achievements.

## 2. Request Details

- **HTTP Method:** PATCH
- **URL Structure:** `/api/quiz-sessions/:id`
- **Path Parameters:**
  - `id` (required): UUID of the quiz session
- **Request Body:**
```json
{
  "status": "completed",
  "time_taken_seconds": 145
}
```

### Request Headers
- `Authorization: Bearer <access_token>` (required)
- `Content-Type: application/json`

## 3. Used Types

### DTOs (from `src/types.ts`)
```typescript
// Input
interface UpdateQuizSessionCommand {
  status: 'completed' | 'abandoned';
  time_taken_seconds?: number;
}

// Output
interface AchievementEarnedDTO {
  id: string;
  name: string;
  display_name: string;
}

interface UpdateQuizSessionResponseDTO {
  id: string;
  user_id: string;
  quiz_type: QuizTypeEnum;
  difficulty: DifficultyEnum;
  score: number | null;
  status: SessionStatusEnum;
  time_taken_seconds: number | null;
  started_at: string;
  completed_at: string | null;
  achievements_earned: AchievementEarnedDTO[];
}
```

### Zod Validation Schema
```typescript
export const updateQuizSessionCommandSchema = z.object({
  status: z.enum(['completed', 'abandoned']),
  time_taken_seconds: z.number().int().nonnegative().optional(),
}).refine(
  (data) => {
    if (data.status === 'completed') {
      return data.time_taken_seconds !== undefined;
    }
    return true;
  },
  { message: 'time_taken_seconds required for completion' }
);
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
  "time_taken_seconds": 145,
  "started_at": "2024-01-15T14:00:00Z",
  "completed_at": "2024-01-15T14:02:25Z",
  "achievements_earned": [
    {
      "id": "uuid",
      "name": "first_steps",
      "display_name": "First Steps"
    }
  ]
}
```

### Error Responses

| Status | Code | Message | Scenario |
|--------|------|---------|----------|
| 400 | `VALIDATION_ERROR` | Invalid status transition | Not completed/abandoned |
| 400 | `VALIDATION_ERROR` | Cannot complete session without all 10 answers | Missing answers |
| 400 | `VALIDATION_ERROR` | time_taken_seconds must be non-negative | Negative time |
| 401 | `UNAUTHORIZED` | Authentication required | Missing token |
| 403 | `FORBIDDEN` | You cannot modify this session | Not owner |
| 404 | `NOT_FOUND` | Quiz session not found | Not exists |
| 409 | `ALREADY_FINALIZED` | Session is already completed or abandoned | Not in_progress |
| 500 | `SERVER_ERROR` | Failed to update quiz session | Database error |

## 5. Data Flow

```
┌─────────┐    ┌─────────┐    ┌────────────────┐    ┌──────────┐
│ Client  │───▶│API Route│───▶│QuizSessionSvc  │───▶│ Supabase │
└─────────┘    └─────────┘    └────────────────┘    └──────────┘
                    │                │                    │
                    ▼                ▼                    ▼
             1. Auth          2. Validate         3. Count answers
             2. Validate      3. Calculate score  4. Update session
             3. Call svc      4. Update profile   5. Update profile
                              5. Check achieve.   6. Insert achievements
```

### Completion Workflow:
1. Verify authentication and ownership
2. Check session is 'in_progress'
3. If completing:
   - Count answers (must be 10)
   - Calculate score from correct answers
   - Update session with score, status, time, completed_at
   - Update profile: increment quiz counter, update streak
   - Evaluate and grant achievements
4. If abandoning:
   - Just update status
5. Return updated session with earned achievements

## 6. Security Considerations

### Authentication & Authorization
- Requires valid token
- User must own the session

### Business Rules
- Can only transition from 'in_progress'
- Completion requires exactly 10 answers
- Score cannot be manipulated (calculated server-side)

## 7. Error Handling

### Status Validation
```typescript
if (session.status !== 'in_progress') {
  return {
    error: {
      status: 409,
      body: { code: 'ALREADY_FINALIZED', message: 'Session is already completed or abandoned' }
    }
  };
}
```

### Answer Count Validation
```typescript
if (command.status === 'completed' && answerCount !== 10) {
  return {
    error: {
      status: 400,
      body: { code: 'VALIDATION_ERROR', message: 'Cannot complete session without all 10 answers' }
    }
  };
}
```

## 8. Performance Considerations

### Transaction
- Use database transaction for atomicity
- Profile update + achievement grants should be atomic

### Optimizations
- Single count query for answers
- Batch achievement evaluation

## 9. Implementation Steps

### Step 1: Add Update Schema
Update file: `src/lib/schemas/quiz-session.schemas.ts`
```typescript
export const updateQuizSessionCommandSchema = z.object({
  status: z.enum(['completed', 'abandoned'], {
    errorMap: () => ({ message: 'Invalid status transition' })
  }),
  time_taken_seconds: z
    .number()
    .int()
    .nonnegative('time_taken_seconds must be non-negative')
    .optional(),
}).refine(
  (data) => {
    if (data.status === 'completed') {
      return data.time_taken_seconds !== undefined;
    }
    return true;
  },
  { message: 'time_taken_seconds required for completion' }
);
```

### Step 2: Create Achievement Service
Create file: `src/lib/services/achievement.service.ts`
```typescript
import type { SupabaseClient } from '../../db/supabase.client';
import type { AchievementEarnedDTO, ProfileEntity, QuizTypeEnum } from '../../types';

export class AchievementService {
  constructor(private supabase: SupabaseClient) {}

  async evaluateAndGrant(
    userId: string,
    profile: ProfileEntity,
    quizType: QuizTypeEnum,
    score: number
  ): Promise<AchievementEarnedDTO[]> {
    const earned: AchievementEarnedDTO[] = [];

    // Get user's existing achievements
    const { data: existingAchievements } = await this.supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    const earnedIds = new Set(existingAchievements?.map(a => a.achievement_id) || []);

    // Get all achievements
    const { data: achievements } = await this.supabase
      .from('achievements')
      .select('*');

    if (!achievements) return earned;

    // Evaluate each achievement
    for (const achievement of achievements) {
      if (earnedIds.has(achievement.id)) continue;

      const criteria = achievement.criteria as Record<string, unknown>;
      let shouldGrant = false;

      switch (criteria.type) {
        case 'total_quizzes':
          const totalQuizzes = profile.find_note_count + profile.name_note_count +
            profile.mark_chord_count + profile.recognize_interval_count;
          shouldGrant = totalQuizzes >= (criteria.count as number);
          break;

        case 'perfect_score':
          shouldGrant = score === 10;
          break;

        case 'streak':
          shouldGrant = profile.current_streak >= (criteria.days as number);
          break;

        case 'quiz_count':
          const countField = `${criteria.quiz_type}_count` as keyof ProfileEntity;
          shouldGrant = (profile[countField] as number) >= (criteria.count as number);
          break;
      }

      if (shouldGrant) {
        // Grant achievement
        await this.supabase
          .from('user_achievements')
          .insert({ user_id: userId, achievement_id: achievement.id });

        earned.push({
          id: achievement.id,
          name: achievement.name,
          display_name: achievement.display_name,
        });
      }
    }

    return earned;
  }
}
```

### Step 3: Add Update Method to Quiz Session Service
Update file: `src/lib/services/quiz-session.service.ts`
```typescript
import { AchievementService } from './achievement.service';

export class QuizSessionService {
  // ... existing methods ...

  async updateSession(
    userId: string,
    sessionId: string,
    command: { status: 'completed' | 'abandoned'; time_taken_seconds?: number }
  ): Promise<{ data?: UpdateQuizSessionResponseDTO; error?: { status: number; body: ApiErrorDTO } }> {
    // 1. Fetch session and verify ownership
    const { data: session, error: sessionError } = await this.supabase
      .from('quiz_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return {
        error: { status: 404, body: { code: 'NOT_FOUND', message: 'Quiz session not found' } }
      };
    }

    if (session.user_id !== userId) {
      return {
        error: { status: 403, body: { code: 'FORBIDDEN', message: 'You cannot modify this session' } }
      };
    }

    if (session.status !== 'in_progress') {
      return {
        error: { status: 409, body: { code: 'ALREADY_FINALIZED', message: 'Session is already completed or abandoned' } }
      };
    }

    let achievementsEarned: AchievementEarnedDTO[] = [];
    let score: number | null = null;

    if (command.status === 'completed') {
      // 2. Count and calculate score
      const { count } = await this.supabase
        .from('quiz_answers')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId);

      if (count !== 10) {
        return {
          error: { status: 400, body: { code: 'VALIDATION_ERROR', message: 'Cannot complete session without all 10 answers' } }
        };
      }

      const { data: correctAnswers } = await this.supabase
        .from('quiz_answers')
        .select('id')
        .eq('session_id', sessionId)
        .eq('is_correct', true);

      score = correctAnswers?.length ?? 0;

      // 3. Update profile (streak + quiz count)
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        const today = new Date().toISOString().split('T')[0];
        let newStreak = profile.current_streak;
        let newLongestStreak = profile.longest_streak;

        if (profile.last_activity_date !== today) {
          const lastDate = profile.last_activity_date ? new Date(profile.last_activity_date) : null;
          const todayDate = new Date(today);

          if (lastDate) {
            const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
              newStreak = profile.current_streak + 1;
            } else if (diffDays > 1) {
              newStreak = 1;
            }
          } else {
            newStreak = 1;
          }

          if (newStreak > newLongestStreak) {
            newLongestStreak = newStreak;
          }
        }

        const quizCountField = `${session.quiz_type}_count`;
        const profileUpdate: Record<string, unknown> = {
          current_streak: newStreak,
          longest_streak: newLongestStreak,
          last_activity_date: today,
          [quizCountField]: (profile as Record<string, unknown>)[quizCountField] as number + 1,
        };

        await this.supabase.from('profiles').update(profileUpdate).eq('id', userId);

        // 4. Evaluate achievements
        const updatedProfile = { ...profile, ...profileUpdate };
        const achievementService = new AchievementService(this.supabase);
        achievementsEarned = await achievementService.evaluateAndGrant(
          userId,
          updatedProfile as ProfileEntity,
          session.quiz_type,
          score
        );
      }
    }

    // 5. Update session
    const { data: updatedSession, error: updateError } = await this.supabase
      .from('quiz_sessions')
      .update({
        status: command.status,
        score: command.status === 'completed' ? score : null,
        time_taken_seconds: command.time_taken_seconds ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select('id, user_id, quiz_type, difficulty, score, status, time_taken_seconds, started_at, completed_at')
      .single();

    if (updateError || !updatedSession) {
      return {
        error: { status: 500, body: { code: 'SERVER_ERROR', message: 'Failed to update quiz session' } }
      };
    }

    return {
      data: {
        ...updatedSession,
        achievements_earned: achievementsEarned,
      }
    };
  }
}
```

### Step 4: Add PATCH Handler
Update file: `src/pages/api/quiz-sessions/[id].ts`
```typescript
import { updateQuizSessionCommandSchema } from '../../../lib/schemas/quiz-session.schemas';

// ... existing GET handler ...

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  // 1. Verify authentication
  const authHeader = request.headers.get('Authorization');
  const authResult = await verifyAuth(locals.supabase, authHeader);

  if (authResult.error) {
    return new Response(
      JSON.stringify(authResult.error.body),
      { status: authResult.error.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const sessionId = params.id;
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

  const validation = updateQuizSessionCommandSchema.safeParse(body);
  if (!validation.success) {
    return new Response(
      JSON.stringify({ code: 'VALIDATION_ERROR', message: validation.error.issues[0].message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3. Call service
  const sessionService = new QuizSessionService(locals.supabase);
  const result = await sessionService.updateSession(authResult.userId, sessionId, validation.data);

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

### Step 5: Testing Checklist
- [ ] Complete with 10 answers returns 200
- [ ] Complete without 10 answers returns 400
- [ ] Complete without time_taken_seconds returns 400
- [ ] Abandon works without time_taken_seconds
- [ ] Score calculated correctly
- [ ] Profile quiz count incremented
- [ ] Streak updated correctly (same day, next day, gap)
- [ ] Achievements evaluated and returned
- [ ] Already completed/abandoned returns 409
- [ ] Other user's session returns 403
- [ ] Non-existent session returns 404
