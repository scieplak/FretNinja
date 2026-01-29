import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type {
  CreateQuizSessionCommand,
  QuizSessionDTO,
  QuizSessionListDTO,
  QuizSessionListItemDTO,
  QuizSessionDetailDTO,
  UpdateQuizSessionResponseDTO,
  AchievementEarnedDTO,
  ProfileEntity,
  ApiErrorDTO,
} from "../../types";
import { AchievementService } from "./achievement.service";

type SupabaseClientType = SupabaseClient<Database>;

interface ServiceResult<T> {
  data?: T;
  error?: { status: number; body: ApiErrorDTO };
}

export class QuizSessionService {
  constructor(private supabase: SupabaseClientType) {}

  async createSession(userId: string, command: CreateQuizSessionCommand): Promise<ServiceResult<QuizSessionDTO>> {
    // Check for existing active session
    const { data: activeSession } = await this.supabase
      .from("quiz_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "in_progress")
      .maybeSingle();

    if (activeSession) {
      return {
        error: {
          status: 409,
          body: { code: "SESSION_IN_PROGRESS", message: "You have an unfinished quiz session" },
        },
      };
    }

    // Create new session
    const { data, error } = await this.supabase
      .from("quiz_sessions")
      .insert({
        user_id: userId,
        quiz_type: command.quiz_type,
        difficulty: command.difficulty,
        time_limit_seconds: command.difficulty === "hard" ? command.time_limit_seconds : null,
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .select("id, user_id, quiz_type, difficulty, status, time_limit_seconds, started_at, created_at")
      .single();

    if (error) {
      console.error("Failed to create quiz session:", error.message);
      return {
        error: {
          status: 500,
          body: { code: "SERVER_ERROR", message: "Failed to create quiz session" },
        },
      };
    }

    return { data };
  }

  async listSessions(
    userId: string,
    query: {
      page: number;
      limit: number;
      quiz_type?: string;
      difficulty?: string;
      status?: string;
      sort?: string;
    }
  ): Promise<ServiceResult<QuizSessionListDTO>> {
    // Parse sort parameter (default: completed_at:desc)
    const sortParam = query.sort ?? "completed_at:desc";
    const [sortField, sortDirection] = sortParam.split(":");
    const ascending = sortDirection === "asc";

    // Build base query
    let baseQuery = this.supabase
      .from("quiz_sessions")
      .select("id, quiz_type, difficulty, score, status, time_taken_seconds, started_at, completed_at", {
        count: "exact",
      })
      .eq("user_id", userId);

    // Apply filters
    if (query.quiz_type) {
      baseQuery = baseQuery.eq("quiz_type", query.quiz_type as Database["public"]["Enums"]["quiz_type_enum"]);
    }
    if (query.difficulty) {
      baseQuery = baseQuery.eq("difficulty", query.difficulty as Database["public"]["Enums"]["difficulty_enum"]);
    }
    if (query.status) {
      baseQuery = baseQuery.eq("status", query.status as Database["public"]["Enums"]["session_status_enum"]);
    }

    // Apply sorting and pagination
    const offset = (query.page - 1) * query.limit;

    const { data, error, count } = await baseQuery
      .order(sortField, { ascending, nullsFirst: false })
      .range(offset, offset + query.limit - 1);

    if (error) {
      console.error("Failed to fetch quiz sessions:", error.message);
      return {
        error: {
          status: 500,
          body: { code: "SERVER_ERROR", message: "Failed to fetch quiz sessions" },
        },
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
        },
      },
    };
  }

  async getSession(userId: string, sessionId: string): Promise<ServiceResult<QuizSessionDetailDTO>> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return {
        error: {
          status: 404,
          body: { code: "NOT_FOUND", message: "Quiz session not found" },
        },
      };
    }

    // Fetch session
    const { data: session, error: sessionError } = await this.supabase
      .from("quiz_sessions")
      .select(
        `
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
      `
      )
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return {
        error: {
          status: 404,
          body: { code: "NOT_FOUND", message: "Quiz session not found" },
        },
      };
    }

