import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../db/database.types';
import type {
  AchievementDTO,
  AchievementsListDTO,
  AchievementEarnedDTO,
  UserAchievementsDTO,
  UserEarnedAchievementDTO,
  AchievementProgressDTO,
  ProfileEntity,
  QuizTypeEnum,
  ApiErrorDTO,
} from '../../types';

type SupabaseClientType = SupabaseClient<Database>;

interface ServiceResult<T> {
  data?: T;
  error?: { status: number; body: ApiErrorDTO };
}

export class AchievementService {
  constructor(private supabase: SupabaseClientType) {}

  async listAchievements(): Promise<ServiceResult<AchievementsListDTO>> {
    const { data, error } = await this.supabase
      .from('achievements')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch achievements:', error.message);
      return {
        error: {
          status: 500,
          body: { code: 'SERVER_ERROR', message: 'Failed to fetch achievements' },
        },
      };
    }

    return {
      data: {
        data: (data || []) as AchievementDTO[],
      },
    };
  }

  async getUserAchievements(userId: string): Promise<ServiceResult<UserAchievementsDTO>> {
    // Fetch all achievements
    const { data: allAchievements, error: achievementsError } = await this.supabase
      .from('achievements')
      .select('*');

    if (achievementsError || !allAchievements) {
      console.error('Failed to fetch achievements:', achievementsError?.message);
      return {
        error: { status: 500, body: { code: 'SERVER_ERROR', message: 'Failed to fetch user achievements' } },
      };
    }

    // Fetch user's earned achievements
    const { data: userAchievements, error: userAchievementsError } = await this.supabase
      .from('user_achievements')
      .select('achievement_id, earned_at')
      .eq('user_id', userId);

    if (userAchievementsError) {
      console.error('Failed to fetch user achievements:', userAchievementsError.message);
      return {
        error: { status: 500, body: { code: 'SERVER_ERROR', message: 'Failed to fetch user achievements' } },
      };
    }

    // Fetch user's profile for progress calculation
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Failed to fetch profile:', profileError?.message);
      return {
        error: { status: 500, body: { code: 'SERVER_ERROR', message: 'Failed to fetch user achievements' } },
      };
    }

    // Build earned and progress lists
    const earnedMap = new Map(userAchievements?.map((ua) => [ua.achievement_id, ua.earned_at]) || []);

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
        const progressData = this.calculateProgress(achievement.criteria as Record<string, unknown>, profile);
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
      data: { earned, progress },
    };
  }

  private calculateProgress(
    criteria: Record<string, unknown>,
    profile: ProfileEntity
  ): { current: number; target: number; percentage: number } {
    let current = 0;
    let target = 1;

    switch (criteria.type) {
      case 'total_quizzes':
        target = criteria.count as number;
        current =
          profile.find_note_count + profile.name_note_count + profile.mark_chord_count + profile.recognize_interval_count;
        break;

      case 'perfect_score':
        target = 1;
        current = 0;
        break;

      case 'streak':
        target = criteria.days as number;
        current = profile.current_streak;
        break;

      case 'quiz_count': {
        target = criteria.count as number;
        const quizType = criteria.quiz_type as string;
        const countField = `${quizType}_count` as keyof ProfileEntity;
        current = (profile[countField] as number) || 0;
        break;
      }
    }

    const percentage = Math.min(100, Math.floor((current / target) * 100));

    return { current, target, percentage };
  }

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

    const earnedIds = new Set(existingAchievements?.map((a) => a.achievement_id) || []);

    // Get all achievements
    const { data: achievements } = await this.supabase.from('achievements').select('*');

    if (!achievements) return earned;

    // Evaluate each achievement
    for (const achievement of achievements) {
      if (earnedIds.has(achievement.id)) continue;

      const criteria = achievement.criteria as Record<string, unknown>;
      let shouldGrant = false;

      switch (criteria.type) {
        case 'total_quizzes': {
          const totalQuizzes =
            profile.find_note_count + profile.name_note_count + profile.mark_chord_count + profile.recognize_interval_count;
          shouldGrant = totalQuizzes >= (criteria.count as number);
          break;
        }

        case 'perfect_score':
          shouldGrant = score === 10;
          break;

        case 'streak':
          shouldGrant = profile.current_streak >= (criteria.days as number);
          break;

        case 'quiz_count': {
          const countField = `${criteria.quiz_type}_count` as keyof ProfileEntity;
          shouldGrant = (profile[countField] as number) >= (criteria.count as number);
          break;
        }
      }

      if (shouldGrant) {
        // Grant achievement - only add to earned if insert succeeds
        const { error } = await this.supabase
          .from('user_achievements')
          .insert({ user_id: userId, achievement_id: achievement.id });

        // Skip if already earned (unique constraint violation) or other error
        if (!error) {
          earned.push({
            id: achievement.id,
            name: achievement.name,
            display_name: achievement.display_name,
          });
        }
      }
    }

    return earned;
  }
}
