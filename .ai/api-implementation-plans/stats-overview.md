# API Endpoint Implementation Plan: GET /api/stats/overview

## 1. Endpoint Overview

Get the user's overall statistics and learning progress. Returns comprehensive stats including totals, breakdowns by quiz type and difficulty, and recent trend analysis.

## 2. Request Details

- **HTTP Method:** GET
- **URL Structure:** `/api/stats/overview`
- **Parameters:** None

### Request Headers
- `Authorization: Bearer <access_token>` (required)

## 3. Used Types

### DTOs (from `src/types.ts`)
```typescript
interface QuizTypeStatsDTO {
  count: number;
  average_score: number;
  best_score: number;
  total_time_seconds: number;
}

interface DifficultyStatsDTO {
  count: number;
  average_score: number;
}

interface TrendPeriodDTO {
  quizzes: number;
  average_score: number;
}

interface RecentTrendDTO {
  last_7_days: TrendPeriodDTO;
  previous_7_days: TrendPeriodDTO;
  improvement: number;
}

interface StatsOverviewDTO {
  total_quizzes: number;
  total_time_seconds: number;
  current_streak: number;
  longest_streak: number;
  by_quiz_type: {
    find_note: QuizTypeStatsDTO;
    name_note: QuizTypeStatsDTO;
    mark_chord: QuizTypeStatsDTO;
    recognize_interval: QuizTypeStatsDTO;
  };
  by_difficulty: {
    easy: DifficultyStatsDTO;
    medium: DifficultyStatsDTO;
    hard: DifficultyStatsDTO;
  };
  recent_trend: RecentTrendDTO;
}
```

## 4. Response Details

### Success Response (200 OK)
```json
{
  "total_quizzes": 61,
  "total_time_seconds": 8940,
  "current_streak": 5,
  "longest_streak": 14,
  "by_quiz_type": {
    "find_note": {
      "count": 23,
      "average_score": 7.8,
      "best_score": 10,
      "total_time_seconds": 3400
    },
    "name_note": {
      "count": 18,
      "average_score": 8.2,
      "best_score": 10,
      "total_time_seconds": 2200
    },
    "mark_chord": {
      "count": 12,
      "average_score": 6.5,
      "best_score": 9,
      "total_time_seconds": 2100
    },
    "recognize_interval": {
      "count": 8,
      "average_score": 7.1,
      "best_score": 9,
      "total_time_seconds": 1240
    }
  },
  "by_difficulty": {
    "easy": {
      "count": 15,
      "average_score": 8.9
    },
    "medium": {
      "count": 30,
      "average_score": 7.5
    },
    "hard": {
      "count": 16,
      "average_score": 6.2
    }
  },
  "recent_trend": {
    "last_7_days": {
      "quizzes": 12,
      "average_score": 8.1
    },
    "previous_7_days": {
      "quizzes": 8,
      "average_score": 7.2
    },
    "improvement": 12.5
  }
}
```

### Error Responses

| Status | Code | Message | Scenario |
|--------|------|---------|----------|
| 401 | `UNAUTHORIZED` | Authentication required | Missing token |
| 500 | `SERVER_ERROR` | Failed to fetch statistics | Database error |

## 5. Data Flow

```
┌─────────┐    ┌─────────┐    ┌────────────────┐    ┌──────────┐
│ Client  │───▶│API Route│───▶│  StatsService  │───▶│ Supabase │
└─────────┘    └─────────┘    └────────────────┘    └──────────┘
                    │                │                    │
                    ▼                ▼                    ▼
             1. Auth          2. Fetch profile      3. Multiple
             2. Call svc      3. Aggregate by type     queries for
                              4. Aggregate by diff     aggregations
                              5. Calculate trends
```

### Queries Needed:
1. Profile (for streaks)
2. Sessions grouped by quiz_type (completed only)
3. Sessions grouped by difficulty (completed only)
4. Sessions from last 7 days
5. Sessions from previous 7 days

## 6. Security Considerations

### Authentication & Authorization
- Requires valid token
- All queries filtered by user_id
- RLS ensures data isolation

## 7. Implementation Steps

