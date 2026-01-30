# OpenRouter Service Implementation Plan

## 1. Service Description

The OpenRouter service is a TypeScript module that provides a clean abstraction for interacting with the OpenRouter.ai API. OpenRouter acts as a unified gateway to multiple LLM providers (OpenAI, Anthropic, Google, Meta, etc.), enabling access to various models through a single, consistent interface.

### Purpose

- Provide a reusable, type-safe client for OpenRouter API interactions
- Support chat completions with system and user messages
- Enable structured JSON responses via `response_format` (JSON schema)
- Handle authentication, error handling, and rate limiting gracefully
- Abstract away OpenRouter-specific details from consuming services

### Key Features

1. **Multi-model support**: Configure any model available on OpenRouter
2. **Structured outputs**: Request JSON responses conforming to a defined schema
3. **Configurable parameters**: Temperature, max tokens, top_p, etc.
4. **Robust error handling**: Typed errors with meaningful messages
5. **Security-first design**: API keys never exposed to clients

### File Location

```
src/lib/services/openrouter.service.ts
```

## 2. Constructor Description

### Constructor Signature

```typescript
constructor(config?: OpenRouterConfig)
```

### Configuration Interface

```typescript
interface OpenRouterConfig {
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
```

### Constructor Behavior

1. **API Key Resolution**: Check `config.apiKey` first, then fall back to `import.meta.env.OPENROUTER_API_KEY`
2. **Default Model**: Set to `anthropic/claude-3-haiku` if not specified (fast and cost-effective)
3. **Site Headers**: Use `config.siteUrl` or `import.meta.env.SITE_URL` for HTTP-Referer
4. **Validation**: Throw an error at construction time if no API key is available

### Example Usage

```typescript
// Using environment variables
const service = new OpenRouterService();

// Using explicit configuration
const service = new OpenRouterService({
  apiKey: 'sk-or-v1-...',
  defaultModel: 'anthropic/claude-3.5-sonnet',
  siteName: 'FretNinja',
  siteUrl: 'https://fretninja.com',
});
```

## 3. Public Methods and Fields

### 3.1 `chatCompletion<T>(request: ChatCompletionRequest<T>): Promise<ChatCompletionResult<T>>`

The primary method for interacting with LLMs. Supports both free-form text and structured JSON responses.

#### Request Interface

```typescript
interface ChatCompletionRequest<T = string> {
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

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ModelParameters {
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

interface ResponseFormat<T> {
  type: 'json_schema';
  json_schema: {
    name: string;
    strict: true;
    schema: JsonSchema;
  };
}
```

#### Result Interface

```typescript
interface ChatCompletionResult<T = string> {
  success: boolean;
  data?: T;
  error?: OpenRouterError;
  usage?: TokenUsage;
}

interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenRouterError {
  code: OpenRouterErrorCode;
  message: string;
  status: number;
}

type OpenRouterErrorCode =
  | 'INVALID_API_KEY'
  | 'RATE_LIMITED'
  | 'MODEL_NOT_FOUND'
  | 'CONTEXT_LENGTH_EXCEEDED'
  | 'CONTENT_FILTERED'
  | 'SERVICE_UNAVAILABLE'
  | 'TIMEOUT'
  | 'PARSE_ERROR'
  | 'SCHEMA_VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';
```

#### Usage Examples

**Simple text completion:**

```typescript
const result = await service.chatCompletion({
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is the capital of France?' },
  ],
});

if (result.success) {
  console.log(result.data); // "The capital of France is Paris."
}
```

**Structured JSON response:**

