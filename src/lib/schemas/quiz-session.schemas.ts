import { z } from "zod";

export const createQuizSessionCommandSchema = z
  .object({
    quiz_type: z.enum(["find_note", "name_note", "mark_chord", "recognize_interval"], {
      errorMap: () => ({ message: "Invalid quiz_type" }),
    }),
    difficulty: z.enum(["easy", "medium", "hard"], {
      errorMap: () => ({ message: "Invalid difficulty" }),
    }),
    time_limit_seconds: z
      .number()
      .int("time_limit_seconds must be a positive integer")
      .positive("time_limit_seconds must be a positive integer")
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      if (data.difficulty === "hard") {
        return data.time_limit_seconds != null && data.time_limit_seconds > 0;
      }
      return true;
    },
    { message: "time_limit_seconds required for hard difficulty" }
  );

export const quizSessionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  quiz_type: z.enum(["find_note", "name_note", "mark_chord", "recognize_interval"]).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  status: z.enum(["in_progress", "completed", "abandoned"]).optional(),
  sort: z
    .string()
    .regex(/^(completed_at|started_at|score):(asc|desc)$/)
    .default("completed_at:desc"),
});

export const updateQuizSessionCommandSchema = z
  .object({
    status: z.enum(["completed", "abandoned"], {
      errorMap: () => ({ message: "Invalid status transition" }),
    }),
    time_taken_seconds: z.number().int().nonnegative("time_taken_seconds must be non-negative").optional(),
  })
  .refine(
    (data) => {
      if (data.status === "completed") {
        return data.time_taken_seconds !== undefined;
      }
      return true;
    },
    { message: "time_taken_seconds required for completion" }
  );

export type CreateQuizSessionCommandInput = z.infer<typeof createQuizSessionCommandSchema>;
export type QuizSessionsQueryInput = z.infer<typeof quizSessionsQuerySchema>;
export type UpdateQuizSessionCommandInput = z.infer<typeof updateQuizSessionCommandSchema>;
