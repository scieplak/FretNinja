import type {
  OpenRouterConfig,
  ChatCompletionRequest,
  ChatCompletionResult,
  OpenRouterError,
  OpenRouterErrorCode,
  TokenUsage,
  OpenRouterApiResponse,
  OpenRouterApiError,
} from "./openrouter.types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "anthropic/claude-3-haiku";
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_MESSAGE_LENGTH = 32000;

/**
 * OpenRouter Service
 *
 * A type-safe client for interacting with the OpenRouter.ai API.
 * Supports chat completions with both free-form text and structured JSON responses.
 *
 * @example
 * ```typescript
 * const service = new OpenRouterService();
 *
 * // Simple text completion
 * const result = await service.chatCompletion({
 *   messages: [
 *     { role: 'system', content: 'You are a helpful assistant.' },
 *     { role: 'user', content: 'Hello!' },
 *   ],
 * });
 *
 * // Structured JSON response
 * const result = await service.chatCompletion<MyType>({
 *   messages: [...],
 *   responseFormat: {
 *     type: 'json_schema',
 *     json_schema: { name: 'my_schema', strict: true, schema: {...} }
 *   }
 * });
 * ```
 */
export class OpenRouterService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly siteUrl: string;
  private readonly siteName: string;
  private readonly timeout: number;

  /**
   * Creates a new OpenRouter service instance.
   *
   * @param config - Optional configuration. Falls back to environment variables.
   */
  constructor(config?: OpenRouterConfig) {
    this.apiKey = config?.apiKey ?? import.meta.env.OPENROUTER_API_KEY ?? "";
    this.baseUrl = config?.baseUrl ?? OPENROUTER_API_URL;
    this.defaultModel = config?.defaultModel ?? DEFAULT_MODEL;
    this.siteUrl = config?.siteUrl ?? import.meta.env.SITE_URL ?? "https://fretninja.com";
    this.siteName = config?.siteName ?? "FretNinja";
    this.timeout = config?.timeout ?? DEFAULT_TIMEOUT;
  }

  /**
   * Check if the service is properly configured and ready to use.
   *
   * @returns true if the API key is configured
   */
  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Get the configured default model.
   *
   * @returns The default model identifier
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }

  /**
   * Send a chat completion request to OpenRouter.
   *
   * @param request - The chat completion request
   * @returns The completion result with data or error
   */
  async chatCompletion<T = string>(request: ChatCompletionRequest<T>): Promise<ChatCompletionResult<T>> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: {
          code: "INVALID_API_KEY",
          message: "OpenRouter API key not configured",
          status: 503,
        },
      };
    }

    try {
      const body = this.buildRequestBody(request);
      const response = await this.executeRequest(body);
      return this.parseApiResponse<T>(response, Boolean(request.responseFormat));
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Build HTTP headers for the OpenRouter API request.
   */
  private buildRequestHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": this.siteUrl,
      "X-Title": this.siteName,
    };
  }

  /**
   * Build the request body for the OpenRouter API.
   */
  private buildRequestBody<T>(request: ChatCompletionRequest<T>): object {
    const body: Record<string, unknown> = {
      model: request.model ?? this.defaultModel,
      messages: request.messages.map((msg) => ({
        role: msg.role,
        content: this.sanitizeMessage(msg.content),
      })),
    };

    if (request.parameters) {
      const { temperature, max_tokens, top_p, frequency_penalty, presence_penalty, stop } = request.parameters;
      if (temperature !== undefined) body.temperature = temperature;
      if (max_tokens !== undefined) body.max_tokens = max_tokens;
      if (top_p !== undefined) body.top_p = top_p;
      if (frequency_penalty !== undefined) body.frequency_penalty = frequency_penalty;
      if (presence_penalty !== undefined) body.presence_penalty = presence_penalty;
      if (stop !== undefined) body.stop = stop;
    }

    if (request.responseFormat) {
      body.response_format = request.responseFormat;
    }

    return body;
  }

  /**
   * Execute the HTTP request to the OpenRouter API with timeout handling.
   */
  private async executeRequest(body: object): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      return await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: this.buildRequestHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Parse the OpenRouter API response.
   */
  private async parseApiResponse<T>(response: Response, hasSchema: boolean): Promise<ChatCompletionResult<T>> {
    if (!response.ok) {
      const error = await this.mapHttpError(response);
      this.logError(error);
      return { success: false, error };
    }

    const data = (await response.json()) as OpenRouterApiResponse;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: {
          code: "UNKNOWN_ERROR",
          message: "No content in response",
          status: 500,
        },
      };
    }

    const usage: TokenUsage | undefined = data.usage
      ? {
          prompt_tokens: data.usage.prompt_tokens,
          completion_tokens: data.usage.completion_tokens,
          total_tokens: data.usage.total_tokens,
        }
      : undefined;

    if (hasSchema) {
      return this.parseStructuredResponse<T>(content, usage);
    }

    return { success: true, data: content as T, usage };
  }

  /**
   * Parse a structured JSON response from the model.
   */
  private parseStructuredResponse<T>(content: string, usage?: TokenUsage): ChatCompletionResult<T> {
    try {
      // Handle markdown code blocks and raw JSON
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/(\{[\s\S]*\})/);

      const jsonString = jsonMatch ? jsonMatch[1].trim() : content;
      const parsed = JSON.parse(jsonString) as T;

      return { success: true, data: parsed, usage };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "PARSE_ERROR",
          message: `Failed to parse JSON response: ${error instanceof Error ? error.message : "Unknown error"}`,
          status: 500,
        },
        usage,
      };
    }
  }

  /**
   * Map HTTP error responses to typed error objects.
   */
  private async mapHttpError(response: Response): Promise<OpenRouterError> {
    const statusMap: Record<number, { code: OpenRouterErrorCode; message: string }> = {
      400: { code: "SCHEMA_VALIDATION_ERROR", message: "Invalid request format" },
      401: { code: "INVALID_API_KEY", message: "Invalid or missing API key" },
      402: { code: "RATE_LIMITED", message: "Insufficient credits" },
      403: { code: "CONTENT_FILTERED", message: "Content was filtered by moderation" },
      404: { code: "MODEL_NOT_FOUND", message: "Requested model not found" },
      429: { code: "RATE_LIMITED", message: "Rate limit exceeded" },
      500: { code: "SERVICE_UNAVAILABLE", message: "OpenRouter internal error" },
      502: { code: "SERVICE_UNAVAILABLE", message: "Model provider unavailable" },
      503: { code: "SERVICE_UNAVAILABLE", message: "Service temporarily unavailable" },
    };

    // Try to get more details from the response body
    let detailedMessage = "";
    try {
      const errorBody = (await response.json()) as OpenRouterApiError;
      detailedMessage = errorBody.error?.message ?? "";
    } catch {
      // Ignore parse errors
    }

    const mapped = statusMap[response.status] ?? {
      code: "UNKNOWN_ERROR" as OpenRouterErrorCode,
      message: `HTTP ${response.status}: ${response.statusText}`,
    };

    return {
      code: mapped.code,
      message: detailedMessage || mapped.message,
      status: response.status,
    };
  }

  /**
   * Handle unexpected errors during request execution.
   */
  private handleError(error: unknown): ChatCompletionResult<never> {
    // Handle abort/timeout
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        success: false,
        error: {
          code: "TIMEOUT",
          message: "Request timed out",
          status: 408,
        },
      };
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        success: false,
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Network error - unable to reach OpenRouter",
          status: 503,
        },
      };
    }

    // Handle unknown errors
    console.error("OpenRouter service error:", error);
    return {
      success: false,
      error: {
        code: "UNKNOWN_ERROR",
        message: error instanceof Error ? error.message : "An unexpected error occurred",
        status: 500,
      },
    };
  }

  /**
   * Sanitize message content to prevent issues with control characters.
   */
  private sanitizeMessage(content: string, maxLength: number = DEFAULT_MAX_MESSAGE_LENGTH): string {
    if (content.length > maxLength) {
      content = content.substring(0, maxLength);
    }
    // Remove null bytes and control characters (except newlines/tabs)
    // eslint-disable-next-line no-control-regex
    return content.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  }

  /**
   * Log errors with appropriate severity levels.
   */
  private logError(error: OpenRouterError): void {
    const message = `OpenRouter error [${error.code}]: ${error.message}`;
    if (error.status >= 500) {
      console.error(message);
    } else {
      console.warn(message);
    }
  }
}
