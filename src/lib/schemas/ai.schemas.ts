import { z } from "zod";

const noteEnum = z.enum(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]);
const chordTypeEnum = z.enum(["major", "minor", "diminished", "augmented"]);
const scaleTypeEnum = z.enum(["major", "natural_minor", "pentatonic_major", "pentatonic_minor"]);
const intervalEnum = z.enum([
  "minor_2nd",
  "major_2nd",
  "minor_3rd",
  "major_3rd",
  "perfect_4th",
  "tritone",
  "perfect_5th",
  "minor_6th",
  "major_6th",
  "minor_7th",
  "major_7th",
  "octave",
]);

const fretPositionSchema = z.object({
  fret: z.number().int().min(0).max(24),
  string: z.number().int().min(1).max(6),
});

export const aiHintCommandSchema = z
  .object({
    context: z.enum(["quiz", "explorer"], {
      errorMap: () => ({ message: "Invalid context" }),
    }),
    quiz_type: z.enum(["find_note", "name_note", "mark_chord", "recognize_interval"]).nullable().optional(),
    target_note: noteEnum.nullable().optional(),
    target_interval: intervalEnum.nullable().optional(),
    target_chord_type: chordTypeEnum.nullable().optional(),
    target_root_note: noteEnum.nullable().optional(),
    target_scale_type: scaleTypeEnum.nullable().optional(),
    fret_position: z.number().int().min(0).max(24).nullable().optional(),
    string_number: z.number().int().min(1).max(6).nullable().optional(),
    user_error_positions: z.array(fretPositionSchema).nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.context === "quiz") {
        return data.quiz_type != null;
      }
      return true;
    },
    { message: "quiz_type required for quiz context" }
  );

export type AIHintCommandInput = z.infer<typeof aiHintCommandSchema>;

export const personalizedTipsCommandSchema = z.object({
  quiz_type: z
    .enum(["find_note", "name_note", "mark_chord", "recognize_interval"], {
      errorMap: () => ({ message: "Invalid quiz_type" }),
    })
    .nullable()
    .optional(),
  limit: z
    .number()
    .int()
    .min(1, "limit must be between 1 and 5")
    .max(5, "limit must be between 1 and 5")
    .nullable()
    .optional()
    .default(3),
});

export type PersonalizedTipsCommandInput = z.infer<typeof personalizedTipsCommandSchema>;
