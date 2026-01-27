import { describe, it, expect } from 'vitest';
import {
  createQuizSessionCommandSchema,
  quizSessionsQuerySchema,
  updateQuizSessionCommandSchema,
} from './quiz-session.schemas';

describe('Quiz Session Schemas', () => {
  describe('createQuizSessionCommandSchema', () => {
    describe('quiz_type validation', () => {
      const validQuizTypes = ['find_note', 'name_note', 'mark_chord', 'recognize_interval'];

      it.each(validQuizTypes)('should accept valid quiz_type: %s', (quizType) => {
        // Arrange
        const input = { quiz_type: quizType, difficulty: 'easy' };

        // Act
        const result = createQuizSessionCommandSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
      });

      it('should reject invalid quiz_type', () => {
        // Arrange
        const input = { quiz_type: 'invalid_type', difficulty: 'easy' };

        // Act
        const result = createQuizSessionCommandSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Invalid quiz_type');
        }
      });
    });

    describe('difficulty validation', () => {
      const validDifficulties = ['easy', 'medium', 'hard'];

      it.each(validDifficulties)('should accept valid difficulty: %s', (difficulty) => {
        // Arrange
        const input = {
          quiz_type: 'find_note',
          difficulty,
          ...(difficulty === 'hard' ? { time_limit_seconds: 60 } : {}),
        };

        // Act
        const result = createQuizSessionCommandSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
      });

      it('should reject invalid difficulty', () => {
        // Arrange
        const input = { quiz_type: 'find_note', difficulty: 'expert' };

        // Act
        const result = createQuizSessionCommandSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Invalid difficulty');
        }
      });
    });

    describe('time_limit_seconds conditional validation (hard difficulty)', () => {
      it('should require time_limit_seconds for hard difficulty', () => {
        // Arrange
        const input = { quiz_type: 'find_note', difficulty: 'hard' };

        // Act
        const result = createQuizSessionCommandSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('time_limit_seconds required for hard difficulty');
        }
      });

      it('should accept hard difficulty with valid time_limit_seconds', () => {
        // Arrange
        const input = { quiz_type: 'find_note', difficulty: 'hard', time_limit_seconds: 120 };

        // Act
        const result = createQuizSessionCommandSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
      });

      it('should reject hard difficulty with zero time_limit_seconds', () => {
        // Arrange
        const input = { quiz_type: 'find_note', difficulty: 'hard', time_limit_seconds: 0 };

        // Act
        const result = createQuizSessionCommandSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
      });

      it('should reject hard difficulty with negative time_limit_seconds', () => {
        // Arrange
        const input = { quiz_type: 'find_note', difficulty: 'hard', time_limit_seconds: -10 };

        // Act
        const result = createQuizSessionCommandSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
      });

      it('should reject hard difficulty with null time_limit_seconds', () => {
        // Arrange
        const input = { quiz_type: 'find_note', difficulty: 'hard', time_limit_seconds: null };

        // Act
        const result = createQuizSessionCommandSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
      });

      it('should not require time_limit_seconds for easy difficulty', () => {
        // Arrange
        const input = { quiz_type: 'find_note', difficulty: 'easy' };

        // Act
        const result = createQuizSessionCommandSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
      });

      it('should not require time_limit_seconds for medium difficulty', () => {
        // Arrange
        const input = { quiz_type: 'find_note', difficulty: 'medium' };

        // Act
        const result = createQuizSessionCommandSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
      });

      it('should accept time_limit_seconds for easy difficulty (optional)', () => {
        // Arrange
        const input = { quiz_type: 'find_note', difficulty: 'easy', time_limit_seconds: 60 };

        // Act
        const result = createQuizSessionCommandSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
      });

      it('should reject non-integer time_limit_seconds', () => {
        // Arrange
        const input = { quiz_type: 'find_note', difficulty: 'hard', time_limit_seconds: 60.5 };

        // Act
        const result = createQuizSessionCommandSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
      });
    });
  });

  describe('quizSessionsQuerySchema', () => {
    describe('pagination defaults', () => {
      it('should use default page=1 when not provided', () => {
        // Arrange
        const input = {};

        // Act
        const result = quizSessionsQuerySchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.page).toBe(1);
        }
      });

      it('should use default limit=20 when not provided', () => {
        // Arrange
        const input = {};

        // Act
        const result = quizSessionsQuerySchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(20);
        }
      });

      it('should use default sort=completed_at:desc when not provided', () => {
        // Arrange
        const input = {};

        // Act
        const result = quizSessionsQuerySchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sort).toBe('completed_at:desc');
        }
      });
    });

    describe('page validation', () => {
      it('should accept page=1', () => {
        // Arrange
        const input = { page: '1' }; // Query params come as strings

        // Act
        const result = quizSessionsQuerySchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.page).toBe(1);
        }
      });

      it('should reject page=0', () => {
        // Arrange
        const input = { page: '0' };

        // Act
        const result = quizSessionsQuerySchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
      });

      it('should reject negative page', () => {
        // Arrange
        const input = { page: '-1' };

        // Act
        const result = quizSessionsQuerySchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
      });

      it('should coerce string page to number', () => {
        // Arrange
        const input = { page: '5' };

        // Act
        const result = quizSessionsQuerySchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.page).toBe(5);
          expect(typeof result.data.page).toBe('number');
        }
      });
    });

    describe('limit validation', () => {
      it('should accept limit=1 (minimum)', () => {
        // Arrange
        const input = { limit: '1' };

        // Act
        const result = quizSessionsQuerySchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
      });

      it('should accept limit=100 (maximum)', () => {
        // Arrange
        const input = { limit: '100' };

        // Act
        const result = quizSessionsQuerySchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
      });

      it('should reject limit=0', () => {
        // Arrange
        const input = { limit: '0' };

        // Act
        const result = quizSessionsQuerySchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
      });

      it('should reject limit=101 (exceeds maximum)', () => {
        // Arrange
        const input = { limit: '101' };

        // Act
        const result = quizSessionsQuerySchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
      });
    });

    describe('sort validation (regex)', () => {
      const validSortValues = [
        'completed_at:asc',
        'completed_at:desc',
        'started_at:asc',
        'started_at:desc',
        'score:asc',
        'score:desc',
      ];

      it.each(validSortValues)('should accept valid sort value: %s', (sort) => {
        // Arrange
        const input = { sort };

        // Act
        const result = quizSessionsQuerySchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
      });

      it('should reject sort without direction', () => {
        // Arrange
        const input = { sort: 'completed_at' };

        // Act
        const result = quizSessionsQuerySchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
      });

      it('should reject sort with invalid field', () => {
        // Arrange
        const input = { sort: 'invalid_field:asc' };

        // Act
        const result = quizSessionsQuerySchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
      });

      it('should reject sort with invalid direction', () => {
        // Arrange
        const input = { sort: 'completed_at:ascending' };

        // Act
        const result = quizSessionsQuerySchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
      });

      it('should reject sort with extra colons', () => {
        // Arrange
        const input = { sort: 'completed_at:asc:extra' };

        // Act
        const result = quizSessionsQuerySchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
      });
    });

    describe('optional filter fields', () => {
      it('should accept valid quiz_type filter', () => {
        // Arrange
        const input = { quiz_type: 'find_note' };

        // Act
        const result = quizSessionsQuerySchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.quiz_type).toBe('find_note');
        }
      });

      it('should accept valid difficulty filter', () => {
        // Arrange
        const input = { difficulty: 'medium' };

        // Act
        const result = quizSessionsQuerySchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.difficulty).toBe('medium');
        }
      });

      it('should accept valid status filter', () => {
        // Arrange
        const input = { status: 'completed' };

        // Act
        const result = quizSessionsQuerySchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe('completed');
        }
      });

      it('should reject invalid status filter', () => {
        // Arrange
        const input = { status: 'finished' }; // not a valid status

        // Act
        const result = quizSessionsQuerySchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
      });
    });
  });

  describe('updateQuizSessionCommandSchema', () => {
    describe('status validation', () => {
      it('should accept status=completed with time_taken_seconds', () => {
        // Arrange
        const input = { status: 'completed', time_taken_seconds: 120 };

        // Act
        const result = updateQuizSessionCommandSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
      });

      it('should accept status=abandoned without time_taken_seconds', () => {
        // Arrange
        const input = { status: 'abandoned' };

        // Act
        const result = updateQuizSessionCommandSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
      });

      it('should reject status=in_progress (not valid for update)', () => {
        // Arrange
        const input = { status: 'in_progress' };

        // Act
        const result = updateQuizSessionCommandSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Invalid status transition');
        }
      });

      it('should reject invalid status', () => {
        // Arrange
        const input = { status: 'finished' };

        // Act
        const result = updateQuizSessionCommandSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
      });
    });

    describe('time_taken_seconds conditional validation', () => {
      it('should require time_taken_seconds for completed status', () => {
        // Arrange
        const input = { status: 'completed' };

        // Act
        const result = updateQuizSessionCommandSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('time_taken_seconds required for completion');
        }
      });

      it('should not require time_taken_seconds for abandoned status', () => {
        // Arrange
        const input = { status: 'abandoned' };

        // Act
        const result = updateQuizSessionCommandSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
      });

      it('should accept time_taken_seconds for abandoned status (optional)', () => {
        // Arrange
        const input = { status: 'abandoned', time_taken_seconds: 45 };

        // Act
        const result = updateQuizSessionCommandSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
      });

      it('should accept time_taken_seconds=0 for completed status', () => {
        // Arrange
        const input = { status: 'completed', time_taken_seconds: 0 };

        // Act
        const result = updateQuizSessionCommandSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
      });

      it('should reject negative time_taken_seconds', () => {
        // Arrange
        const input = { status: 'completed', time_taken_seconds: -10 };

        // Act
        const result = updateQuizSessionCommandSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
      });

      it('should reject non-integer time_taken_seconds', () => {
        // Arrange
        const input = { status: 'completed', time_taken_seconds: 60.5 };

        // Act
        const result = updateQuizSessionCommandSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
      });
    });
  });
});
