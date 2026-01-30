import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { OpenRouterService } from "./openrouter.service";
import type { ChatCompletionRequest } from "./openrouter.types";

// Create a testable version of the service by exposing private methods
class TestableOpenRouterService extends OpenRouterService {
  public testBuildRequestBody<T>(request: ChatCompletionRequest<T>): object {
    return this["buildRequestBody"](request);
  }

  public testSanitizeMessage(content: string, maxLength?: number): string {
    return this["sanitizeMessage"](content, maxLength);
  }

  public testParseStructuredResponse<T>(content: string) {
    return this["parseStructuredResponse"]<T>(content);
  }

  public testBuildRequestHeaders(): HeadersInit {
    return this["buildRequestHeaders"]();
  }
}

describe("OpenRouterService", () => {
  let service: TestableOpenRouterService;

  beforeEach(() => {
    service = new TestableOpenRouterService({ apiKey: "test-api-key" });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should use config values when provided", () => {
      // Arrange & Act
      const customService = new OpenRouterService({
        apiKey: "custom-key",
        defaultModel: "openai/gpt-4",
        siteName: "TestApp",
        siteUrl: "https://test.com",
        timeout: 60000,
      });

      // Assert
      expect(customService.isAvailable()).toBe(true);
      expect(customService.getDefaultModel()).toBe("openai/gpt-4");
    });

    it("should use default model when not specified", () => {
      // Arrange & Act
      const defaultService = new OpenRouterService({ apiKey: "test-key" });

      // Assert
      expect(defaultService.getDefaultModel()).toBe("anthropic/claude-3-haiku");
    });
  });

  describe("isAvailable", () => {
    it("should return true when API key is provided", () => {
      // Arrange
      const availableService = new OpenRouterService({ apiKey: "valid-key" });

      // Act & Assert
      expect(availableService.isAvailable()).toBe(true);
    });

    it("should return false when API key is empty", () => {
      // Arrange
      const unavailableService = new OpenRouterService({ apiKey: "" });

      // Act & Assert
      expect(unavailableService.isAvailable()).toBe(false);
    });
  });

  describe("getDefaultModel", () => {
    it("should return the configured default model", () => {
      // Arrange
      const customService = new OpenRouterService({
        apiKey: "key",
        defaultModel: "anthropic/claude-3.5-sonnet",
      });

      // Act & Assert
      expect(customService.getDefaultModel()).toBe("anthropic/claude-3.5-sonnet");
    });
  });

  describe("chatCompletion", () => {
    it("should return error when service is unavailable", async () => {
      // Arrange
      const unavailableService = new OpenRouterService({ apiKey: "" });

      // Act
      const result = await unavailableService.chatCompletion({
        messages: [{ role: "user", content: "Hello" }],
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_API_KEY");
      expect(result.error?.status).toBe(503);
    });

    it("should make successful request and return data", async () => {
      // Arrange
      const mockResponse = {
        choices: [{ message: { role: "assistant", content: "Hello there!" } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      // Act
      const result = await service.chatCompletion({
        messages: [{ role: "user", content: "Hello" }],
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe("Hello there!");
      expect(result.usage?.total_tokens).toBe(15);
    });

    it("should handle structured JSON response", async () => {
      // Arrange
      interface TestResponse {
        name: string;
        value: number;
      }

      const mockResponse = {
        choices: [{ message: { role: "assistant", content: '{"name":"test","value":42}' } }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      };

      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      // Act
      const result = await service.chatCompletion<TestResponse>({
        messages: [{ role: "user", content: "Give me data" }],
        responseFormat: {
          type: "json_schema",
          json_schema: {
            name: "test_response",
            strict: true,
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                value: { type: "number" },
              },
              required: ["name", "value"],
            },
          },
        },
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("test");
      expect(result.data?.value).toBe(42);
    });

    it("should handle rate limiting (429)", async () => {
      // Arrange
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        json: () => Promise.resolve({ error: { message: "Rate limit exceeded" } }),
      } as Response);

      // Act
      const result = await service.chatCompletion({
        messages: [{ role: "user", content: "Hello" }],
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("RATE_LIMITED");
      expect(result.error?.status).toBe(429);
    });

    it("should handle invalid API key (401)", async () => {
      // Arrange
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () => Promise.resolve({ error: { message: "Invalid API key" } }),
      } as Response);

      // Act
      const result = await service.chatCompletion({
        messages: [{ role: "user", content: "Hello" }],
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_API_KEY");
      expect(result.error?.status).toBe(401);
    });

    it("should handle model not found (404)", async () => {
      // Arrange
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: () => Promise.resolve({ error: { message: "Model not found" } }),
      } as Response);

      // Act
      const result = await service.chatCompletion({
        messages: [{ role: "user", content: "Hello" }],
        model: "nonexistent/model",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("MODEL_NOT_FOUND");
      expect(result.error?.status).toBe(404);
    });

    it("should handle service unavailable (503)", async () => {
      // Arrange
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        json: () => Promise.resolve({}),
      } as Response);

      // Act
      const result = await service.chatCompletion({
        messages: [{ role: "user", content: "Hello" }],
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("SERVICE_UNAVAILABLE");
      expect(result.error?.status).toBe(503);
    });

    it("should handle empty content in response", async () => {
      // Arrange
      const mockResponse = {
        choices: [{ message: { role: "assistant", content: "" } }],
      };

      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      // Act
      const result = await service.chatCompletion({
        messages: [{ role: "user", content: "Hello" }],
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("UNKNOWN_ERROR");
      expect(result.error?.message).toBe("No content in response");
    });

    it("should handle network errors", async () => {
      // Arrange
      vi.spyOn(global, "fetch").mockRejectedValueOnce(new TypeError("fetch failed"));

      // Act
      const result = await service.chatCompletion({
        messages: [{ role: "user", content: "Hello" }],
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("SERVICE_UNAVAILABLE");
      expect(result.error?.message).toContain("Network error");
    });

    it("should handle timeout", async () => {
      // Arrange
      const abortError = new DOMException("The operation was aborted", "AbortError");
      vi.spyOn(global, "fetch").mockRejectedValueOnce(abortError);

      // Act
      const result = await service.chatCompletion({
        messages: [{ role: "user", content: "Hello" }],
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("TIMEOUT");
      expect(result.error?.status).toBe(408);
    });
  });

  describe("buildRequestBody", () => {
    it("should build basic request body with messages and default model", () => {
      // Arrange
      const request: ChatCompletionRequest = {
        messages: [
          { role: "system", content: "You are helpful." },
          { role: "user", content: "Hello" },
        ],
      };

      // Act
      const body = service.testBuildRequestBody(request) as Record<string, unknown>;

      // Assert
      expect(body.model).toBe("anthropic/claude-3-haiku");
      expect(body.messages).toHaveLength(2);
    });

    it("should include custom model when specified", () => {
      // Arrange
      const request: ChatCompletionRequest = {
        messages: [{ role: "user", content: "Hello" }],
        model: "openai/gpt-4",
      };

      // Act
      const body = service.testBuildRequestBody(request) as Record<string, unknown>;

      // Assert
      expect(body.model).toBe("openai/gpt-4");
    });

    it("should include all parameters when provided", () => {
      // Arrange
      const request: ChatCompletionRequest = {
        messages: [{ role: "user", content: "Hello" }],
        parameters: {
          temperature: 0.5,
          max_tokens: 100,
          top_p: 0.9,
          frequency_penalty: 0.5,
          presence_penalty: 0.5,
          stop: ["END"],
        },
      };

      // Act
      const body = service.testBuildRequestBody(request) as Record<string, unknown>;

      // Assert
      expect(body.temperature).toBe(0.5);
      expect(body.max_tokens).toBe(100);
      expect(body.top_p).toBe(0.9);
      expect(body.frequency_penalty).toBe(0.5);
      expect(body.presence_penalty).toBe(0.5);
      expect(body.stop).toEqual(["END"]);
    });

    it("should include response_format when provided", () => {
      // Arrange
      const request: ChatCompletionRequest = {
        messages: [{ role: "user", content: "Hello" }],
        responseFormat: {
          type: "json_schema",
          json_schema: {
            name: "test_schema",
            strict: true,
            schema: { type: "object", properties: { name: { type: "string" } } },
          },
        },
      };

      // Act
      const body = service.testBuildRequestBody(request) as Record<string, unknown>;

      // Assert
      expect(body.response_format).toBeDefined();
      expect((body.response_format as { type: string }).type).toBe("json_schema");
    });

    it("should not include undefined parameters", () => {
      // Arrange
      const request: ChatCompletionRequest = {
        messages: [{ role: "user", content: "Hello" }],
        parameters: {
          temperature: 0.7,
        },
      };

      // Act
      const body = service.testBuildRequestBody(request) as Record<string, unknown>;

      // Assert
      expect(body.temperature).toBe(0.7);
      expect(body.max_tokens).toBeUndefined();
      expect(body.top_p).toBeUndefined();
    });
  });

  describe("sanitizeMessage", () => {
    it("should remove control characters", () => {
      // Arrange
      const content = "Hello\x00World\x08Test";

      // Act
      const result = service.testSanitizeMessage(content);

      // Assert
      expect(result).toBe("HelloWorldTest");
    });

    it("should preserve newlines and tabs", () => {
      // Arrange
      const content = "Hello\nWorld\tTest";

      // Act
      const result = service.testSanitizeMessage(content);

      // Assert
      expect(result).toBe("Hello\nWorld\tTest");
    });

    it("should truncate long messages", () => {
      // Arrange
      const content = "a".repeat(100);

      // Act
      const result = service.testSanitizeMessage(content, 50);

      // Assert
      expect(result.length).toBe(50);
    });

    it("should not modify normal content", () => {
      // Arrange
      const content = "Normal message with special chars: !@#$%^&*()";

      // Act
      const result = service.testSanitizeMessage(content);

      // Assert
      expect(result).toBe(content);
    });
  });

  describe("parseStructuredResponse", () => {
    it("should parse valid JSON", () => {
      // Arrange
      const content = '{"name":"test","value":42}';

      // Act
      const result = service.testParseStructuredResponse<{ name: string; value: number }>(content);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("test");
      expect(result.data?.value).toBe(42);
    });

    it("should extract JSON from markdown code block", () => {
      // Arrange
      const content = '```json\n{"name":"test"}\n```';

      // Act
      const result = service.testParseStructuredResponse<{ name: string }>(content);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("test");
    });

    it("should extract JSON from code block without language", () => {
      // Arrange
      const content = '```\n{"name":"test"}\n```';

      // Act
      const result = service.testParseStructuredResponse<{ name: string }>(content);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("test");
    });

    it("should extract JSON from surrounding text", () => {
      // Arrange
      const content = 'Here is the response:\n{"name":"test"}\nHope that helps!';

      // Act
      const result = service.testParseStructuredResponse<{ name: string }>(content);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("test");
    });

    it("should return error for invalid JSON", () => {
      // Arrange
      const content = '{"name": broken}';

      // Act
      const result = service.testParseStructuredResponse<{ name: string }>(content);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("PARSE_ERROR");
    });

    it("should return error for non-JSON content", () => {
      // Arrange
      const content = "This is just plain text without any JSON.";

      // Act
      const result = service.testParseStructuredResponse<{ name: string }>(content);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("PARSE_ERROR");
    });
  });

  describe("buildRequestHeaders", () => {
    it("should include all required headers", () => {
      // Arrange
      const customService = new TestableOpenRouterService({
        apiKey: "test-key",
        siteUrl: "https://example.com",
        siteName: "TestApp",
      });

      // Act
      const headers = customService.testBuildRequestHeaders() as Record<string, string>;

      // Assert
      expect(headers["Authorization"]).toBe("Bearer test-key");
      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["HTTP-Referer"]).toBe("https://example.com");
      expect(headers["X-Title"]).toBe("TestApp");
    });
  });
});
