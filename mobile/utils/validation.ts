import { z } from 'zod';

/** Shared zod schemas. Used by auth forms and generation inputs. */

export const emailSchema = z.string().trim().min(3).max(320).email('Enter a valid email address');

export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(128, 'Use at most 128 characters')
  .refine((v) => /[a-z]/.test(v), 'Add a lowercase letter')
  .refine((v) => /[A-Z]/.test(v), 'Add an uppercase letter')
  .refine((v) => /[0-9]/.test(v), 'Add a number');

export const displayNameSchema = z.string().trim().min(2, 'Name is too short').max(120, 'Name is too long');

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Password is required') });

export const signupSchema = z
  .object({ email: emailSchema, password: passwordSchema, confirmPassword: z.string(), displayName: displayNameSchema })
  .refine((v) => v.password === v.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

export const topicSchema = z.string().trim().min(3, 'Describe the topic in a little more detail').max(500);

export const generateSchema = z.object({
  topic: topicSchema,
  mode: z.enum(['quick_notes', 'detailed_notes', 'deep_research', 'exam_mode', 'study_everything']),
  sourceIds: z.array(z.string().uuid()).max(50).default([]),
});

export const studyPlanSchema = z.object({
  name: z.string().trim().min(2).max(220),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  topics: z.array(z.string().trim().min(1)).min(1, 'Add at least one topic').max(100),
  dailyMinutes: z.number().int().min(15).max(720),
});

export const youtubeUrlSchema = z
  .string()
  .trim()
  .url('Enter a valid URL')
  .refine((v) => /(?:youtube\.com|youtu\.be)/i.test(v), 'That is not a YouTube link');

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type GenerateInput = z.infer<typeof generateSchema>;
export type StudyPlanInput = z.infer<typeof studyPlanSchema>;

export interface FieldErrors {
  [field: string]: string | undefined;
}

/** Flattens a zod error into a `{ field: message }` map for <Field error=...>. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const first = issue.path[0];
    const key = typeof first === 'string' || typeof first === 'number' ? String(first) : '_';
    if (out[key] === undefined) out[key] = issue.message;
  }
  return out;
}

export interface ParseOk<T> { ok: true; data: T }
export interface ParseFail { ok: false; errors: FieldErrors }

export function parse<T>(schema: z.ZodType<T>, value: unknown): ParseOk<T> | ParseFail {
  const result = schema.safeParse(value);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, errors: fieldErrors(result.error) };
}
