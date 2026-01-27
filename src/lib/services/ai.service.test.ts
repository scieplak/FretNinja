import { describe, it, expect, beforeEach } from 'vitest';
import { AIService } from './ai.service';
import type { AIHintCommand } from '../../types';

// Create a testable version of the service by exposing private methods
class TestableAIService extends AIService {
  public testBuildHintPrompt(command: AIHintCommand): string {
    return this['buildHintPrompt'](command);
  }

  public testParseHintResponse(content: string) {
    return this['parseHintResponse'](content);
  }

  public testAggregateErrorPatterns(
    errors: Array<{ fret_position: number | null; string_number: number | null; target_note: string | null }>
  ) {
    return this['aggregateErrorPatterns'](errors);
  }

  public testBuildPersonalizedTipsPrompt(
    patterns: { byPosition: Record<string, number>; byNote: Record<string, number>; byString: Record<number, number> },
    limit: number
  ): string {
    return this['buildPersonalizedTipsPrompt'](patterns, limit);
  }

  public testParsePersonalizedTipsResponse(content: string) {
    return this['parsePersonalizedTipsResponse'](content);
  }
}

describe('AIService', () => {
  let service: TestableAIService;

  beforeEach(() => {
    service = new TestableAIService();
  });

  describe('buildHintPrompt', () => {
    it('should build prompt with context only', () => {
      // Arrange
      const command: AIHintCommand = { context: 'quiz' };

      // Act
      const result = service.testBuildHintPrompt(command);

      // Assert
      expect(result).toContain('Context: quiz');
      expect(result).toContain('Please provide a helpful hint');
    });

    it('should include quiz_type when provided', () => {
      // Arrange
      const command: AIHintCommand = { context: 'quiz', quiz_type: 'find_note' };

      // Act
      const result = service.testBuildHintPrompt(command);

      // Assert
      expect(result).toContain('Quiz type: find_note');
    });

    it('should include target_note when provided', () => {
      // Arrange
      const command: AIHintCommand = { context: 'quiz', target_note: 'C#' };

      // Act
      const result = service.testBuildHintPrompt(command);

      // Assert
      expect(result).toContain('Target note: C#');
    });

    it('should include fret_position when provided (including 0)', () => {
      // Arrange
      const command: AIHintCommand = { context: 'explorer', fret_position: 0 };

      // Act
      const result = service.testBuildHintPrompt(command);

      // Assert
      expect(result).toContain('Fret position: 0');
    });

    it('should include string_number when provided', () => {
      // Arrange
      const command: AIHintCommand = { context: 'explorer', string_number: 6 };

      // Act
      const result = service.testBuildHintPrompt(command);

      // Assert
      expect(result).toContain('String number: 6');
    });

    it('should include target_interval when provided', () => {
      // Arrange
      const command: AIHintCommand = { context: 'quiz', target_interval: 'major_3rd' };

      // Act
      const result = service.testBuildHintPrompt(command);

      // Assert
      expect(result).toContain('Target interval: major_3rd');
    });

    it('should include chord info when both root and type are provided', () => {
      // Arrange
      const command: AIHintCommand = {
        context: 'quiz',
        target_chord_type: 'major',
        target_root_note: 'G',
      };

      // Act
      const result = service.testBuildHintPrompt(command);

      // Assert
      expect(result).toContain('Target chord: G major');
    });

    it('should not include chord info when only root note is provided', () => {
      // Arrange
      const command: AIHintCommand = { context: 'quiz', target_root_note: 'G' };

      // Act
      const result = service.testBuildHintPrompt(command);

      // Assert
      expect(result).not.toContain('Target chord:');
    });

    it('should include user error positions when provided', () => {
      // Arrange
      const command: AIHintCommand = {
        context: 'quiz',
        user_error_positions: [
          { fret: 3, string: 5 },
          { fret: 5, string: 2 },
        ],
      };

      // Act
      const result = service.testBuildHintPrompt(command);

      // Assert
      expect(result).toContain('User\'s recent error positions:');
      expect(result).toContain('{"fret":3,"string":5}');
      expect(result).toContain('{"fret":5,"string":2}');
    });

    it('should not include error positions when array is empty', () => {
      // Arrange
      const command: AIHintCommand = { context: 'quiz', user_error_positions: [] };

      // Act
      const result = service.testBuildHintPrompt(command);

      // Assert
      expect(result).not.toContain('error positions');
    });

    it('should build complete prompt with all fields', () => {
      // Arrange
      const command: AIHintCommand = {
        context: 'quiz',
        quiz_type: 'find_note',
        target_note: 'A',
        fret_position: 5,
        string_number: 1,
        user_error_positions: [{ fret: 3, string: 1 }],
      };

      // Act
      const result = service.testBuildHintPrompt(command);

      // Assert
      expect(result).toContain('Context: quiz');
      expect(result).toContain('Quiz type: find_note');
      expect(result).toContain('Target note: A');
      expect(result).toContain('Fret position: 5');
      expect(result).toContain('String number: 1');
      expect(result).toContain('error positions');
    });
  });

  describe('parseHintResponse', () => {
    it('should parse valid JSON response', () => {
      // Arrange
      const content = JSON.stringify({
        hint: 'The note C is found on fret 3 of string 5',
        related_positions: [{ fret: 3, string: 5, note: 'C' }],
        memorization_tip: 'Think of C as the anchor note',
      });

      // Act
      const result = service.testParseHintResponse(content);

      // Assert
      expect(result.hint).toBe('The note C is found on fret 3 of string 5');
      expect(result.related_positions).toEqual([{ fret: 3, string: 5, note: 'C' }]);
      expect(result.memorization_tip).toBe('Think of C as the anchor note');
    });

    it('should extract JSON from text with surrounding content', () => {
      // Arrange
      const content = `Here is the hint:
      {
        "hint": "Found the note!",
        "related_positions": [],
        "memorization_tip": "Remember this!"
      }
      Hope that helps!`;

      // Act
      const result = service.testParseHintResponse(content);

      // Assert
      expect(result.hint).toBe('Found the note!');
      expect(result.memorization_tip).toBe('Remember this!');
    });

    it('should fallback to raw content when JSON is invalid', () => {
      // Arrange
      const content = 'This is just plain text with no JSON.';

      // Act
      const result = service.testParseHintResponse(content);

      // Assert
      expect(result.hint).toBe('This is just plain text with no JSON.');
      expect(result.related_positions).toEqual([]);
      expect(result.memorization_tip).toBe('');
    });

    it('should handle missing fields in JSON with defaults', () => {
      // Arrange
      const content = JSON.stringify({ hint: 'Only hint provided' });

      // Act
      const result = service.testParseHintResponse(content);

      // Assert
      expect(result.hint).toBe('Only hint provided');
      expect(result.related_positions).toEqual([]);
      expect(result.memorization_tip).toBe('');
    });

    it('should use raw content as hint when hint field is missing in JSON', () => {
      // Arrange
      const content = JSON.stringify({ related_positions: [], memorization_tip: 'tip' });

      // Act
      const result = service.testParseHintResponse(content);

      // Assert
      expect(result.hint).toBe(content); // Falls back to raw content
    });

    it('should handle malformed JSON gracefully', () => {
      // Arrange
      const content = '{ "hint": "broken json"';

      // Act
      const result = service.testParseHintResponse(content);

      // Assert
      expect(result.hint).toBe('{ "hint": "broken json"');
      expect(result.related_positions).toEqual([]);
    });
  });

  describe('aggregateErrorPatterns', () => {
    it('should aggregate errors by position', () => {
      // Arrange
      const errors = [
        { fret_position: 3, string_number: 5, target_note: 'C' },
        { fret_position: 3, string_number: 5, target_note: 'C' },
        { fret_position: 5, string_number: 2, target_note: 'E' },
      ];

      // Act
      const result = service.testAggregateErrorPatterns(errors);

      // Assert
      expect(result.byPosition['fret3-string5']).toBe(2);
      expect(result.byPosition['fret5-string2']).toBe(1);
    });

    it('should aggregate errors by note', () => {
      // Arrange
      const errors = [
        { fret_position: 3, string_number: 5, target_note: 'C' },
        { fret_position: 8, string_number: 5, target_note: 'C' },
        { fret_position: 5, string_number: 2, target_note: 'E' },
      ];

      // Act
      const result = service.testAggregateErrorPatterns(errors);

      // Assert
      expect(result.byNote['C']).toBe(2);
      expect(result.byNote['E']).toBe(1);
    });

    it('should aggregate errors by string', () => {
      // Arrange
      const errors = [
        { fret_position: 3, string_number: 5, target_note: 'C' },
        { fret_position: 5, string_number: 5, target_note: 'D' },
        { fret_position: 7, string_number: 2, target_note: 'E' },
      ];

      // Act
      const result = service.testAggregateErrorPatterns(errors);

      // Assert
      expect(result.byString[5]).toBe(2);
      expect(result.byString[2]).toBe(1);
    });

    it('should skip errors with null fret_position', () => {
      // Arrange
      const errors = [
        { fret_position: null, string_number: 5, target_note: 'C' },
        { fret_position: 3, string_number: 5, target_note: 'C' },
      ];

      // Act
      const result = service.testAggregateErrorPatterns(errors);

      // Assert
      expect(Object.keys(result.byPosition)).toHaveLength(1);
      expect(result.byString[5]).toBe(1);
    });

    it('should skip errors with null string_number', () => {
      // Arrange
      const errors = [
        { fret_position: 3, string_number: null, target_note: 'C' },
        { fret_position: 3, string_number: 5, target_note: 'C' },
      ];

      // Act
      const result = service.testAggregateErrorPatterns(errors);

      // Assert
      expect(Object.keys(result.byPosition)).toHaveLength(1);
    });

    it('should handle errors with null target_note', () => {
      // Arrange
      const errors = [
        { fret_position: 3, string_number: 5, target_note: null },
        { fret_position: 3, string_number: 5, target_note: 'C' },
      ];

      // Act
      const result = service.testAggregateErrorPatterns(errors);

      // Assert
      expect(result.byNote['C']).toBe(1);
      expect(Object.keys(result.byNote)).toHaveLength(1);
    });

    it('should return empty objects for empty input', () => {
      // Arrange
      const errors: Array<{ fret_position: number | null; string_number: number | null; target_note: string | null }> =
        [];

      // Act
      const result = service.testAggregateErrorPatterns(errors);

      // Assert
      expect(result.byPosition).toEqual({});
      expect(result.byNote).toEqual({});
      expect(result.byString).toEqual({});
    });

    it('should handle fret position 0 (open string)', () => {
      // Arrange
      const errors = [
        { fret_position: 0, string_number: 1, target_note: 'E' },
        { fret_position: 0, string_number: 1, target_note: 'E' },
      ];

      // Act
      const result = service.testAggregateErrorPatterns(errors);

      // Assert
      expect(result.byPosition['fret0-string1']).toBe(2);
    });
  });

  describe('buildPersonalizedTipsPrompt', () => {
    it('should format top positions correctly', () => {
      // Arrange
      const patterns = {
        byPosition: { 'fret3-string5': 5, 'fret5-string2': 3 },
        byNote: { C: 5, E: 3 },
        byString: { 5: 5, 2: 3 },
      };

      // Act
      const result = service.testBuildPersonalizedTipsPrompt(patterns, 3);

      // Assert
      expect(result).toContain('fret3-string5: 5 errors');
      expect(result).toContain('fret5-string2: 3 errors');
    });

    it('should format top notes correctly', () => {
      // Arrange
      const patterns = {
        byPosition: {},
        byNote: { C: 10, 'C#': 5, D: 3 },
        byString: {},
      };

      // Act
      const result = service.testBuildPersonalizedTipsPrompt(patterns, 3);

      // Assert
      expect(result).toContain('C: 10 errors');
      expect(result).toContain('C#: 5 errors');
      expect(result).toContain('D: 3 errors');
    });

    it('should format string errors correctly', () => {
      // Arrange
      const patterns = {
        byPosition: {},
        byNote: {},
        byString: { 1: 15, 6: 10 },
      };

      // Act
      const result = service.testBuildPersonalizedTipsPrompt(patterns, 2);

      // Assert
      expect(result).toContain('String 1: 15 errors');
      expect(result).toContain('String 6: 10 errors');
    });

    it('should include limit in prompt', () => {
      // Arrange
      const patterns = { byPosition: {}, byNote: {}, byString: {} };

      // Act
      const result = service.testBuildPersonalizedTipsPrompt(patterns, 5);

      // Assert
      expect(result).toContain('provide 5 personalized tips');
      expect(result).toContain('provide 5 specific');
    });

    it('should sort positions by error count descending', () => {
      // Arrange
      const patterns = {
        byPosition: {
          'fret1-string1': 1,
          'fret2-string2': 10,
          'fret3-string3': 5,
        },
        byNote: {},
        byString: {},
      };

      // Act
      const result = service.testBuildPersonalizedTipsPrompt(patterns, 3);

      // Assert
      const positionSection = result.split('Most frequent error positions:')[1].split('Most frequently missed notes:')[0];
      const pos10Index = positionSection.indexOf('fret2-string2');
      const pos5Index = positionSection.indexOf('fret3-string3');
      const pos1Index = positionSection.indexOf('fret1-string1');
      expect(pos10Index).toBeLessThan(pos5Index);
      expect(pos5Index).toBeLessThan(pos1Index);
    });

    it('should limit positions to top 10', () => {
      // Arrange
      const patterns = {
        byPosition: Object.fromEntries(
          Array.from({ length: 15 }, (_, i) => [`fret${i}-string1`, 15 - i])
        ),
        byNote: {},
        byString: {},
      };

      // Act
      const result = service.testBuildPersonalizedTipsPrompt(patterns, 3);

      // Assert
      const positionMatches = result.match(/fret\d+-string\d+: \d+ errors/g) || [];
      expect(positionMatches.length).toBeLessThanOrEqual(10);
    });
  });

  describe('parsePersonalizedTipsResponse', () => {
    it('should parse valid JSON response', () => {
      // Arrange
      const content = JSON.stringify({
        tips: [
          {
            focus_area: 'String 5',
            observation: 'Many errors on the A string',
            suggestion: 'Practice the A string notes',
            practice_positions: [{ fret: 3, string: 5, note: 'C' }],
          },
        ],
        overall_recommendation: 'Focus on the bass strings',
      });

      // Act
      const result = service.testParsePersonalizedTipsResponse(content);

      // Assert
      expect(result.tips).toHaveLength(1);
      expect(result.tips[0].focus_area).toBe('String 5');
      expect(result.overall_recommendation).toBe('Focus on the bass strings');
    });

    it('should fallback to raw content as overall_recommendation when JSON is invalid', () => {
      // Arrange
      const content = 'This is plain text advice for the student.';

      // Act
      const result = service.testParsePersonalizedTipsResponse(content);

      // Assert
      expect(result.tips).toEqual([]);
      expect(result.overall_recommendation).toBe('This is plain text advice for the student.');
    });

    it('should handle missing fields with defaults', () => {
      // Arrange
      const content = JSON.stringify({ tips: [] });

      // Act
      const result = service.testParsePersonalizedTipsResponse(content);

      // Assert
      expect(result.tips).toEqual([]);
      expect(result.overall_recommendation).toBe('');
    });

    it('should extract JSON from text with surrounding content', () => {
      // Arrange
      const content = `Here are your tips:
      {
        "tips": [{"focus_area": "Test", "observation": "obs", "suggestion": "sug", "practice_positions": []}],
        "overall_recommendation": "Keep practicing!"
      }`;

      // Act
      const result = service.testParsePersonalizedTipsResponse(content);

      // Assert
      expect(result.tips).toHaveLength(1);
      expect(result.overall_recommendation).toBe('Keep practicing!');
    });
  });
});
