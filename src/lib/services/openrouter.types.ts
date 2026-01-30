/**
 * OpenRouter Service Type Definitions
 *
 * Provides type-safe interfaces for interacting with the OpenRouter.ai API.
 */

// =============================================================================
// Configuration
// =============================================================================

/** Configuration options for the OpenRouter service */
export interface OpenRouterConfig {
  /** OpenRouter API key. Falls back to OPENROUTER_API_KEY env variable. */
  apiKey?: string;

  /** Default model to use for completions. */
  defaultModel?: string;

  /** Base URL for the OpenRouter API. Defaults to https://openrouter.ai/api/v1 */
  baseUrl?: string;

  /** HTTP-Referer header for OpenRouter analytics. */
  siteUrl?: string;

  /** X-Title header for OpenRouter analytics. */
  siteName?: string;

  /** Default timeout in milliseconds. Defaults to 30000 (30s). */
  timeout?: number;
}

// =============================================================================
// Messages
// =============================================================================

/** Role of a message in the conversation */
export type ChatMessageRole = "system" | "user" | "assistant";

/** A single message in a chat conversation */
export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
}

// =============================================================================
// Model Parameters
// =============================================================================

/** Parameters for controlling model behavior */
export interface ModelParameters {
  /** Sampling temperature (0-2). Higher = more creative. Default: 0.7 */
  temperature?: number;

  /** Maximum tokens to generate. Default: model-specific */
  max_tokens?: number;

  /** Top-p sampling (0-1). Alternative to temperature. */
  top_p?: number;

  /** Frequency penalty (-2 to 2). Reduces repetition. */
  frequency_penalty?: number;

  /** Presence penalty (-2 to 2). Encourages new topics. */
  presence_penalty?: number;

  /** Stop sequences. Generation stops when encountered. */
  stop?: string[];
}

// =============================================================================
// JSON Schema Types
// =============================================================================

/** JSON Schema definition for structured responses */
export interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: string[];
  description?: string;
  additionalProperties?: boolean | JsonSchema;
  [key: string]: unknown;
}

/** Response format configuration for structured JSON outputs */
export interface ResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: true;
    schema: JsonSchema;
  };
}

// =============================================================================
// Request Types
// =============================================================================

/** Request payload for chat completion */
export interface ChatCompletionRequest<T = string> {
  /** Messages to send to the model */
  messages: ChatMessage[];

  /** Model to use. Overrides defaultModel. */
  model?: string;

  /** Model parameters */
  parameters?: ModelParameters;

  /**
   * JSON schema for structured responses.
   * When provided, the model output will be parsed and validated.
   */
  responseFormat?: ResponseFormat<T>;
}

// =============================================================================
// Response Types
// =============================================================================

/** Token usage statistics from the API response */
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/** Error codes returned by the OpenRouter service */
export type OpenRouterErrorCode =
  | "INVALID_API_KEY"
  | "RATE_LIMITED"
  | "MODEL_NOT_FOUND"
  | "CONTEXT_LENGTH_EXCEEDED"
  | "CONTENT_FILTERED"
  | "SERVICE_UNAVAILABLE"
  | "TIMEOUT"
  | "PARSE_ERROR"
  | "SCHEMA_VALIDATION_ERROR"
  | "UNKNOWN_ERROR";

/** Error object returned when a request fails */
export interface OpenRouterError {
  code: OpenRouterErrorCode;
  message: string;
  status: number;
}

/** Result of a chat completion request */
export interface ChatCompletionResult<T = string> {
  success: boolean;
  data?: T;
  error?: OpenRouterError;
  usage?: TokenUsage;
}

// =============================================================================
// Internal API Types (for type-safe response parsing)
// =============================================================================

/** OpenRouter API response structure */
export interface OpenRouterApiResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** OpenRouter API error response structure */
export interface OpenRouterApiError {
  error?: {
    message: string;
    type?: string;
    code?: string;
  };
}
