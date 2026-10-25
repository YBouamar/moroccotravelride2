import { z } from 'zod';

/**
 * Auth form schemas, shared by client-side validation and Server Actions.
 * Error messages are i18n keys under `validation.*` in apps/web/src/messages.
 * The password policy mirrors supabase/config.toml (10+ chars, lower, upper, digit).
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'email' }));

export const passwordSchema = z
  .string()
  .min(10, { error: 'passwordTooShort' })
  // bcrypt only uses the first 72 bytes
  .max(72, { error: 'passwordTooLong' })
  .regex(/[a-z]/, { error: 'passwordLower' })
  .regex(/[A-Z]/, { error: 'passwordUpper' })
  .regex(/[0-9]/, { error: 'passwordDigit' });

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: 'required' }),
});

export const signUpCarrierSchema = z.object({
  fullName: z.string().trim().min(2, { error: 'nameTooShort' }).max(120, { error: 'tooLong' }),
  legalName: z.string().trim().min(2, { error: 'nameTooShort' }).max(200, { error: 'tooLong' }),
  cityId: z.uuid({ error: 'required' }),
  email: emailSchema,
  password: passwordSchema,
  // A boolean (unchecked by default in forms) that must be true.
  acceptTerms: z.boolean().refine((accepted) => accepted, { error: 'acceptTerms' }),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((values) => values.password === values.confirmPassword, {
    error: 'passwordMismatch',
    path: ['confirmPassword'],
  });

export const mfaCodeSchema = z.object({
  code: z.string().regex(/^[0-9]{6}$/, { error: 'mfaCode' }),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpCarrierInput = z.infer<typeof signUpCarrierSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type MfaCodeInput = z.infer<typeof mfaCodeSchema>;
