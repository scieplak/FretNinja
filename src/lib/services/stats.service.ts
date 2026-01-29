import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../db/database.types';
import type {
  HeatmapResponseDTO,
  HeatmapDataItemDTO,
  QuizTypeEnum,
  ApiErrorDTO,
  StatsOverviewDTO,
  QuizTypeStatsDTO,
  DifficultyStatsDTO,
  NoteMasteryResponseDTO,
  NoteMasteryItemDTO,
  NoteEnum,
} from '../../types';

type SupabaseClientType = SupabaseClient<Database>;

interface ServiceResult<T> {
  data?: T;
  error?: { status: number; body: ApiErrorDTO };
}

export class StatsService {
  constructor(private supabase: SupabaseClientType) {}

  async getHeatmap(
    userId: string,
    filters: {
      quiz_type?: string;
      from_date?: string;
      to_date?: string;
    }
  ): Promise<ServiceResult<HeatmapResponseDTO>> {
    // If no filters, use the view directly
    if (!filters.quiz_type && !filters.from_date && !filters.to_date) {
      const { data, error } = await this.supabase
        .from('user_error_heatmap')
        .select('fret_position, string_number, error_count')
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to fetch heatmap:', error.message);
        return {
          error: { status: 500, body: { code: 'SERVER_ERROR', message: 'Failed to fetch heatmap data' } },
        };
      }

      const heatmapData: HeatmapDataItemDTO[] = (data || [])
        .filter((d) => d.fret_position !== null && d.string_number !== null && d.error_count !== null)
        .map((d) => ({
          fret_position: d.fret_position!,
          string_number: d.string_number!,
          error_count: d.error_count!,
        }));

      return this.formatHeatmapResponse(heatmapData, filters);
    }

    // With filters, need to query directly with JOINs
    let query = this.supabase
      .from('quiz_answers')
      .select(
        `
        fret_position,
        string_number,
        quiz_sessions!inner (
          user_id,
          quiz_type,
          completed_at
        )
      `
      )
      .eq('is_correct', false)
      .not('fret_position', 'is', null)
      .not('string_number', 'is', null);

    // Note: We need to filter by user_id through the join
    // This is a limitation - we'll filter in JS if needed

    const { data: rawData, error } = await query;

    if (error) {
      console.error('Failed to fetch heatmap:', error.message);
      return {
        error: { status: 500, body: { code: 'SERVER_ERROR', message: 'Failed to fetch heatmap data' } },
      };
    }

    // Filter and aggregate the results
    const filteredData = (rawData || []).filter((row) => {
      const session = row.quiz_sessions as unknown as {
        user_id: string;
        quiz_type: string;
        completed_at: string | null;
      };

      if (session.user_id !== userId) return false;

      if (filters.quiz_type && session.quiz_type !== filters.quiz_type) return false;

      if (filters.from_date && session.completed_at) {
        if (session.completed_at < `${filters.from_date}T00:00:00`) return false;
      }

      if (filters.to_date && session.completed_at) {
        if (session.completed_at > `${filters.to_date}T23:59:59`) return false;
      }

      return true;
    });

    const aggregated = this.aggregateHeatmapData(filteredData);

