import { describe, it, expect, vi, beforeEach } from "vitest";
import { StatsService } from "./stats.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";

// Create a testable version of the service by exposing private methods
class TestableStatsService extends StatsService {
  public testAggregateHeatmapData(rawData: { fret_position: number | null; string_number: number | null }[]) {
    return this["aggregateHeatmapData"](rawData);
  }

  public testAggregateByQuizType(
    sessions: { quiz_type: string; score: number | null; time_taken_seconds: number | null }[]
  ) {
    return this["aggregateByQuizType"](sessions);
  }

  public testAggregateByDifficulty(sessions: { difficulty: string; score: number | null }[]) {
    return this["aggregateByDifficulty"](sessions);
  }

  public testCalculateRecentTrend(sessions: { score: number | null; completed_at: string | null }[]) {
    return this["calculateRecentTrend"](sessions);
  }
}

describe("StatsService", () => {
  let service: TestableStatsService;
  let mockSupabase: SupabaseClient<Database>;

  beforeEach(() => {
    mockSupabase = {} as SupabaseClient<Database>;
    service = new TestableStatsService(mockSupabase);
  });

  describe("aggregateHeatmapData", () => {
    it("should aggregate error counts by fret-string position", () => {
      // Arrange
      const rawData = [
        { fret_position: 3, string_number: 5 },
        { fret_position: 3, string_number: 5 },
        { fret_position: 5, string_number: 2 },
        { fret_position: 3, string_number: 5 },
      ];

      // Act
      const result = service.testAggregateHeatmapData(rawData);

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({ fret_position: 3, string_number: 5, error_count: 3 });
      expect(result).toContainEqual({ fret_position: 5, string_number: 2, error_count: 1 });
    });

    it("should skip rows with null fret_position", () => {
      // Arrange
      const rawData = [
        { fret_position: null, string_number: 5 },
        { fret_position: 3, string_number: 5 },
      ];

      // Act
      const result = service.testAggregateHeatmapData(rawData);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ fret_position: 3, string_number: 5, error_count: 1 });
    });

    it("should skip rows with null string_number", () => {
      // Arrange
      const rawData = [
        { fret_position: 3, string_number: null },
        { fret_position: 5, string_number: 2 },
      ];

      // Act
      const result = service.testAggregateHeatmapData(rawData);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ fret_position: 5, string_number: 2, error_count: 1 });
    });

    it("should return empty array for empty input", () => {
      // Arrange
      const rawData: { fret_position: number | null; string_number: number | null }[] = [];

      // Act
      const result = service.testAggregateHeatmapData(rawData);

      // Assert
      expect(result).toEqual([]);
    });

    it("should handle fret position 0 (open string)", () => {
      // Arrange
      const rawData = [
        { fret_position: 0, string_number: 1 },
        { fret_position: 0, string_number: 1 },
      ];

      // Act
      const result = service.testAggregateHeatmapData(rawData);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ fret_position: 0, string_number: 1, error_count: 2 });
    });
  });

  describe("aggregateByQuizType", () => {
    it("should calculate stats for each quiz type", () => {
      // Arrange
      const sessions = [
        { quiz_type: "find_note", score: 8, time_taken_seconds: 60 },
        { quiz_type: "find_note", score: 10, time_taken_seconds: 45 },
        { quiz_type: "name_note", score: 7, time_taken_seconds: 90 },
      ];

      // Act
      const result = service.testAggregateByQuizType(sessions);

      // Assert
      expect(result.find_note.count).toBe(2);
      expect(result.find_note.average_score).toBe(9);
      expect(result.find_note.best_score).toBe(10);
      expect(result.find_note.total_time_seconds).toBe(105);

      expect(result.name_note.count).toBe(1);
      expect(result.name_note.average_score).toBe(7);
      expect(result.name_note.best_score).toBe(7);
      expect(result.name_note.total_time_seconds).toBe(90);
    });

    it("should return zero stats for quiz types with no sessions", () => {
      // Arrange
      const sessions: { quiz_type: string; score: number | null; time_taken_seconds: number | null }[] = [];

      // Act
      const result = service.testAggregateByQuizType(sessions);

      // Assert
      expect(result.find_note).toEqual({ count: 0, average_score: 0, best_score: 0, total_time_seconds: 0 });
      expect(result.mark_chord).toEqual({ count: 0, average_score: 0, best_score: 0, total_time_seconds: 0 });
    });

    it("should handle sessions with null scores", () => {
      // Arrange
      const sessions = [
        { quiz_type: "find_note", score: null, time_taken_seconds: 60 },
        { quiz_type: "find_note", score: 8, time_taken_seconds: 45 },
      ];

      // Act
      const result = service.testAggregateByQuizType(sessions);

      // Assert
      expect(result.find_note.count).toBe(2);
      expect(result.find_note.average_score).toBe(8);
      expect(result.find_note.best_score).toBe(8);
    });

    it("should handle sessions with null time_taken_seconds", () => {
      // Arrange
      const sessions = [
        { quiz_type: "find_note", score: 10, time_taken_seconds: null },
        { quiz_type: "find_note", score: 8, time_taken_seconds: 60 },
      ];

      // Act
      const result = service.testAggregateByQuizType(sessions);

      // Assert
      expect(result.find_note.total_time_seconds).toBe(60);
    });

    it("should round average score to one decimal place", () => {
      // Arrange
      const sessions = [
        { quiz_type: "find_note", score: 7, time_taken_seconds: 60 },
        { quiz_type: "find_note", score: 8, time_taken_seconds: 60 },
        { quiz_type: "find_note", score: 9, time_taken_seconds: 60 },
      ];

      // Act
      const result = service.testAggregateByQuizType(sessions);

      // Assert
      expect(result.find_note.average_score).toBe(8);
    });
  });

  describe("aggregateByDifficulty", () => {
    it("should calculate stats for each difficulty level", () => {
      // Arrange
      const sessions = [
        { difficulty: "easy", score: 10 },
        { difficulty: "easy", score: 8 },
        { difficulty: "medium", score: 7 },
        { difficulty: "hard", score: 5 },
      ];

      // Act
      const result = service.testAggregateByDifficulty(sessions);

      // Assert
      expect(result.easy.count).toBe(2);
      expect(result.easy.average_score).toBe(9);
      expect(result.medium.count).toBe(1);
      expect(result.medium.average_score).toBe(7);
      expect(result.hard.count).toBe(1);
      expect(result.hard.average_score).toBe(5);
    });

    it("should return zero stats for difficulty levels with no sessions", () => {
      // Arrange
      const sessions: { difficulty: string; score: number | null }[] = [];

      // Act
      const result = service.testAggregateByDifficulty(sessions);

      // Assert
      expect(result.easy).toEqual({ count: 0, average_score: 0 });
      expect(result.medium).toEqual({ count: 0, average_score: 0 });
      expect(result.hard).toEqual({ count: 0, average_score: 0 });
    });

    it("should handle sessions with null scores", () => {
      // Arrange
      const sessions = [
        { difficulty: "easy", score: null },
        { difficulty: "easy", score: 8 },
      ];

      // Act
      const result = service.testAggregateByDifficulty(sessions);

      // Assert
      expect(result.easy.count).toBe(2);
      expect(result.easy.average_score).toBe(8);
    });
  });

  describe("calculateRecentTrend", () => {
    const NOW = new Date("2024-01-15T12:00:00Z");

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
    });

    it("should calculate trend for sessions in last 7 days vs previous 7 days", () => {
      // Arrange
      const sessions = [
        // Last 7 days (Jan 9-15)
        { score: 8, completed_at: "2024-01-14T10:00:00Z" },
        { score: 9, completed_at: "2024-01-12T10:00:00Z" },
        // Previous 7 days (Jan 2-8)
        { score: 6, completed_at: "2024-01-05T10:00:00Z" },
        { score: 6, completed_at: "2024-01-03T10:00:00Z" },
      ];

      // Act
      const result = service.testCalculateRecentTrend(sessions);

      // Assert
      expect(result.last_7_days.quizzes).toBe(2);
      expect(result.last_7_days.average_score).toBe(8.5);
      expect(result.previous_7_days.quizzes).toBe(2);
      expect(result.previous_7_days.average_score).toBe(6);
      // Improvement: (8.5 - 6) / 6 * 100 = 41.7%
      expect(result.improvement).toBeCloseTo(41.7, 1);
    });

    it("should return 100% improvement when no previous period data exists", () => {
      // Arrange
      const sessions = [{ score: 8, completed_at: "2024-01-14T10:00:00Z" }];

      // Act
      const result = service.testCalculateRecentTrend(sessions);

      // Assert
      expect(result.last_7_days.quizzes).toBe(1);
      expect(result.last_7_days.average_score).toBe(8);
      expect(result.previous_7_days.quizzes).toBe(0);
      expect(result.previous_7_days.average_score).toBe(0);
      expect(result.improvement).toBe(100);
    });

    it("should return 0% improvement when no data in either period", () => {
      // Arrange
      const sessions: { score: number | null; completed_at: string | null }[] = [];

      // Act
      const result = service.testCalculateRecentTrend(sessions);

      // Assert
      expect(result.last_7_days.quizzes).toBe(0);
      expect(result.previous_7_days.quizzes).toBe(0);
      expect(result.improvement).toBe(0);
    });

    it("should handle negative improvement (regression)", () => {
      // Arrange
      const sessions = [
        // Last 7 days - worse performance
        { score: 5, completed_at: "2024-01-14T10:00:00Z" },
        // Previous 7 days - better performance
        { score: 10, completed_at: "2024-01-05T10:00:00Z" },
      ];

      // Act
      const result = service.testCalculateRecentTrend(sessions);

      // Assert
      expect(result.last_7_days.average_score).toBe(5);
      expect(result.previous_7_days.average_score).toBe(10);
      // Improvement: (5 - 10) / 10 * 100 = -50%
      expect(result.improvement).toBe(-50);
    });

    it("should skip sessions with null completed_at", () => {
      // Arrange
      const sessions = [
        { score: 8, completed_at: null },
        { score: 9, completed_at: "2024-01-14T10:00:00Z" },
      ];

      // Act
      const result = service.testCalculateRecentTrend(sessions);

      // Assert
      expect(result.last_7_days.quizzes).toBe(1);
      expect(result.last_7_days.average_score).toBe(9);
    });

    it("should skip sessions with null score when calculating averages", () => {
      // Arrange
      const sessions = [
        { score: null, completed_at: "2024-01-14T10:00:00Z" },
        { score: 8, completed_at: "2024-01-13T10:00:00Z" },
      ];

      // Act
      const result = service.testCalculateRecentTrend(sessions);

      // Assert
      expect(result.last_7_days.quizzes).toBe(2);
      expect(result.last_7_days.average_score).toBe(8);
    });

    it("should exclude sessions exactly at boundary dates correctly", () => {
      // Arrange - session exactly at 7-day boundary
      const sessions = [
        // This is exactly 7 days ago at the same time - should be in last_7_days
        { score: 8, completed_at: "2024-01-08T12:00:00Z" },
      ];

      // Act
      const result = service.testCalculateRecentTrend(sessions);

      // Assert
      expect(result.last_7_days.quizzes).toBe(1);
      expect(result.previous_7_days.quizzes).toBe(0);
    });

    it("should handle sessions older than 14 days", () => {
      // Arrange
      const sessions = [
        { score: 10, completed_at: "2023-12-01T10:00:00Z" }, // Way before 14-day window
        { score: 8, completed_at: "2024-01-14T10:00:00Z" },
      ];

      // Act
      const result = service.testCalculateRecentTrend(sessions);

      // Assert
      expect(result.last_7_days.quizzes).toBe(1);
      expect(result.previous_7_days.quizzes).toBe(0);
    });
  });
});
