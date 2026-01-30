import { z } from "zod";

const validTutorialModes = ["find_note", "name_note", "mark_chord", "recognize_interval", "explorer"] as const;

export const updateProfileCommandSchema = z
  .object({
    display_name: z
      .string()
      .min(2, "display_name must be 2-50 characters")
      .max(50, "display_name must be 2-50 characters")
      .nullable()
      .optional(),
    fretboard_range: z
      .union([z.literal(12), z.literal(24)], {
        errorMap: () => ({ message: "fretboard_range must be 12 or 24" }),
      })
      .optional(),
    show_note_names: z.boolean().optional(),
    tutorial_completed_modes: z
      .array(
        z.enum(validTutorialModes, {
          errorMap: () => ({ message: "Invalid tutorial mode in tutorial_completed_modes" }),
        })
      )
      .optional(),
  })
  .strict();

export type UpdateProfileCommandInput = z.infer<typeof updateProfileCommandSchema>;
