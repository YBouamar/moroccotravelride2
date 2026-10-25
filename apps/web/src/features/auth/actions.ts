'use server';

import {
  forgotPasswordSchema,
  mfaCodeSchema,
  resetPasswordSchema,
  signInSchema,
  signUpCarrierSchema,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type SignInInput,
  type SignUpCarrierInput,
} from '@mtr/shared';
import type { Locale } from 'next-intl';
import { redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { getPublicEnv } from '@/lib/env';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { getClientIp } from '@/lib/security/request-context';
import { safeNextPath } from '@/lib/security/safe-redirect';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { createClient } from '@/lib/supabase/server';

export type AuthError =
  | 'invalid'
  | 'credentials'
  | 'emailNotConfirmed'
  | 'rateLimited'
  | 'captcha'
  | 'mfaCode'
  | 'unknown';

export type ActionResult = { ok: true } | { ok: false; error: AuthError };

const fail = (error: AuthError): ActionResult => ({ ok: false, error });

// Locale comes from the client: validate it like any other input.
const toLocale = (value: string): Locale =>
  (routing.locales as readonly string[]).includes(value)
    ? (value as Locale)
    : routing.defaultLocale;

async function guardPublicForm(
  scope: string,
  limit: number,
  windowSeconds: number,
  captcha?: string,
) {
  const ip = await getClientIp();
  if (!(await consumeRateLimit(scope, ip, limit, windowSeconds))) return fail('rateLimited');
  if (!(await verifyTurnstile(captcha, ip))) return fail('captcha');
  return null;
}

export async function signInAction(
  input: SignInInput,
  options: { locale: string; next?: string; captcha?: string },
): Promise<ActionResult> {
  const locale = toLocale(options.locale);
  const blocked = await guardPublicForm('login-ip', 20, 15 * 60, options.captcha);
  if (blocked) return blocked;

  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return fail('invalid');
  if (!(await consumeRateLimit('login-email', parsed.data.email, 8, 15 * 60))) {
    return fail('rateLimited');
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Generic message: never reveal whether the e-mail exists.
    return fail(error.code === 'email_not_confirmed' ? 'emailNotConfirmed' : 'credentials');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', data.user.id)
    .single();
  const fallback = profile?.is_platform_admin ? `/${locale}/admin` : `/${locale}/app`;
  redirect(safeNextPath(options.next, fallback));
}

export async function signUpCarrierAction(
  input: SignUpCarrierInput,
  options: { locale: string; captcha?: string },
): Promise<ActionResult> {
  const locale = toLocale(options.locale);
  const blocked = await guardPublicForm('signup-ip', 5, 60 * 60, options.captcha);
  if (blocked) return blocked;

  const parsed = signUpCarrierSchema.safeParse(input);
  if (!parsed.success) return fail('invalid');

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${getPublicEnv().NEXT_PUBLIC_SITE_URL}/${locale}/app`,
      data: {
        full_name: parsed.data.fullName,
        locale,
        // Created by finalizePendingCompany once the e-mail is confirmed.
        pending_company: { legal_name: parsed.data.legalName, city_id: parsed.data.cityId },
      },
    },
  });

  // Same answer whether or not the address already exists (no account enumeration).
  if (error && error.code !== 'user_already_exists') {
    if (error.code === 'over_email_send_rate_limit') return fail('rateLimited');
    if (error.code === 'weak_password') return fail('invalid');
    console.error('sign-up failed', error.code);
    return fail('unknown');
  }
  return { ok: true };
}

export async function forgotPasswordAction(
  input: ForgotPasswordInput,
  options: { captcha?: string },
): Promise<ActionResult> {
  const blocked = await guardPublicForm('forgot-ip', 5, 60 * 60, options.captcha);
  if (blocked) return blocked;

  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return fail('invalid');

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email);
  if (error?.code === 'over_email_send_rate_limit') return fail('rateLimited');
  // Always the same answer, whether or not an account exists.
  return { ok: true };
}

export async function resetPasswordAction(
  input: ResetPasswordInput,
  options: { locale: string },
): Promise<ActionResult> {
  const locale = toLocale(options.locale);
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return fail('invalid');

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(error.code === 'weak_password' ? 'invalid' : 'unknown');
  redirect(`/${locale}/app`);
}

export async function signOutAction(locale: string) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${toLocale(locale)}`);
}

export type EnrollResult =
  { ok: true; factorId: string; qrCode: string; secret: string } | { ok: false; error: AuthError };

/** Starts TOTP enrollment (removing any abandoned, unverified factor first). */
export async function enrollTotpAction(): Promise<EnrollResult> {
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const factor of factors?.all ?? []) {
    if (factor.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'MoroccoTravelRide',
  });
  if (error) return { ok: false, error: 'unknown' };
  return { ok: true, factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

export async function verifyTotpAction(
  input: { factorId: string; code: string },
  options: { locale: string },
): Promise<ActionResult> {
  const locale = toLocale(options.locale);
  const parsed = mfaCodeSchema.safeParse({ code: input.code });
  if (!parsed.success) return fail('mfaCode');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await consumeRateLimit('mfa-user', user.id, 10, 15 * 60))) {
    return fail('rateLimited');
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: input.factorId,
    code: parsed.data.code,
  });
  if (error) return fail('mfaCode');
  redirect(`/${locale}/admin`);
}
