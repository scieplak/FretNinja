/**
 * DTO and Command Model type definitions for FretNinja API.
 * All types are derived from database models in ./db/database.types.ts
 */

import type { Tables, Enums } from './db/database.types';

// =============================================================================
// Database Entity Aliases
// =============================================================================

/** Profile entity row type from database */
export type ProfileEntity = Tables<'profiles'>;

/** Quiz session entity row type from database */
export type QuizSessionEntity = Tables<'quiz_sessions'>;

/** Quiz answer entity row type from database */
export type QuizAnswerEntity = Tables<'quiz_answers'>;

/** Achievement entity row type from database */
export type AchievementEntity = Tables<'achievements'>;

/** User achievement entity row type from database */
export type UserAchievementEntity = Tables<'user_achievements'>;

// =============================================================================
// Enum Type Aliases
// =============================================================================

/** Musical note values (C, C#, D, etc.) */
export type NoteEnum = Enums<'note_enum'>;

/** Musical interval values (minor_2nd, major_2nd, etc.) */
export type IntervalEnum = Enums<'interval_enum'>;

/** Chord type values (major, minor, diminished, augmented) */
export type ChordTypeEnum = Enums<'chord_type_enum'>;

/** Quiz type values (find_note, name_note, mark_chord, recognize_interval) */
export type QuizTypeEnum = Enums<'quiz_type_enum'>;

/** Difficulty level values (easy, medium, hard) */
export type DifficultyEnum = Enums<'difficulty_enum'>;

/** Session status values (in_progress, completed, abandoned) */
export type SessionStatusEnum = Enums<'session_status_enum'>;

// =============================================================================
// Common Types
// =============================================================================

