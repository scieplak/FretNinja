import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "../../db/database.types";
import type {
  CreateQuizAnswerCommand,
  CreateQuizAnswerResponseDTO,
  QuizAnswersListDTO,
  QuizAnswerDTO,
  ApiErrorDTO,
} from "../../types";

type SupabaseClientType = SupabaseClient<Database>;

interface ServiceResult<T> {
  data?: T;
  error?: { status: number; body: ApiErrorDTO };
}

export class QuizAnswerService {
  constructor(private supabase: SupabaseClientType) {}

  async createAnswer(
    userId: string,
    sessionId: string,
    command: CreateQuizAnswerCommand
  ): Promise<ServiceResult<CreateQuizAnswerResponseDTO>> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return {
        error: { status: 404, body: { code: "NOT_FOUND", message: "Quiz session not found" } },
      };
    }

    // Verify session exists and user owns it
    const { data: session, error: sessionError } = await this.supabase
      .from("quiz_sessions")
      .select("id, user_id, status")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return {
        error: { status: 404, body: { code: "NOT_FOUND", message: "Quiz session not found" } },
      };
    }

    if (session.user_id !== userId) {
      return {
        error: { status: 403, body: { code: "FORBIDDEN", message: "You cannot add answers to this session" } },
      };
    }

    if (session.status !== "in_progress") {
      return {
        error: { status: 409, body: { code: "SESSION_NOT_ACTIVE", message: "Quiz session is not in progress" } },
      };
    }

    // Check for duplicate answer
    const { data: existingAnswer } = await this.supabase
      .from("quiz_answers")
      .select("id")
      .eq("session_id", sessionId)
      .eq("question_number", command.question_number)
      .maybeSingle();

    if (existingAnswer) {
      return {
        error: {
          status: 400,
          body: { code: "VALIDATION_ERROR", message: "Answer for this question already submitted" },
        },
      };
    }

    // Insert answer
    const { data, error } = await this.supabase
      .from("quiz_answers")
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
        user_answer_positions: (command.user_answer_positions as Json) ?? null,
        target_interval: command.target_interval ?? null,
        reference_fret_position: command.reference_fret_position ?? null,
        reference_string_number: command.reference_string_number ?? null,
        user_answer_interval: command.user_answer_interval ?? null,
      })
      .select("id, session_id, question_number, is_correct, created_at")
      .single();

    if (error || !data) {
      console.error("Failed to create answer:", error?.message);
      return {
        error: { status: 500, body: { code: "SERVER_ERROR", message: "Failed to submit answer" } },
      };
    }

    return { data };
  }

  async listAnswers(userId: string, sessionId: string): Promise<ServiceResult<QuizAnswersListDTO>> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return {
        error: { status: 404, body: { code: "NOT_FOUND", message: "Quiz session not found" } },
      };
    }

    // Verify session exists and user owns it
    const { data: session, error: sessionError } = await this.supabase
      .from("quiz_sessions")
      .select("id, user_id")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return {
        error: { status: 404, body: { code: "NOT_FOUND", message: "Quiz session not found" } },
      };
    }

    if (session.user_id !== userId) {
      return {
        error: { status: 403, body: { code: "FORBIDDEN", message: "You cannot access this session" } },
      };
    }

    // Fetch all answers
    const { data: answers, error: answersError } = await this.supabase
      .from("quiz_answers")
      .select(
        `
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
      `
      )
      .eq("session_id", sessionId)
      .order("question_number", { ascending: true });

    if (answersError) {
      console.error("Failed to fetch answers:", answersError.message);
      return {
        error: { status: 500, body: { code: "SERVER_ERROR", message: "Failed to fetch answers" } },
      };
    }

    return {
      data: {
        session_id: sessionId,
        answers: (answers || []) as QuizAnswerDTO[],
      },
    };
  }
}