```typescript
interface HintResponse {
  hint: string;
  related_positions: Array<{ fret: number; string: number; note: string }>;
  memorization_tip: string;
}

const result = await service.chatCompletion<HintResponse>({
  messages: [
    { role: 'system', content: 'You are a guitar teacher. Respond in JSON format.' },
    { role: 'user', content: 'Give me a hint for finding the note C on the fretboard.' },
  ],
  responseFormat: {
    type: 'json_schema',
    json_schema: {
      name: 'guitar_hint',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          hint: { type: 'string' },
          related_positions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                fret: { type: 'number' },
                string: { type: 'number' },
                note: { type: 'string' },
              },
              required: ['fret', 'string', 'note'],
            },
          },
          memorization_tip: { type: 'string' },
        },
        required: ['hint', 'related_positions', 'memorization_tip'],
      },
    },
  },
  parameters: {
    temperature: 0.7,
    max_tokens: 500,
  },
});

if (result.success && result.data) {
  console.log(result.data.hint);
  console.log(result.data.related_positions);
}
```

### 3.2 `isAvailable(): boolean`

Check if the service is properly configured and ready to use.

```typescript
const service = new OpenRouterService();
if (!service.isAvailable()) {
  console.warn('OpenRouter service not configured');
}
```

### 3.3 `getDefaultModel(): string`

Returns the currently configured default model.

```typescript
console.log(service.getDefaultModel()); // "anthropic/claude-3-haiku"
```

## 4. Private Methods and Fields

### 4.1 Private Fields

```typescript
private readonly apiKey: string;
private readonly baseUrl: string;
private readonly defaultModel: string;
private readonly siteUrl: string;
private readonly siteName: string;
private readonly timeout: number;
```

### 4.2 `private buildRequestHeaders(): HeadersInit`

Constructs the HTTP headers required for OpenRouter API requests.