/** Standard pagination metadata */
export interface PaginationDTO {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

/** Fret position on the guitar (used in answers, hints, etc.) */
export interface FretPositionDTO {
  fret: number;
  string: number;
}

// =============================================================================
// Authentication DTOs and Commands
// =============================================================================

/** Request payload for user registration */
export interface RegisterCommand {
  email: string;
  password: string;
}

/** User info returned in auth responses */
export interface AuthUserDTO {
  id: string;
  email: string;
}

/** Response payload for successful registration */
export interface RegisterResponseDTO {
  user: AuthUserDTO;
  message: string;
}

/** Request payload for user login */
export interface LoginCommand {
  email: string;
  password: string;
}

/** Session info returned in login response */
export interface SessionDTO {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

/** Response payload for successful login */
export interface LoginResponseDTO {
  user: AuthUserDTO;
  session: SessionDTO;
}

/** Response payload for successful logout */
export interface LogoutResponseDTO {
  message: string;
}

/** Request payload for password reset */
export interface PasswordResetCommand {
  email: string;
}

/** Response payload for password reset request */
export interface PasswordResetResponseDTO {
  message: string;
}

/** Request payload for password update */
export interface PasswordUpdateCommand {
  password: string;
}

/** Response payload for password update */
export interface PasswordUpdateResponseDTO {
  message: string;
}

// =============================================================================
// Profile DTOs and Commands
// =============================================================================

/**
 * Profile DTO - represents user profile data returned from API.
 * Directly maps to the profiles table row type.
 */
export type ProfileDTO = ProfileEntity;

/**
 * Command to update user profile settings.
 * Contains only the fields that can be updated by the user.
 */
export interface UpdateProfileCommand {
  display_name?: string | null;
  fretboard_range?: number;
  show_note_names?: boolean;
  tutorial_completed_modes?: string[];
}

// =============================================================================
// Quiz Session DTOs and Commands
// =============================================================================

/**
 * Command to create a new quiz session.
 * Derived from quiz_sessions insert type with only user-provided fields.
 */
export interface CreateQuizSessionCommand {
  quiz_type: QuizTypeEnum;
  difficulty: DifficultyEnum;
  time_limit_seconds?: number | null;
}

/**
 * Quiz session DTO returned when creating a session.
 * Contains essential session fields for the client.
 */
export interface QuizSessionDTO {
  id: QuizSessionEntity['id'];
  user_id: QuizSessionEntity['user_id'];
  quiz_type: QuizSessionEntity['quiz_type'];
  difficulty: QuizSessionEntity['difficulty'];
  status: QuizSessionEntity['status'];
  time_limit_seconds: QuizSessionEntity['time_limit_seconds'];
  started_at: QuizSessionEntity['started_at'];
  created_at: QuizSessionEntity['created_at'];
}

/**
 * Quiz session item for list responses.
 * Contains a subset of fields optimized for list display.
 */
export interface QuizSessionListItemDTO {
  id: QuizSessionEntity['id'];
  quiz_type: QuizSessionEntity['quiz_type'];
  difficulty: QuizSessionEntity['difficulty'];
  score: QuizSessionEntity['score'];
  status: QuizSessionEntity['status'];
  time_taken_seconds: QuizSessionEntity['time_taken_seconds'];
  started_at: QuizSessionEntity['started_at'];
  completed_at: QuizSessionEntity['completed_at'];
}

/** Response for quiz session list endpoint with pagination */
export interface QuizSessionListDTO {
  data: QuizSessionListItemDTO[];
  pagination: PaginationDTO;
}

/**
 * Simplified answer DTO for inclusion in session details.
 * Contains answer fields relevant to the quiz type.
 */
export interface QuizAnswerSummaryDTO {
  question_number: QuizAnswerEntity['question_number'];
  is_correct: QuizAnswerEntity['is_correct'];
  time_taken_ms: QuizAnswerEntity['time_taken_ms'];
  fret_position: QuizAnswerEntity['fret_position'];
  string_number: QuizAnswerEntity['string_number'];
  target_note: QuizAnswerEntity['target_note'];
  target_interval: QuizAnswerEntity['target_interval'];
  target_root_note: QuizAnswerEntity['target_root_note'];
  target_chord_type: QuizAnswerEntity['target_chord_type'];
  reference_fret_position: QuizAnswerEntity['reference_fret_position'];
  reference_string_number: QuizAnswerEntity['reference_string_number'];
  user_answer_note: QuizAnswerEntity['user_answer_note'];
  user_answer_interval: QuizAnswerEntity['user_answer_interval'];
  user_answer_positions: QuizAnswerEntity['user_answer_positions'];
}

/**
 * Detailed quiz session DTO with answers.
 * Returned when fetching a specific session by ID.
 */
export interface QuizSessionDetailDTO {
  id: QuizSessionEntity['id'];
  user_id: QuizSessionEntity['user_id'];
  quiz_type: QuizSessionEntity['quiz_type'];
  difficulty: QuizSessionEntity['difficulty'];
  score: QuizSessionEntity['score'];
  status: QuizSessionEntity['status'];
  time_limit_seconds: QuizSessionEntity['time_limit_seconds'];
  time_taken_seconds: QuizSessionEntity['time_taken_seconds'];
  started_at: QuizSessionEntity['started_at'];
  completed_at: QuizSessionEntity['completed_at'];
  answers: QuizAnswerSummaryDTO[];
}

/**
 * Command to update a quiz session (complete or abandon).
 * Only status and time_taken_seconds can be updated.
 */
export interface UpdateQuizSessionCommand {
  status: Extract<SessionStatusEnum, 'completed' | 'abandoned'>;
  time_taken_seconds?: number;
}

/** Achievement info returned when earned during session completion */
export interface AchievementEarnedDTO {
  id: AchievementEntity['id'];
  name: AchievementEntity['name'];
  display_name: AchievementEntity['display_name'];
}

/**
 * Response for quiz session update (completion).
 * Includes any newly earned achievements.
 */
export interface UpdateQuizSessionResponseDTO {
  id: QuizSessionEntity['id'];
  user_id: QuizSessionEntity['user_id'];
  quiz_type: QuizSessionEntity['quiz_type'];
  difficulty: QuizSessionEntity['difficulty'];
  score: QuizSessionEntity['score'];
  status: QuizSessionEntity['status'];
  time_taken_seconds: QuizSessionEntity['time_taken_seconds'];
  started_at: QuizSessionEntity['started_at'];
  completed_at: QuizSessionEntity['completed_at'];
  achievements_earned: AchievementEarnedDTO[];
}

// =============================================================================
// Quiz Answer DTOs and Commands
// =============================================================================

/**
 * Command to create a quiz answer.
 * Includes all possible fields for different quiz types.
 * Fields are conditional based on quiz_type.
 */
export interface CreateQuizAnswerCommand {
  question_number: number;
  is_correct: boolean;
  time_taken_ms?: number | null;
  /** Target/answer fret position (0-24) */
  fret_position?: number | null;
  /** Target/answer string number (1-6, 1=high E, 6=low E) */
  string_number?: number | null;
  /** Target note for find_note/name_note modes */
  target_note?: NoteEnum | null;
  /** User's answer for name_note mode */
  user_answer_note?: NoteEnum | null;
  /** Chord root note for mark_chord mode */
  target_root_note?: NoteEnum | null;
  /** Chord type for mark_chord mode */
  target_chord_type?: ChordTypeEnum | null;
  /** User's marked positions for mark_chord mode */
  user_answer_positions?: FretPositionDTO[] | null;
  /** Target interval for recognize_interval mode */
  target_interval?: IntervalEnum | null;
  /** Reference note fret for intervals */
  reference_fret_position?: number | null;
  /** Reference note string for intervals */
  reference_string_number?: number | null;
  /** User's answer for recognize_interval mode */
  user_answer_interval?: IntervalEnum | null;
}

/** Full quiz answer DTO with all fields */
export interface QuizAnswerDTO {
  id: QuizAnswerEntity['id'];
  session_id: QuizAnswerEntity['session_id'];
  question_number: QuizAnswerEntity['question_number'];
  is_correct: QuizAnswerEntity['is_correct'];
  time_taken_ms: QuizAnswerEntity['time_taken_ms'];
  fret_position: QuizAnswerEntity['fret_position'];
  string_number: QuizAnswerEntity['string_number'];
  target_note: QuizAnswerEntity['target_note'];
  user_answer_note: QuizAnswerEntity['user_answer_note'];
  target_root_note: QuizAnswerEntity['target_root_note'];
  target_chord_type: QuizAnswerEntity['target_chord_type'];
  user_answer_positions: QuizAnswerEntity['user_answer_positions'];
  target_interval: QuizAnswerEntity['target_interval'];
  reference_fret_position: QuizAnswerEntity['reference_fret_position'];
  reference_string_number: QuizAnswerEntity['reference_string_number'];
  user_answer_interval: QuizAnswerEntity['user_answer_interval'];
  created_at: QuizAnswerEntity['created_at'];
}

/** Response for creating a quiz answer */
export interface CreateQuizAnswerResponseDTO {
  id: QuizAnswerEntity['id'];
  session_id: QuizAnswerEntity['session_id'];
  question_number: QuizAnswerEntity['question_number'];
  is_correct: QuizAnswerEntity['is_correct'];
  created_at: QuizAnswerEntity['created_at'];
}

/** Response for listing quiz answers */
export interface QuizAnswersListDTO {
  session_id: string;
  answers: QuizAnswerDTO[];
}

// =============================================================================
// Achievement DTOs
// =============================================================================

/**
 * Full achievement DTO.
 * Directly maps to the achievements table row type.
 */
export type AchievementDTO = AchievementEntity;

/** Response for listing all achievements */
export interface AchievementsListDTO {
  data: AchievementDTO[];
}

/** User's earned achievement with earned date */
export interface UserEarnedAchievementDTO {
  id: AchievementEntity['id'];
  name: AchievementEntity['name'];
  display_name: AchievementEntity['display_name'];
  description: AchievementEntity['description'];
  earned_at: UserAchievementEntity['earned_at'];
}

/** Progress toward an unearned achievement */
export interface AchievementProgressDTO {
  id: AchievementEntity['id'];
  name: AchievementEntity['name'];
  display_name: AchievementEntity['display_name'];
  description: AchievementEntity['description'];
  current: number;
  target: number;
  percentage: number;
}

/** Response for user achievements endpoint */
export interface UserAchievementsDTO {
  earned: UserEarnedAchievementDTO[];
  progress: AchievementProgressDTO[];
}

// =============================================================================
// Statistics DTOs
// =============================================================================

/** Single heatmap data point from user_error_heatmap view */
export interface HeatmapDataItemDTO {
  fret_position: number;
  string_number: number;
  error_count: number;
}

/** Filters applied to heatmap query */
export interface HeatmapFiltersDTO {
  quiz_type: QuizTypeEnum | null;
  from_date: string | null;
  to_date: string | null;
}

/** Response for heatmap endpoint */
export interface HeatmapResponseDTO {
  data: HeatmapDataItemDTO[];
  max_error_count: number;
  total_errors: number;
  filters: HeatmapFiltersDTO;
}

/** Statistics for a specific quiz type */
export interface QuizTypeStatsDTO {
  count: number;
  average_score: number;
  best_score: number;
  total_time_seconds: number;
}

/** Statistics for a specific difficulty level */
export interface DifficultyStatsDTO {
  count: number;
  average_score: number;
}

/** Statistics for a time period */
export interface TrendPeriodDTO {
  quizzes: number;
  average_score: number;
}

/** Recent trend comparison data */
export interface RecentTrendDTO {
  last_7_days: TrendPeriodDTO;
  previous_7_days: TrendPeriodDTO;
  /** Percentage improvement between periods */
  improvement: number;
}

/** Response for stats overview endpoint */
export interface StatsOverviewDTO {
  total_quizzes: number;
  total_time_seconds: number;
  current_streak: ProfileEntity['current_streak'];
  longest_streak: ProfileEntity['longest_streak'];
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

// =============================================================================
// AI Hints DTOs and Commands
// =============================================================================

/** Context type for AI hint requests */
export type AIHintContextEnum = 'quiz' | 'explorer';

/**
 * Command to request an AI hint.
 * Fields are conditional based on context and quiz_type.
 */
export interface AIHintCommand {
  context: AIHintContextEnum;
  quiz_type?: QuizTypeEnum | null;
  target_note?: NoteEnum | null;
  target_interval?: IntervalEnum | null;
  target_chord_type?: ChordTypeEnum | null;
  target_root_note?: NoteEnum | null;
  fret_position?: number | null;
  string_number?: number | null;
  user_error_positions?: FretPositionDTO[] | null;
}

/** Related position with note information in hint response */
export interface RelatedPositionDTO {
  fret: number;
  string: number;
  note: NoteEnum;
}

/** Response for AI hint endpoint */
export interface AIHintResponseDTO {
  hint: string;
  related_positions: RelatedPositionDTO[];
  memorization_tip: string;
}

/** Command to request personalized learning tips */
export interface PersonalizedTipsCommand {
  quiz_type?: QuizTypeEnum | null;
  /** Number of tips to return (1-5, default 3) */
  limit?: number | null;
}

/** Practice position with note in personalized tips */
export interface PracticePositionDTO {
  fret: number;
  string: number;
  note: NoteEnum;
}

/** Single personalized learning tip */
export interface PersonalizedTipDTO {
  focus_area: string;
  observation: string;
  suggestion: string;
  practice_positions: PracticePositionDTO[];
}

/** Response for personalized tips endpoint */
export interface PersonalizedTipsResponseDTO {
  tips: PersonalizedTipDTO[];
  overall_recommendation: string;
}

// =============================================================================
// API Error Types
// =============================================================================

/** Standard API error response */
export interface ApiErrorDTO {
  code: string;
  message: string;
}

/** API error codes used across endpoints */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'EMAIL_EXISTS'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_TOKEN'
  | 'SESSION_IN_PROGRESS'
  | 'SESSION_NOT_ACTIVE'
  | 'ALREADY_FINALIZED'
  | 'INSUFFICIENT_DATA'
  | 'RATE_LIMITED'
  | 'AI_UNAVAILABLE'
  | 'SERVER_ERROR';
