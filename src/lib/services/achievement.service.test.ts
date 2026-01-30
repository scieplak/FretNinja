import { describe, it, expect, beforeEach } from "vitest";
import { AchievementService } from "./achievement.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type { ProfileEntity } from "../../types";

// Create a testable version of the service by exposing private methods
class TestableAchievementService extends AchievementService {
  public testCalculateProgress(criteria: Record<string, unknown>, profile: ProfileEntity) {
    return this["calculateProgress"](criteria, profile);
  }
}

// Factory for creating test profile data
function createMockProfile(overrides: Partial<ProfileEntity> = {}): ProfileEntity {
  return {
    id: "test-user-id",
    email: "test@example.com",
    display_name: null,
    current_streak: 0,
    longest_streak: 0,
    last_activity_date: null,
    find_note_count: 0,
    name_note_count: 0,
    mark_chord_count: 0,
    recognize_interval_count: 0,
    fretboard_range: 12,
    show_note_names: true,
    tutorial_completed_modes: [],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("AchievementService", () => {
  let service: TestableAchievementService;
  let mockSupabase: SupabaseClient<Database>;

  beforeEach(() => {
    mockSupabase = {} as SupabaseClient<Database>;
    service = new TestableAchievementService(mockSupabase);
  });

  describe("calculateProgress", () => {
    describe("total_quizzes criteria", () => {
      it("should calculate progress for total quizzes achievement", () => {
        // Arrange
        const criteria = { type: "total_quizzes", count: 100 };
        const profile = createMockProfile({
          find_note_count: 10,
          name_note_count: 15,
          mark_chord_count: 5,
          recognize_interval_count: 20,
        });

        // Act
        const result = service.testCalculateProgress(criteria, profile);

        // Assert
        expect(result.current).toBe(50);
        expect(result.target).toBe(100);
        expect(result.percentage).toBe(50);
      });

      it("should cap percentage at 100% when target exceeded", () => {
        // Arrange
        const criteria = { type: "total_quizzes", count: 10 };
        const profile = createMockProfile({
          find_note_count: 10,
          name_note_count: 10,
          mark_chord_count: 5,
          recognize_interval_count: 5,
        });

        // Act
        const result = service.testCalculateProgress(criteria, profile);

        // Assert
        expect(result.current).toBe(30);
        expect(result.target).toBe(10);
        expect(result.percentage).toBe(100);
      });

      it("should handle zero quiz counts", () => {
        // Arrange
        const criteria = { type: "total_quizzes", count: 50 };
        const profile = createMockProfile();

        // Act
        const result = service.testCalculateProgress(criteria, profile);

        // Assert
        expect(result.current).toBe(0);
        expect(result.target).toBe(50);
        expect(result.percentage).toBe(0);
      });
    });

    describe("perfect_score criteria", () => {
      it("should always show 0/1 progress for perfect score achievement", () => {
        // Arrange
        const criteria = { type: "perfect_score" };
        const profile = createMockProfile({ find_note_count: 100 });

        // Act
        const result = service.testCalculateProgress(criteria, profile);

        // Assert
        expect(result.current).toBe(0);
        expect(result.target).toBe(1);
        expect(result.percentage).toBe(0);
      });
    });

    describe("streak criteria", () => {
      it("should calculate progress for streak achievement", () => {
        // Arrange
        const criteria = { type: "streak", days: 7 };
        const profile = createMockProfile({ current_streak: 3 });

        // Act
        const result = service.testCalculateProgress(criteria, profile);

        // Assert
        expect(result.current).toBe(3);
        expect(result.target).toBe(7);
        expect(result.percentage).toBe(42); // floor(3/7 * 100)
      });

      it("should cap percentage at 100% when streak exceeds target", () => {
        // Arrange
        const criteria = { type: "streak", days: 5 };
        const profile = createMockProfile({ current_streak: 10 });

        // Act
        const result = service.testCalculateProgress(criteria, profile);

        // Assert
        expect(result.current).toBe(10);
        expect(result.target).toBe(5);
        expect(result.percentage).toBe(100);
      });

      it("should handle zero streak", () => {
        // Arrange
        const criteria = { type: "streak", days: 30 };
        const profile = createMockProfile({ current_streak: 0 });

        // Act
        const result = service.testCalculateProgress(criteria, profile);

        // Assert
        expect(result.current).toBe(0);
        expect(result.target).toBe(30);
        expect(result.percentage).toBe(0);
      });
    });

    describe("quiz_count criteria (specific quiz type)", () => {
      it("should calculate progress for find_note quiz count", () => {
        // Arrange
        const criteria = { type: "quiz_count", quiz_type: "find_note", count: 50 };
        const profile = createMockProfile({ find_note_count: 25 });

        // Act
        const result = service.testCalculateProgress(criteria, profile);

        // Assert
        expect(result.current).toBe(25);
        expect(result.target).toBe(50);
        expect(result.percentage).toBe(50);
      });

      it("should calculate progress for name_note quiz count", () => {
        // Arrange
        const criteria = { type: "quiz_count", quiz_type: "name_note", count: 20 };
        const profile = createMockProfile({ name_note_count: 15 });

        // Act
        const result = service.testCalculateProgress(criteria, profile);

        // Assert
        expect(result.current).toBe(15);
        expect(result.target).toBe(20);
        expect(result.percentage).toBe(75);
      });

      it("should calculate progress for mark_chord quiz count", () => {
        // Arrange
        const criteria = { type: "quiz_count", quiz_type: "mark_chord", count: 10 };
        const profile = createMockProfile({ mark_chord_count: 3 });

        // Act
        const result = service.testCalculateProgress(criteria, profile);

        // Assert
        expect(result.current).toBe(3);
        expect(result.target).toBe(10);
        expect(result.percentage).toBe(30);
      });

      it("should calculate progress for recognize_interval quiz count", () => {
        // Arrange
        const criteria = { type: "quiz_count", quiz_type: "recognize_interval", count: 25 };
        const profile = createMockProfile({ recognize_interval_count: 20 });

        // Act
        const result = service.testCalculateProgress(criteria, profile);

        // Assert
        expect(result.current).toBe(20);
        expect(result.target).toBe(25);
        expect(result.percentage).toBe(80);
      });

      it("should handle zero count for specific quiz type", () => {
        // Arrange
        const criteria = { type: "quiz_count", quiz_type: "find_note", count: 100 };
        const profile = createMockProfile({ find_note_count: 0 });

        // Act
        const result = service.testCalculateProgress(criteria, profile);

        // Assert
        expect(result.current).toBe(0);
        expect(result.target).toBe(100);
        expect(result.percentage).toBe(0);
      });
    });

    describe("unknown criteria type", () => {
      it("should return default values for unknown criteria type", () => {
        // Arrange
        const criteria = { type: "unknown_type" };
        const profile = createMockProfile();

        // Act
        const result = service.testCalculateProgress(criteria, profile);

        // Assert
        expect(result.current).toBe(0);
        expect(result.target).toBe(1);
        expect(result.percentage).toBe(0);
      });
    });

    describe("edge cases", () => {
      it("should floor percentage values (not round)", () => {
        // Arrange - 1/3 = 33.33...%
        const criteria = { type: "streak", days: 3 };
        const profile = createMockProfile({ current_streak: 1 });

        // Act
        const result = service.testCalculateProgress(criteria, profile);

        // Assert
        expect(result.percentage).toBe(33); // floor, not 34
      });

      it("should handle large target numbers", () => {
        // Arrange
        const criteria = { type: "total_quizzes", count: 10000 };
        const profile = createMockProfile({
          find_note_count: 250,
          name_note_count: 250,
          mark_chord_count: 250,
          recognize_interval_count: 250,
        });

        // Act
        const result = service.testCalculateProgress(criteria, profile);

        // Assert
        expect(result.current).toBe(1000);
        expect(result.target).toBe(10000);
        expect(result.percentage).toBe(10);
      });
    });
  });
});
