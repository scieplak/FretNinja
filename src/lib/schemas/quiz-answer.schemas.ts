import { z } from 'zod';

const noteEnum = z.enum(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'], {
  errorMap: () => ({ message: 'Invalid note value' }),
});

const chordTypeEnum = z.enum(['major', 'minor', 'diminished', 'augmented'], {
  errorMap: () => ({ message: 'Invalid chord_type value' }),
});

const intervalEnum = z.enum(
  [
    'minor_2nd',
    'major_2nd',
    'minor_3rd',
    'major_3rd',
    'perfect_4th',
    'tritone',
    'perfect_5th',
    'minor_6th',
    'major_6th',
    'minor_7th',
    'major_7th',
    'octave',
  ],
  {
    errorMap: () => ({ message: 'Invalid interval value' }),
  }
);

const fretPositionSchema = z.object({
  fret: z
    .number()
    .int()
    .min(0, 'fret_position must be between 0 and 24')
    .max(24, 'fret_position must be between 0 and 24'),
  string: z
    .number()
    .int()
    .min(1, 'string_number must be between 1 and 6')
    .max(6, 'string_number must be between 1 and 6'),
});

export const createQuizAnswerCommandSchema = z.object({
  question_number: z
    .number()
    .int()
    .min(1, 'question_number must be between 1 and 10')
    .max(10, 'question_number must be between 1 and 10'),
  is_correct: z.boolean(),
  time_taken_ms: z.number().int().nonnegative().nullable().optional(),
  fret_position: z
    .number()
    .int()
    .min(0, 'fret_position must be between 0 and 24')
    .max(24, 'fret_position must be between 0 and 24')
    .nullable()
    .optional(),
  string_number: z
    .number()
    .int()
    .min(1, 'string_number must be between 1 and 6')
    .max(6, 'string_number must be between 1 and 6')
    .nullable()
    .optional(),
  target_note: noteEnum.nullable().optional(),
  user_answer_note: noteEnum.nullable().optional(),
  target_root_note: noteEnum.nullable().optional(),
  target_chord_type: chordTypeEnum.nullable().optional(),
  user_answer_positions: z.array(fretPositionSchema).nullable().optional(),
  target_interval: intervalEnum.nullable().optional(),
  reference_fret_position: z.number().int().min(0).max(24).nullable().optional(),
  reference_string_number: z.number().int().min(1).max(6).nullable().optional(),
  user_answer_interval: intervalEnum.nullable().optional(),
});

export type CreateQuizAnswerCommandInput = z.infer<typeof createQuizAnswerCommandSchema>;
