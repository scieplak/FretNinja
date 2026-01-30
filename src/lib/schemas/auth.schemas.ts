import { z } from "zod";

export const registerCommandSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginCommandSchema = z.object({
  email: z.string().min(1, "Email and password are required").email("Invalid email format"),
  password: z.string().min(1, "Email and password are required"),
});

export const passwordResetCommandSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export const passwordUpdateCommandSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type RegisterCommandInput = z.infer<typeof registerCommandSchema>;
export type LoginCommandInput = z.infer<typeof loginCommandSchema>;
export type PasswordResetCommandInput = z.infer<typeof passwordResetCommandSchema>;
export type PasswordUpdateCommandInput = z.infer<typeof passwordUpdateCommandSchema>;