```typescript
private buildRequestHeaders(): HeadersInit {
  return {
    'Authorization': `Bearer ${this.apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': this.siteUrl,
    'X-Title': this.siteName,
  };
}
```

### 4.3 `private buildRequestBody<T>(request: ChatCompletionRequest<T>): object`

Transforms the typed request into the OpenRouter API payload format.

```typescript
private buildRequestBody<T>(request: ChatCompletionRequest<T>): object {
  const body: Record<string, unknown> = {
    model: request.model ?? this.defaultModel,
    messages: request.messages,
  };

  // Add optional parameters
  if (request.parameters) {
    if (request.parameters.temperature !== undefined) {
      body.temperature = request.parameters.temperature;
    }
    if (request.parameters.max_tokens !== undefined) {
      body.max_tokens = request.parameters.max_tokens;
    }
    if (request.parameters.top_p !== undefined) {
      body.top_p = request.parameters.top_p;
    }
    if (request.parameters.frequency_penalty !== undefined) {
      body.frequency_penalty = request.parameters.frequency_penalty;
    }
    if (request.parameters.presence_penalty !== undefined) {
      body.presence_penalty = request.parameters.presence_penalty;
    }
    if (request.parameters.stop !== undefined) {
      body.stop = request.parameters.stop;
    }
  }

  // Add response format for structured outputs
  if (request.responseFormat) {
    body.response_format = request.responseFormat;
  }

  return body;
}
```

### 4.4 `private async executeRequest(body: object): Promise<Response>`

Performs the HTTP request to the OpenRouter API with timeout handling.

```typescript
private async executeRequest(body: object): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), this.timeout);

  try {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildRequestHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### 4.5 `private parseApiResponse<T>(response: Response, hasSchema: boolean): Promise<ChatCompletionResult<T>>`

Parses the OpenRouter API response and extracts the completion content.

```typescript
private async parseApiResponse<T>(
  response: Response,
  hasSchema: boolean
): Promise<ChatCompletionResult<T>> {
  if (!response.ok) {
    return { success: false, error: this.mapHttpError(response) };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'No content in response',
        status: 500,
      },
    };
  }

  const usage: TokenUsage | undefined = data.usage ? {
    prompt_tokens: data.usage.prompt_tokens,
    completion_tokens: data.usage.completion_tokens,
    total_tokens: data.usage.total_tokens,
  } : undefined;

  if (hasSchema) {
    return this.parseStructuredResponse<T>(content, usage);
  }

  return {
    success: true,
    data: content as T,
    usage,
  };
}
```

### 4.6 `private parseStructuredResponse<T>(content: string, usage?: TokenUsage): ChatCompletionResult<T>`

Parses and validates JSON responses against the expected schema.

```typescript
private parseStructuredResponse<T>(
  content: string,
  usage?: TokenUsage
): ChatCompletionResult<T> {
  try {
    // Try to extract JSON from the content (handles markdown code blocks)
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) ||
                      content.match(/(\{[\s\S]*\})/);

    const jsonString = jsonMatch ? jsonMatch[1].trim() : content;
    const parsed = JSON.parse(jsonString) as T;

    return { success: true, data: parsed, usage };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'PARSE_ERROR',
        message: `Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 500,
      },
      usage,
    };
  }
}
```

### 4.7 `private mapHttpError(response: Response): OpenRouterError`

Maps HTTP status codes to typed error objects.

```typescript
private mapHttpError(response: Response): OpenRouterError {
  const statusMap: Record<number, { code: OpenRouterErrorCode; message: string }> = {
    400: { code: 'SCHEMA_VALIDATION_ERROR', message: 'Invalid request format' },
    401: { code: 'INVALID_API_KEY', message: 'Invalid or missing API key' },
    402: { code: 'RATE_LIMITED', message: 'Insufficient credits' },
    403: { code: 'CONTENT_FILTERED', message: 'Content was filtered by moderation' },
    404: { code: 'MODEL_NOT_FOUND', message: 'Requested model not found' },
    429: { code: 'RATE_LIMITED', message: 'Rate limit exceeded' },
    500: { code: 'SERVICE_UNAVAILABLE', message: 'OpenRouter internal error' },
    502: { code: 'SERVICE_UNAVAILABLE', message: 'Model provider unavailable' },
    503: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable' },
  };

  const mapped = statusMap[response.status] ?? {
    code: 'UNKNOWN_ERROR' as OpenRouterErrorCode,
    message: `HTTP ${response.status}: ${response.statusText}`,
  };

  return { ...mapped, status: response.status };
}
```

## 5. Error Handling

### 5.1 Error Categories

| Category | Codes | Handling Strategy |
|----------|-------|-------------------|
| **Authentication** | `INVALID_API_KEY` | Log error, return 503 to client |
| **Rate Limiting** | `RATE_LIMITED` | Return 429 with retry-after info |
| **Model Issues** | `MODEL_NOT_FOUND`, `CONTEXT_LENGTH_EXCEEDED` | Log warning, return 400/503 |
| **Content** | `CONTENT_FILTERED` | Return 400 with explanation |
| **Infrastructure** | `SERVICE_UNAVAILABLE`, `TIMEOUT` | Retry with backoff, then 503 |
| **Parsing** | `PARSE_ERROR`, `SCHEMA_VALIDATION_ERROR` | Return 500, log for debugging |

### 5.2 Error Response Format

```typescript
interface OpenRouterError {
  code: OpenRouterErrorCode;
  message: string;
  status: number;
}
```

### 5.3 Error Handling Implementation

```typescript
private handleError(error: unknown): ChatCompletionResult<never> {
  // Handle abort/timeout
  if (error instanceof DOMException && error.name === 'AbortError') {
    return {
      success: false,
      error: {
        code: 'TIMEOUT',
        message: 'Request timed out',
        status: 408,
      },
    };
  }

  // Handle network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Network error - unable to reach OpenRouter',
        status: 503,
      },
    };
  }

  // Handle unknown errors
  console.error('OpenRouter service error:', error);
  return {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      status: 500,
    },
  };
}
```

### 5.4 Logging Strategy

- **Error level**: API key issues, service unavailability
- **Warning level**: Rate limiting, content filtering
- **Info level**: Successful completions (optional, for debugging)
- **Debug level**: Full request/response payloads (development only)

```typescript
private logError(error: OpenRouterError, context?: string): void {
  const message = context
    ? `OpenRouter error [${error.code}] in ${context}: ${error.message}`
    : `OpenRouter error [${error.code}]: ${error.message}`;

  if (error.status >= 500) {
    console.error(message);
  } else {
    console.warn(message);
  }
}
```

## 6. Security Considerations

### 6.1 API Key Protection

1. **Never expose to client**: API keys must remain server-side only
2. **Environment variables**: Store in `.env` files, never commit to VCS
3. **Validation**: Fail fast if API key is missing at service construction

```typescript
constructor(config?: OpenRouterConfig) {
  this.apiKey = config?.apiKey ?? import.meta.env.OPENROUTER_API_KEY ?? '';

  if (!this.apiKey) {
    throw new Error('OpenRouter API key is required. Set OPENROUTER_API_KEY environment variable.');
  }
}
```

### 6.2 Input Sanitization

1. **Prompt injection mitigation**: Clearly separate system and user content
2. **Content length limits**: Validate message lengths before sending
3. **Character filtering**: Remove or escape potentially harmful characters

```typescript
private sanitizeMessage(content: string, maxLength: number = 10000): string {
  // Truncate if too long
  if (content.length > maxLength) {
    content = content.substring(0, maxLength);
  }

  // Remove null bytes and control characters (except newlines/tabs)
  return content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}
