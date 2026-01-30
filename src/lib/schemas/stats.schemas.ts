import { z } from "zod";

export const heatmapQuerySchema = z.object({
  quiz_type: z.enum(["find_note", "name_note", "mark_chord", "recognize_interval"]).optional(),
  from_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
    .optional(),
  to_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
    .optional(),
});

export type HeatmapQueryInput = z.infer<typeof heatmapQuerySchema>;
