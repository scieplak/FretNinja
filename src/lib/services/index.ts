/**
 * Services Index
 *
 * Central export point for all application services.
 */

// OpenRouter Service
export { OpenRouterService } from "./openrouter.service";
export type {
  OpenRouterConfig,
  ChatMessage,
  ChatMessageRole,
  ModelParameters,
  JsonSchema,
  ResponseFormat,
  ChatCompletionRequest,
  ChatCompletionResult,
  TokenUsage,
  OpenRouterError,
  OpenRouterErrorCode,
} from "./openrouter.types";

// AI Service
export { AIService } from "./ai.service";

// Achievement Service
export { AchievementService } from "./achievement.service";

// Auth Service
export { AuthService } from "./auth.service";

// Profile Service
export { ProfileService } from "./profile.service";

// Quiz Answer Service
export { QuizAnswerService } from "./quiz-answer.service";

// Quiz Session Service
export { QuizSessionService } from "./quiz-session.service";

// Stats Service
export { StatsService } from "./stats.service";
