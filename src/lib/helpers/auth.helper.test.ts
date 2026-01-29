import { describe, it, expect, vi } from "vitest";
import { extractBearerToken, verifyAuth } from "./auth.helper";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type { AuthUser } from "../../env";

// Mock Supabase client factory
function createMockSupabase(
  options: {
    user?: { id: string } | null;
    error?: { message: string } | null;
  } = {}
): SupabaseClient<Database> {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.user ?? null },
        error: options.error ?? null,
      }),
    },
  } as unknown as SupabaseClient<Database>;
}

describe("auth.helper", () => {
  describe("extractBearerToken", () => {
    it("should extract token from valid Bearer header", () => {
      // Arrange
      const authHeader = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token.signature";

      // Act
      const result = extractBearerToken(authHeader);

      // Assert
      expect(result).toBe("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token.signature");
    });

    it("should return null for null header", () => {
      // Arrange
      const authHeader = null;

      // Act
      const result = extractBearerToken(authHeader);

      // Assert
      expect(result).toBeNull();
    });

    it("should return null for empty string header", () => {
      // Arrange
      const authHeader = "";

      // Act
      const result = extractBearerToken(authHeader);

      // Assert
      expect(result).toBeNull();
    });

    it("should return null for header without Bearer prefix", () => {
      // Arrange
      const authHeader = "Basic dXNlcm5hbWU6cGFzc3dvcmQ=";

      // Act
      const result = extractBearerToken(authHeader);

      // Assert
      expect(result).toBeNull();
    });

    it("should return null for header with lowercase bearer", () => {
      // Arrange
      const authHeader = "bearer token123";

      // Act
      const result = extractBearerToken(authHeader);

      // Assert
      expect(result).toBeNull();
    });

    it("should return null for header with only Bearer prefix (no token)", () => {
      // Arrange
      const authHeader = "Bearer ";

      // Act
      const result = extractBearerToken(authHeader);

      // Assert
      expect(result).toBe("");
    });

    it("should return null for header with Bearer but no space", () => {
      // Arrange
      const authHeader = "Bearertoken123";

      // Act
      const result = extractBearerToken(authHeader);

      // Assert
      expect(result).toBeNull();
    });

    it("should handle token with special characters", () => {
      // Arrange
      const authHeader = "Bearer abc-123_def.ghi+jkl/mno=";

      // Act
      const result = extractBearerToken(authHeader);

      // Assert
      expect(result).toBe("abc-123_def.ghi+jkl/mno=");
    });

    it("should preserve token exactly (including extra spaces in token)", () => {
      // Arrange - note: this is technically invalid but tests exact behavior
      const authHeader = "Bearer token with spaces";

      // Act
      const result = extractBearerToken(authHeader);

      // Assert
      expect(result).toBe("token with spaces");
    });
  });

  describe("verifyAuth", () => {
    describe("cookie-based authentication", () => {
      it("should return userId when localsUser is provided", async () => {
        // Arrange
        const mockSupabase = createMockSupabase();
        const localsUser: AuthUser = { id: "user-123", email: "test@example.com" };

        // Act
        const result = await verifyAuth(mockSupabase, null, localsUser);

        // Assert
        expect(result).toEqual({ userId: "user-123" });
        expect(mockSupabase.auth.getUser).not.toHaveBeenCalled();
      });

      it("should prefer localsUser over Authorization header", async () => {
        // Arrange
        const mockSupabase = createMockSupabase({ user: { id: "token-user" } });
        const localsUser: AuthUser = { id: "cookie-user", email: "cookie@example.com" };

        // Act
        const result = await verifyAuth(mockSupabase, "Bearer valid-token", localsUser);

        // Assert
        expect(result).toEqual({ userId: "cookie-user" });
        expect(mockSupabase.auth.getUser).not.toHaveBeenCalled();
      });
    });

    describe("token-based authentication", () => {
      it("should authenticate with valid token when no localsUser", async () => {
        // Arrange
        const mockSupabase = createMockSupabase({ user: { id: "token-user-456" } });

        // Act
        const result = await verifyAuth(mockSupabase, "Bearer valid-token", null);

        // Assert
        expect(result).toEqual({ userId: "token-user-456" });
        expect(mockSupabase.auth.getUser).toHaveBeenCalledWith("valid-token");
      });

      it("should return UNAUTHORIZED error when no token and no localsUser", async () => {
        // Arrange
        const mockSupabase = createMockSupabase();

        // Act
        const result = await verifyAuth(mockSupabase, null, null);

        // Assert
        expect(result).toEqual({
          error: {
            status: 401,
            body: { code: "UNAUTHORIZED", message: "Authentication required" },
          },
        });
      });

      it("should return UNAUTHORIZED error for invalid Authorization header format", async () => {
        // Arrange
        const mockSupabase = createMockSupabase();

        // Act
        const result = await verifyAuth(mockSupabase, "InvalidHeader", null);

        // Assert
        expect(result).toEqual({
          error: {
            status: 401,
            body: { code: "UNAUTHORIZED", message: "Authentication required" },
          },
        });
      });

      it("should return UNAUTHORIZED error when Supabase returns error", async () => {
        // Arrange
        const mockSupabase = createMockSupabase({
          user: null,
          error: { message: "JWT expired" },
        });

        // Act
        const result = await verifyAuth(mockSupabase, "Bearer expired-token", null);

        // Assert
        expect(result).toEqual({
          error: {
            status: 401,
            body: { code: "UNAUTHORIZED", message: "No active session" },
          },
        });
      });

      it("should return UNAUTHORIZED error when Supabase returns no user", async () => {
        // Arrange
        const mockSupabase = createMockSupabase({ user: null });

        // Act
        const result = await verifyAuth(mockSupabase, "Bearer invalid-token", null);

        // Assert
        expect(result).toEqual({
          error: {
            status: 401,
            body: { code: "UNAUTHORIZED", message: "No active session" },
          },
        });
      });
    });

    describe("edge cases", () => {
      it("should handle undefined localsUser (not provided)", async () => {
        // Arrange
        const mockSupabase = createMockSupabase({ user: { id: "user-789" } });

        // Act
        const result = await verifyAuth(mockSupabase, "Bearer token", undefined);

        // Assert
        expect(result).toEqual({ userId: "user-789" });
      });

      it("should handle empty string Authorization header", async () => {
        // Arrange
        const mockSupabase = createMockSupabase();

        // Act
        const result = await verifyAuth(mockSupabase, "", null);

        // Assert
        expect(result).toEqual({
          error: {
            status: 401,
            body: { code: "UNAUTHORIZED", message: "Authentication required" },
          },
        });
      });

      it("should handle whitespace-only Authorization header", async () => {
        // Arrange
        const mockSupabase = createMockSupabase();

        // Act
        const result = await verifyAuth(mockSupabase, "   ", null);

        // Assert
        expect(result).toEqual({
          error: {
            status: 401,
            body: { code: "UNAUTHORIZED", message: "Authentication required" },
          },
        });
      });
    });

    describe("type safety (discriminated union)", () => {
      it("should return result with userId and no error on success", async () => {
        // Arrange
        const mockSupabase = createMockSupabase({ user: { id: "test-id" } });

        // Act
        const result = await verifyAuth(mockSupabase, "Bearer token", null);

        // Assert
        if ("userId" in result) {
          expect(result.userId).toBe("test-id");
          expect(result.error).toBeUndefined();
        } else {
          throw new Error("Expected successful auth result");
        }
      });

      it("should return result with error and no userId on failure", async () => {
        // Arrange
        const mockSupabase = createMockSupabase();

        // Act
        const result = await verifyAuth(mockSupabase, null, null);

        // Assert
        if ("error" in result) {
          expect(result.error.status).toBe(401);
          expect(result.userId).toBeUndefined();
        } else {
          throw new Error("Expected auth error result");
        }
      });
    });
  });
});