### Step 1: Add Overview Method to Stats Service
Update file: `src/lib/services/stats.service.ts`
```typescript
import type { StatsOverviewDTO, QuizTypeStatsDTO, DifficultyStatsDTO } from '../../types';

export class StatsService {
  // ... existing heatmap method ...

  async getOverview(
    userId: string
  ): Promise<{ data?: StatsOverviewDTO; error?: { status: number; body: ApiErrorDTO } }> {
    // 1. Fetch profile for streaks
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('current_streak, longest_streak, find_note_count, name_note_count, mark_chord_count, recognize_interval_count')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Failed to fetch profile:', profileError?.message);
      return {
        error: { status: 500, body: { code: 'SERVER_ERROR', message: 'Failed to fetch statistics' } }
      };
    }

    // 2. Fetch all completed sessions for aggregation
    const { data: sessions, error: sessionsError } = await this.supabase
      .from('quiz_sessions')
      .select('quiz_type, difficulty, score, time_taken_seconds, completed_at')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (sessionsError) {
      console.error('Failed to fetch sessions:', sessionsError.message);
      return {
        error: { status: 500, body: { code: 'SERVER_ERROR', message: 'Failed to fetch statistics' } }
      };
    }

    const completedSessions = sessions || [];

    // 3. Calculate totals
    const totalQuizzes = completedSessions.length;
    const totalTimeSeconds = completedSessions.reduce((sum, s) => sum + (s.time_taken_seconds || 0), 0);

    // 4. Aggregate by quiz type
    const byQuizType = this.aggregateByQuizType(completedSessions);

    // 5. Aggregate by difficulty
    const byDifficulty = this.aggregateByDifficulty(completedSessions);

    // 6. Calculate recent trend
    const recentTrend = this.calculateRecentTrend(completedSessions);

    return {
      data: {
        total_quizzes: totalQuizzes,
        total_time_seconds: totalTimeSeconds,
        current_streak: profile.current_streak,
        longest_streak: profile.longest_streak,
        by_quiz_type: byQuizType,
        by_difficulty: byDifficulty,
        recent_trend: recentTrend,
      }
    };
  }

  private aggregateByQuizType(
    sessions: Array<{ quiz_type: string; score: number | null; time_taken_seconds: number | null }>
  ): StatsOverviewDTO['by_quiz_type'] {
    const types = ['find_note', 'name_note', 'mark_chord', 'recognize_interval'] as const;
    const result: Record<string, QuizTypeStatsDTO> = {};

    for (const type of types) {
      const typeSessions = sessions.filter(s => s.quiz_type === type);
      const scores = typeSessions.map(s => s.score).filter((s): s is number => s !== null);

      result[type] = {
        count: typeSessions.length,
        average_score: scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0,
        best_score: scores.length > 0 ? Math.max(...scores) : 0,
        total_time_seconds: typeSessions.reduce((sum, s) => sum + (s.time_taken_seconds || 0), 0),
      };
    }

    return result as StatsOverviewDTO['by_quiz_type'];
  }

  private aggregateByDifficulty(
    sessions: Array<{ difficulty: string; score: number | null }>
  ): StatsOverviewDTO['by_difficulty'] {
    const difficulties = ['easy', 'medium', 'hard'] as const;
    const result: Record<string, DifficultyStatsDTO> = {};

    for (const diff of difficulties) {
      const diffSessions = sessions.filter(s => s.difficulty === diff);
      const scores = diffSessions.map(s => s.score).filter((s): s is number => s !== null);

      result[diff] = {
        count: diffSessions.length,
        average_score: scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0,
      };
    }

    return result as StatsOverviewDTO['by_difficulty'];
  }

  private calculateRecentTrend(
    sessions: Array<{ score: number | null; completed_at: string | null }>
  ): StatsOverviewDTO['recent_trend'] {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const last7Days = sessions.filter(s => {
      if (!s.completed_at) return false;
      const date = new Date(s.completed_at);
      return date >= sevenDaysAgo && date <= now;
    });

    const previous7Days = sessions.filter(s => {
      if (!s.completed_at) return false;
      const date = new Date(s.completed_at);
      return date >= fourteenDaysAgo && date < sevenDaysAgo;
    });

    const last7Scores = last7Days.map(s => s.score).filter((s): s is number => s !== null);
    const prev7Scores = previous7Days.map(s => s.score).filter((s): s is number => s !== null);

    const last7Avg = last7Scores.length > 0
      ? Math.round((last7Scores.reduce((a, b) => a + b, 0) / last7Scores.length) * 10) / 10
      : 0;

    const prev7Avg = prev7Scores.length > 0
      ? Math.round((prev7Scores.reduce((a, b) => a + b, 0) / prev7Scores.length) * 10) / 10
      : 0;

    let improvement = 0;
    if (prev7Avg > 0) {
      improvement = Math.round(((last7Avg - prev7Avg) / prev7Avg) * 100 * 10) / 10;
    } else if (last7Avg > 0) {
      improvement = 100;
    }

    return {
      last_7_days: {
        quizzes: last7Days.length,
        average_score: last7Avg,
      },
      previous_7_days: {
        quizzes: previous7Days.length,
        average_score: prev7Avg,
      },
      improvement,
    };
  }
}
```

### Step 2: Create API Endpoint
Create file: `src/pages/api/stats/overview.ts`
```typescript
import type { APIRoute } from 'astro';
import { StatsService } from '../../../lib/services/stats.service';
import { verifyAuth } from '../../../lib/helpers/auth.helper';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  // 1. Verify authentication
  const authHeader = request.headers.get('Authorization');
  const authResult = await verifyAuth(locals.supabase, authHeader);

  if (authResult.error) {
    return new Response(
      JSON.stringify(authResult.error.body),
      { status: authResult.error.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. Call service
  const statsService = new StatsService(locals.supabase);
  const result = await statsService.getOverview(authResult.userId);

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
- [ ] Returns 200 with complete stats structure
- [ ] total_quizzes matches count of completed sessions
- [ ] Streak values match profile
- [ ] by_quiz_type has all four types
- [ ] by_difficulty has all three levels
- [ ] average_score rounded to 1 decimal
- [ ] best_score is max of scores
- [ ] recent_trend calculates correctly
- [ ] improvement percentage calculated correctly
- [ ] New user returns zeros for stats
- [ ] Missing Authorization returns 401