    return this.formatHeatmapResponse(aggregated, filters);
  }

  private aggregateHeatmapData(
    rawData: Array<{ fret_position: number | null; string_number: number | null }>
  ): HeatmapDataItemDTO[] {
    const map = new Map<string, number>();

    for (const row of rawData) {
      if (row.fret_position === null || row.string_number === null) continue;
      const key = `${row.fret_position}-${row.string_number}`;
      map.set(key, (map.get(key) || 0) + 1);
    }

    const result: HeatmapDataItemDTO[] = [];
    for (const [key, count] of map) {
      const [fret, string] = key.split('-').map(Number);
      result.push({
        fret_position: fret,
        string_number: string,
        error_count: count,
      });
    }

    return result;
  }

  private formatHeatmapResponse(
    data: HeatmapDataItemDTO[],
    filters: { quiz_type?: string; from_date?: string; to_date?: string }
  ): ServiceResult<HeatmapResponseDTO> {
    const maxErrorCount = data.reduce((max, item) => Math.max(max, item.error_count), 0);
    const totalErrors = data.reduce((sum, item) => sum + item.error_count, 0);

    return {
      data: {
        data,
        max_error_count: maxErrorCount,
        total_errors: totalErrors,
        filters: {
          quiz_type: (filters.quiz_type as QuizTypeEnum) || null,
          from_date: filters.from_date || null,
          to_date: filters.to_date || null,
        },
      },
    };
  }

  async getNoteMastery(userId: string): Promise<ServiceResult<NoteMasteryResponseDTO>> {
    const ALL_NOTES: NoteEnum[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    // Query all answers with target_note for this user
    const { data: rawData, error } = await this.supabase
      .from('quiz_answers')
      .select(
        `
        target_note,
        is_correct,
        quiz_sessions!inner (
          user_id
        )
      `
      )
      .not('target_note', 'is', null);

    if (error) {
      console.error('Failed to fetch note mastery:', error.message);
      return {
        error: { status: 500, body: { code: 'SERVER_ERROR', message: 'Failed to fetch note mastery data' } },
      };
    }

    // Filter by user and aggregate
    const noteStats = new Map<NoteEnum, { correct: number; total: number }>();

    // Initialize all notes
    for (const note of ALL_NOTES) {
      noteStats.set(note, { correct: 0, total: 0 });
    }

    // Aggregate data
    for (const row of rawData || []) {
      const session = row.quiz_sessions as unknown as { user_id: string };
      if (session.user_id !== userId) continue;

      const note = row.target_note as NoteEnum;
      if (!note) continue;

      const stats = noteStats.get(note);
      if (stats) {
        stats.total += 1;
        if (row.is_correct) {
          stats.correct += 1;
        }
      }
    }

    // Build response
    const data: NoteMasteryItemDTO[] = ALL_NOTES.map((note) => {
      const stats = noteStats.get(note)!;
      return {
        note,
        total_attempts: stats.total,
        correct_count: stats.correct,
        error_count: stats.total - stats.correct,
        accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      };
    });

    const totalAttempts = data.reduce((sum, item) => sum + item.total_attempts, 0);
    const totalErrors = data.reduce((sum, item) => sum + item.error_count, 0);
    const overallAccuracy = totalAttempts > 0 ? Math.round(((totalAttempts - totalErrors) / totalAttempts) * 100) : 0;

    return {
      data: {
        data,
        total_attempts: totalAttempts,
        total_errors: totalErrors,
        overall_accuracy: overallAccuracy,
      },
    };
  }

  async getOverview(userId: string): Promise<ServiceResult<StatsOverviewDTO>> {
    // 1. Fetch profile for streaks
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('current_streak, longest_streak')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Failed to fetch profile:', profileError?.message);
      return {
        error: { status: 500, body: { code: 'SERVER_ERROR', message: 'Failed to fetch statistics' } },
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
        error: { status: 500, body: { code: 'SERVER_ERROR', message: 'Failed to fetch statistics' } },
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
      },
    };
  }

  private aggregateByQuizType(
    sessions: Array<{ quiz_type: string; score: number | null; time_taken_seconds: number | null }>
  ): StatsOverviewDTO['by_quiz_type'] {
    const types = ['find_note', 'name_note', 'mark_chord', 'recognize_interval'] as const;
    const result: Record<string, QuizTypeStatsDTO> = {};

    for (const type of types) {
      const typeSessions = sessions.filter((s) => s.quiz_type === type);
      const scores = typeSessions.map((s) => s.score).filter((s): s is number => s !== null);

      result[type] = {
        count: typeSessions.length,
        average_score:
          scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0,
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
      const diffSessions = sessions.filter((s) => s.difficulty === diff);
      const scores = diffSessions.map((s) => s.score).filter((s): s is number => s !== null);

      result[diff] = {
        count: diffSessions.length,
        average_score:
          scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0,
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

    const last7Days = sessions.filter((s) => {
      if (!s.completed_at) return false;
      const date = new Date(s.completed_at);
      return date >= sevenDaysAgo && date <= now;
    });

    const previous7Days = sessions.filter((s) => {
      if (!s.completed_at) return false;
      const date = new Date(s.completed_at);
      return date >= fourteenDaysAgo && date < sevenDaysAgo;
    });

    const last7Scores = last7Days.map((s) => s.score).filter((s): s is number => s !== null);
    const prev7Scores = previous7Days.map((s) => s.score).filter((s): s is number => s !== null);

    const last7Avg =
      last7Scores.length > 0 ? Math.round((last7Scores.reduce((a, b) => a + b, 0) / last7Scores.length) * 10) / 10 : 0;

    const prev7Avg =
      prev7Scores.length > 0 ? Math.round((prev7Scores.reduce((a, b) => a + b, 0) / prev7Scores.length) * 10) / 10 : 0;

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
