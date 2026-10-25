import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { finalizePendingCompany } from '@/features/companies/memberships';
import { routing } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_TYPES = new Set<EmailOtpType>(['email', 'signup', 'recovery', 'email_change']);

/**
 * Target of the links in the auth e-mails (supabase/templates): verifies the one-time token,
 * opens the session, then sends the user to the right page in their language.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const requestedLocale = searchParams.get('locale') ?? '';
  const locale = (routing.locales as readonly string[]).includes(requestedLocale)
    ? requestedLocale
    : routing.defaultLocale;

  const redirectTo = (path: string) =>
    NextResponse.redirect(new URL(`/${locale}${path}`, request.url));

  if (!tokenHash || !type || !ALLOWED_TYPES.has(type)) return redirectTo('/login?error=link');

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return redirectTo('/login?error=link');

  if (type === 'recovery') return redirectTo('/reset-password');
  await finalizePendingCompany(supabase);
  return redirectTo('/app');
}