    // Check ownership
    if (session.user_id !== userId) {
      return {
        error: {
          status: 403,
          body: { code: "FORBIDDEN", message: "You cannot access this session" },
        },
      };
    }

    // Fetch answers
    const { data: answers, error: answersError } = await this.supabase
      .from("quiz_answers")
      .select(
        `
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
      `
      )
      .eq("session_id", sessionId)
      .order("question_number", { ascending: true });

    if (answersError) {
      console.error("Failed to fetch answers:", answersError.message);
      return {
        error: {
          status: 500,
          body: { code: "SERVER_ERROR", message: "Failed to fetch quiz session" },
        },
      };
    }

    return {
      data: {
        ...session,
        answers: answers || [],
      },
    };
  }

  async updateSession(
    userId: string,
    sessionId: string,
    command: { status: "completed" | "abandoned"; time_taken_seconds?: number }
  ): Promise<ServiceResult<UpdateQuizSessionResponseDTO>> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return {
        error: { status: 404, body: { code: "NOT_FOUND", message: "Quiz session not found" } },
      };
    }

    // Fetch session and verify ownership
    const { data: session, error: sessionError } = await this.supabase
      .from("quiz_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return {
        error: { status: 404, body: { code: "NOT_FOUND", message: "Quiz session not found" } },
      };
    }

    if (session.user_id !== userId) {
      return {
        error: { status: 403, body: { code: "FORBIDDEN", message: "You cannot modify this session" } },
      };
    }

    if (session.status !== "in_progress") {
      return {
        error: {
          status: 409,
          body: { code: "ALREADY_FINALIZED", message: "Session is already completed or abandoned" },
        },
      };
    }

    let achievementsEarned: AchievementEarnedDTO[] = [];
    let score: number | null = null;

    if (command.status === "completed") {
      // Count answers
      const { count } = await this.supabase
        .from("quiz_answers")
        .select("*", { count: "exact", head: true })
        .eq("session_id", sessionId);

      if (count !== 10) {
        return {
          error: {
            status: 400,
            body: { code: "VALIDATION_ERROR", message: "Cannot complete session without all 10 answers" },
          },
        };
      }

      // Calculate score
      const { data: correctAnswers } = await this.supabase
        .from("quiz_answers")
        .select("id")
        .eq("session_id", sessionId)
        .eq("is_correct", true);

      score = correctAnswers?.length ?? 0;

      // Update profile (streak + quiz count)
      const { data: profile } = await this.supabase.from("profiles").select("*").eq("id", userId).single();

      if (profile) {
        const today = new Date().toISOString().split("T")[0];
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

        const quizCountField = `${session.quiz_type}_count` as keyof typeof profile;
        const currentCount = profile[quizCountField] as number;

        const profileUpdate = {
          current_streak: newStreak,
          longest_streak: newLongestStreak,
          last_activity_date: today,
          [quizCountField]: currentCount + 1,
        };

        await this.supabase.from("profiles").update(profileUpdate).eq("id", userId);

        // Evaluate achievements
        const updatedProfile = { ...profile, ...profileUpdate } as ProfileEntity;
        const achievementService = new AchievementService(this.supabase);
        achievementsEarned = await achievementService.evaluateAndGrant(
          userId,
          updatedProfile,
          session.quiz_type,
          score
        );
      }
    }

    // Update session
    const { data: updatedSession, error: updateError } = await this.supabase
      .from("quiz_sessions")
      .update({
        status: command.status,
        score: command.status === "completed" ? score : null,
        time_taken_seconds: command.time_taken_seconds ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .select("id, user_id, quiz_type, difficulty, score, status, time_taken_seconds, started_at, completed_at")
      .single();

    if (updateError || !updatedSession) {
      console.error("Failed to update quiz session:", updateError?.message);
      return {
        error: { status: 500, body: { code: "SERVER_ERROR", message: "Failed to update quiz session" } },
      };
    }

    return {
      data: {
        ...updatedSession,
        achievements_earned: achievementsEarned,
      },
    };
  }
}