```

### 6.3 Rate Limiting

Implement application-level rate limiting to prevent abuse:

```typescript
interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
}

// Track request counts per user/session
private checkRateLimit(userId: string): boolean {
  // Implementation depends on chosen storage (in-memory, Redis, database)
}
```

### 6.4 Response Validation

1. **JSON Schema validation**: Validate structured responses match expected schema
2. **Content filtering**: Check for inappropriate content in responses
3. **Size limits**: Ensure responses don't exceed expected sizes

### 6.5 Secure Headers

```typescript
private buildRequestHeaders(): HeadersInit {
  return {
    'Authorization': `Bearer ${this.apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': this.siteUrl,  // Required by OpenRouter TOS
    'X-Title': this.siteName,       // Helps with analytics
  };
}
```

## 7. Step-by-Step Implementation Plan

### Step 1: Create Type Definitions

Create file: `src/lib/services/openrouter.types.ts`

```typescript
/**
 * OpenRouter Service Type Definitions
 */

// Configuration
export interface OpenRouterConfig {
  apiKey?: string;
  defaultModel?: string;
  baseUrl?: string;
  siteUrl?: string;
  siteName?: string;
  timeout?: number;
}

// Messages
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Model Parameters
export interface ModelParameters {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
}

// JSON Schema types
export interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: string[];
  description?: string;
  [key: string]: unknown;
}

export interface ResponseFormat<T = unknown> {
  type: 'json_schema';
  json_schema: {
    name: string;
    strict: true;
    schema: JsonSchema;
  };
}

// Request
export interface ChatCompletionRequest<T = string> {
  messages: ChatMessage[];
  model?: string;
  parameters?: ModelParameters;
  responseFormat?: ResponseFormat<T>;
}

// Response
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export type OpenRouterErrorCode =
  | 'INVALID_API_KEY'
  | 'RATE_LIMITED'
  | 'MODEL_NOT_FOUND'
  | 'CONTEXT_LENGTH_EXCEEDED'
  | 'CONTENT_FILTERED'
  | 'SERVICE_UNAVAILABLE'
  | 'TIMEOUT'
  | 'PARSE_ERROR'
  | 'SCHEMA_VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';

export interface OpenRouterError {
  code: OpenRouterErrorCode;
  message: string;
  status: number;
}

export interface ChatCompletionResult<T = string> {
  success: boolean;
  data?: T;
  error?: OpenRouterError;
  usage?: TokenUsage;
}
```

### Step 2: Implement the OpenRouter Service

Create file: `src/lib/services/openrouter.service.ts`

```typescript
import type {
  OpenRouterConfig,
  ChatMessage,
  ModelParameters,
  ResponseFormat,
  ChatCompletionRequest,
  ChatCompletionResult,
  OpenRouterError,
  OpenRouterErrorCode,
  TokenUsage,
} from './openrouter.types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'anthropic/claude-3-haiku';
const DEFAULT_TIMEOUT = 30000;

export class OpenRouterService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly siteUrl: string;
  private readonly siteName: string;
  private readonly timeout: number;

  constructor(config?: OpenRouterConfig) {
    this.apiKey = config?.apiKey ?? import.meta.env.OPENROUTER_API_KEY ?? '';
    this.baseUrl = config?.baseUrl ?? OPENROUTER_API_URL;
    this.defaultModel = config?.defaultModel ?? DEFAULT_MODEL;
    this.siteUrl = config?.siteUrl ?? import.meta.env.SITE_URL ?? 'https://fretninja.com';
    this.siteName = config?.siteName ?? 'FretNinja';
    this.timeout = config?.timeout ?? DEFAULT_TIMEOUT;
  }

  /**
   * Check if the service is properly configured.
   */
  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Get the configured default model.
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }

  /**
   * Send a chat completion request to OpenRouter.
   */
  async chatCompletion<T = string>(
    request: ChatCompletionRequest<T>
  ): Promise<ChatCompletionResult<T>> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'OpenRouter API key not configured',
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

  private buildRequestHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': this.siteUrl,
      'X-Title': this.siteName,
    };
  }

  private buildRequestBody<T>(request: ChatCompletionRequest<T>): object {
    const body: Record<string, unknown> = {
      model: request.model ?? this.defaultModel,
      messages: request.messages.map(msg => ({
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

  private async executeRequest(body: object): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      return await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.buildRequestHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async parseApiResponse<T>(
    response: Response,
    hasSchema: boolean
  ): Promise<ChatCompletionResult<T>> {
    if (!response.ok) {
      const error = await this.mapHttpError(response);
      this.logError(error);
      return { success: false, error };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'No content in response',
          status: 500,
        },
      };
    }

    const usage: TokenUsage | undefined = data.usage ? {
      prompt_tokens: data.usage.prompt_tokens,
      completion_tokens: data.usage.completion_tokens,
      total_tokens: data.usage.total_tokens,
    } : undefined;

    if (hasSchema) {
      return this.parseStructuredResponse<T>(content, usage);
    }

    return { success: true, data: content as T, usage };
  }

  private parseStructuredResponse<T>(
    content: string,
    usage?: TokenUsage
  ): ChatCompletionResult<T> {
    try {
      // Handle markdown code blocks and raw JSON
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) ||
                        content.match(/(\{[\s\S]*\})/);

      const jsonString = jsonMatch ? jsonMatch[1].trim() : content;
      const parsed = JSON.parse(jsonString) as T;

      return { success: true, data: parsed, usage };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: `Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`,
          status: 500,
        },
        usage,
      };
    }
  }

  private async mapHttpError(response: Response): Promise<OpenRouterError> {
    const statusMap: Record<number, { code: OpenRouterErrorCode; message: string }> = {
      400: { code: 'SCHEMA_VALIDATION_ERROR', message: 'Invalid request format' },
      401: { code: 'INVALID_API_KEY', message: 'Invalid or missing API key' },
      402: { code: 'RATE_LIMITED', message: 'Insufficient credits' },
      403: { code: 'CONTENT_FILTERED', message: 'Content was filtered by moderation' },
      404: { code: 'MODEL_NOT_FOUND', message: 'Requested model not found' },
      429: { code: 'RATE_LIMITED', message: 'Rate limit exceeded' },
      500: { code: 'SERVICE_UNAVAILABLE', message: 'OpenRouter internal error' },
      502: { code: 'SERVICE_UNAVAILABLE', message: 'Model provider unavailable' },
      503: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable' },
    };

    // Try to get more details from the response body
    let detailedMessage = '';
    try {
      const errorBody = await response.json();
      detailedMessage = errorBody.error?.message ?? '';
    } catch {
      // Ignore parse errors
    }

    const mapped = statusMap[response.status] ?? {
      code: 'UNKNOWN_ERROR' as OpenRouterErrorCode,
      message: `HTTP ${response.status}: ${response.statusText}`,
    };

    return {
      code: mapped.code,
      message: detailedMessage || mapped.message,
      status: response.status,
    };
  }

  private handleError(error: unknown): ChatCompletionResult<never> {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        success: false,
        error: {
          code: 'TIMEOUT',
          message: 'Request timed out',
          status: 408,
        },
      };
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Network error - unable to reach OpenRouter',
          status: 503,
        },
      };
    }

    console.error('OpenRouter service error:', error);
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        status: 500,
      },
    };
  }

  private sanitizeMessage(content: string, maxLength: number = 32000): string {
    if (content.length > maxLength) {
      content = content.substring(0, maxLength);
    }
    return content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  }

  private logError(error: OpenRouterError): void {
    const message = `OpenRouter error [${error.code}]: ${error.message}`;
    if (error.status >= 500) {
      console.error(message);
    } else {
      console.warn(message);
    }
  }
}
```

### Step 3: Create Unit Tests

Create file: `src/lib/services/openrouter.service.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenRouterService } from './openrouter.service';

// Mock import.meta.env
vi.stubGlobal('import', {
  meta: {
    env: {
      OPENROUTER_API_KEY: 'test-api-key',
      SITE_URL: 'https://test.com',
    },
  },
});

describe('OpenRouterService', () => {
  describe('constructor', () => {
    it('should use config values when provided', () => {
      const service = new OpenRouterService({
        apiKey: 'custom-key',
        defaultModel: 'openai/gpt-4',
      });

      expect(service.isAvailable()).toBe(true);
      expect(service.getDefaultModel()).toBe('openai/gpt-4');
    });

    it('should fall back to environment variables', () => {
      const service = new OpenRouterService();

      expect(service.isAvailable()).toBe(true);
      expect(service.getDefaultModel()).toBe('anthropic/claude-3-haiku');
    });
  });

  describe('isAvailable', () => {
    it('should return false when API key is missing', () => {
      const service = new OpenRouterService({ apiKey: '' });
      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('chatCompletion', () => {
    let service: OpenRouterService;

    beforeEach(() => {
      service = new OpenRouterService({ apiKey: 'test-key' });
    });

    it('should return error when service is unavailable', async () => {
      const unavailableService = new OpenRouterService({ apiKey: '' });

      const result = await unavailableService.chatCompletion({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_API_KEY');
    });

    // Add more integration tests with mocked fetch...
  });
});
```

### Step 4: Update Environment Variables

Add to `.env`:

```env
# OpenRouter API Configuration
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
SITE_URL=https://fretninja.com
```

Add to `.env.example`:

```env
# OpenRouter API Configuration
OPENROUTER_API_KEY=
SITE_URL=http://localhost:4321
```

### Step 5: Refactor AIService to Use OpenRouterService

Update `src/lib/services/ai.service.ts` to use the new OpenRouterService:

```typescript
import { OpenRouterService } from './openrouter.service';
import type { ChatCompletionRequest } from './openrouter.types';
import type { AIHintCommand, AIHintResponseDTO } from '../../types';

export class AIService {
  private openrouter: OpenRouterService;

  constructor() {
    this.openrouter = new OpenRouterService();
  }

  async generateHint(command: AIHintCommand): Promise<ServiceResult<AIHintResponseDTO>> {
    if (!this.openrouter.isAvailable()) {
      return {
        error: { status: 503, body: { code: 'AI_UNAVAILABLE', message: 'AI service not configured' } },
      };
    }

    const result = await this.openrouter.chatCompletion<AIHintResponseDTO>({
      messages: [
        { role: 'system', content: this.getHintSystemPrompt() },
        { role: 'user', content: this.buildHintPrompt(command) },
      ],
      parameters: { temperature: 0.7, max_tokens: 500 },
      responseFormat: {
        type: 'json_schema',
        json_schema: {
          name: 'guitar_hint',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              hint: { type: 'string' },
              related_positions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    fret: { type: 'number' },
                    string: { type: 'number' },
                    note: { type: 'string' },
                  },
                  required: ['fret', 'string', 'note'],
                },
              },
              memorization_tip: { type: 'string' },
            },
            required: ['hint', 'related_positions', 'memorization_tip'],
          },
        },
      },
    });

    if (!result.success) {
      return this.mapOpenRouterError(result.error!);
    }

    return { data: result.data! };
  }

  private mapOpenRouterError(error: OpenRouterError): ServiceResult<never> {
    const statusMap: Record<string, number> = {
      RATE_LIMITED: 429,
      INVALID_API_KEY: 503,
      SERVICE_UNAVAILABLE: 503,
      TIMEOUT: 503,
    };

    return {
      error: {
        status: statusMap[error.code] ?? 500,
        body: {
          code: error.code === 'RATE_LIMITED' ? 'RATE_LIMITED' : 'AI_UNAVAILABLE',
          message: error.message,
        },
      },
    };
  }

  // ... rest of the methods remain the same
}
```

### Step 6: Export from Services Index

Create or update `src/lib/services/index.ts`:

```typescript
export { OpenRouterService } from './openrouter.service';
export type {
  OpenRouterConfig,
  ChatMessage,
  ModelParameters,
  ResponseFormat,
  ChatCompletionRequest,
  ChatCompletionResult,
  OpenRouterError,
  OpenRouterErrorCode,
  TokenUsage,
} from './openrouter.types';

export { AIService } from './ai.service';
// ... other exports
```

### Step 7: Testing Checklist

- [ ] Service initializes with environment variables
- [ ] Service initializes with explicit configuration
- [ ] `isAvailable()` returns correct status
- [ ] Simple text completion works
- [ ] Structured JSON response works with valid schema
- [ ] Invalid JSON response returns PARSE_ERROR
- [ ] Timeout is handled correctly
- [ ] Rate limiting (429) returns RATE_LIMITED error
- [ ] Invalid API key (401) returns INVALID_API_KEY error
- [ ] Network errors are handled gracefully
- [ ] Model not found (404) returns MODEL_NOT_FOUND error
- [ ] Token usage is returned when available
- [ ] Messages are sanitized (control characters removed)
- [ ] Long messages are truncated

### Step 8: Documentation

Add inline JSDoc comments to all public methods and update any API documentation to reflect the new service structure.

---

## Appendix: OpenRouter API Reference

### Chat Completions Endpoint

**URL**: `POST https://openrouter.ai/api/v1/chat/completions`

**Required Headers**:
- `Authorization: Bearer <API_KEY>`
- `Content-Type: application/json`
- `HTTP-Referer: <YOUR_SITE_URL>` (required by TOS)
- `X-Title: <YOUR_SITE_NAME>` (optional, for analytics)

**Request Body**:
```json
{
  "model": "anthropic/claude-3-haiku",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ],
  "temperature": 0.7,
  "max_tokens": 500,
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "response_schema",
      "strict": true,
      "schema": { ... }
    }
  }
}
```

**Response Body**:
```json
{
  "id": "gen-...",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 50,
    "total_tokens": 150
  }
}
```

### Available Models (Recommended)

| Model | Use Case | Cost |
|-------|----------|------|
| `anthropic/claude-3-haiku` | Fast, cost-effective | Low |
| `anthropic/claude-3.5-sonnet` | Balanced performance | Medium |
| `anthropic/claude-3-opus` | Complex reasoning | High |
| `openai/gpt-4-turbo` | General purpose | Medium |
| `openai/gpt-4o` | Multimodal | Medium |
| `google/gemini-pro` | General purpose | Low |
