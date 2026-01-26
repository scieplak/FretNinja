# API Endpoint Implementation Plan: GET /api/user/achievements

## 1. Endpoint Overview

Get the current user's earned achievements with progress toward unearned ones. Returns two lists: achievements the user has earned (with earned date) and achievements in progress (with current/target values).

## 2. Request Details

- **HTTP Method:** GET
- **URL Structure:** `/api/user/achievements`
- **Parameters:** None

### Request Headers
- `Authorization: Bearer <access_token>` (required)

## 3. Used Types

### DTOs (from `src/types.ts`)
```typescript
// Output
interface UserEarnedAchievementDTO {
  id: string;
  name: string;
  display_name: string;
  description: string;
  earned_at: string;
}

interface AchievementProgressDTO {
  id: string;
  name: string;
  display_name: string;
  description: string;
  current: number;
  target: number;
  percentage: number;
}

interface UserAchievementsDTO {
  earned: UserEarnedAchievementDTO[];
  progress: AchievementProgressDTO[];
}
```

## 4. Response Details

### Success Response (200 OK)
```json
{
  "earned": [
    {
      "id": "uuid",
      "name": "first_steps",
      "display_name": "First Steps",
      "description": "Complete your first quiz",
      "earned_at": "2024-01-10T10:00:00Z"
    }
  ],
  "progress": [
    {
      "id": "uuid",
      "name": "week_warrior",
      "display_name": "Week Warrior",
      "description": "Maintain a 7-day streak",
      "current": 5,
      "target": 7,
      "percentage": 71
    },
    {
      "id": "uuid",
      "name": "string_master",
      "display_name": "String Master",
      "description": "Complete 50 \"Find the Note\" quizzes",
      "current": 23,
      "target": 50,
      "percentage": 46
    }
  ]
}
```

### Error Responses

| Status | Code | Message | Scenario |
|--------|------|---------|----------|
| 401 | `UNAUTHORIZED` | Authentication required | Missing token |
| 500 | `SERVER_ERROR` | Failed to fetch user achievements | Database error |

## 5. Data Flow

```
┌─────────┐    ┌─────────┐    ┌─────────────────┐    ┌──────────┐
│ Client  │───▶│API Route│───▶│AchievementSvc   │───▶│ Supabase │
└─────────┘    └─────────┘    └─────────────────┘    └──────────┘
                    │                │                    │
                    ▼                ▼                    ▼
             1. Auth          2. Fetch all achiev.  3. JOINs on
             2. Call service  3. Fetch user earned     achievements,
                              4. Fetch profile         user_achievements,
                              5. Calculate progress    profiles
```

### Steps:
1. Verify authentication
2. Fetch all achievements
3. Fetch user's earned achievements (with earned_at)
4. Fetch user's profile for progress calculation
5. Calculate progress for unearned achievements
6. Return earned and progress lists

## 6. Security Considerations

### Authentication & Authorization
- Requires valid token
- RLS ensures user only sees their own data

## 7. Implementation Steps

### Step 1: Add User Achievements Method to Service
Update file: `src/lib/services/achievement.service.ts`
```typescript
import type {
  UserAchievementsDTO,
  UserEarnedAchievementDTO,
  AchievementProgressDTO,
  ProfileEntity
} from '../../types';

export class AchievementService {
  // ... existing methods ...

  async getUserAchievements(
    userId: string
  ): Promise<{ data?: UserAchievementsDTO; error?: { status: number; body: ApiErrorDTO } }> {
    // 1. Fetch all achievements
    const { data: allAchievements, error: achievementsError } = await this.supabase
      .from('achievements')
      .select('*');

    if (achievementsError || !allAchievements) {
      console.error('Failed to fetch achievements:', achievementsError?.message);
      return {
        error: { status: 500, body: { code: 'SERVER_ERROR', message: 'Failed to fetch user achievements' } }
      };
    }

    // 2. Fetch user's earned achievements
    const { data: userAchievements, error: userAchievementsError } = await this.supabase
      .from('user_achievements')
      .select('achievement_id, earned_at')
      .eq('user_id', userId);

    if (userAchievementsError) {
      console.error('Failed to fetch user achievements:', userAchievementsError.message);
      return {
        error: { status: 500, body: { code: 'SERVER_ERROR', message: 'Failed to fetch user achievements' } }
      };
    }

    // 3. Fetch user's profile for progress calculation
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Failed to fetch profile:', profileError?.message);
      return {
        error: { status: 500, body: { code: 'SERVER_ERROR', message: 'Failed to fetch user achievements' } }
      };
    }

    // 4. Build earned and progress lists
    const earnedMap = new Map(userAchievements?.map(ua => [ua.achievement_id, ua.earned_at]) || []);

    const earned: UserEarnedAchievementDTO[] = [];
    const progress: AchievementProgressDTO[] = [];

    for (const achievement of allAchievements) {
      const earnedAt = earnedMap.get(achievement.id);

      if (earnedAt) {
        earned.push({
          id: achievement.id,
          name: achievement.name,
          display_name: achievement.display_name,
          description: achievement.description,
          earned_at: earnedAt,
        });
      } else {
        // Calculate progress
        const progressData = this.calculateProgress(achievement, profile);
        progress.push({
          id: achievement.id,
          name: achievement.name,
          display_name: achievement.display_name,
          description: achievement.description,
          ...progressData,
        });
      }
    }

    // Sort earned by earned_at desc, progress by percentage desc
    earned.sort((a, b) => new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime());
    progress.sort((a, b) => b.percentage - a.percentage);

    return {
      data: { earned, progress }
    };
  }

  private calculateProgress(
    achievement: { criteria: Record<string, unknown> },
    profile: ProfileEntity
  ): { current: number; target: number; percentage: number } {
    const criteria = achievement.criteria;
    let current = 0;
    let target = 1;

    switch (criteria.type) {
      case 'total_quizzes':
        target = criteria.count as number;
        current = profile.find_note_count + profile.name_note_count +
          profile.mark_chord_count + profile.recognize_interval_count;
        break;

      case 'perfect_score':
        target = 1;
        current = 0; // Can't track partial progress for this
        break;

      case 'streak':
        target = criteria.days as number;
        current = profile.current_streak;
        break;

      case 'quiz_count':
        target = criteria.count as number;
        const quizType = criteria.quiz_type as string;
        const countField = `${quizType}_count` as keyof ProfileEntity;
        current = (profile[countField] as number) || 0;
        break;
    }

    const percentage = Math.min(100, Math.floor((current / target) * 100));

    return { current, target, percentage };
  }
}
```

### Step 2: Create API Endpoint
Create file: `src/pages/api/user/achievements.ts`
```typescript
import type { APIRoute } from 'astro';
import { AchievementService } from '../../../lib/services/achievement.service';
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
  const achievementService = new AchievementService(locals.supabase);
  const result = await achievementService.getUserAchievements(authResult.userId);

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
- [ ] Returns 200 with earned and progress arrays
- [ ] Earned achievements include earned_at
- [ ] Progress shows current/target/percentage
- [ ] percentage is capped at 100
- [ ] New user has empty earned array
- [ ] All achievements appear in either earned or progress
- [ ] Missing Authorization returns 401
