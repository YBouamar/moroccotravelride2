import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { getPublicEnv } from './lib/env';
import { buildCsp } from './lib/security/csp';
import { authCookieOptions } from './lib/supabase/cookies';

const handleI18nRouting = createMiddleware(routing);

const LOCALES = routing.locales.join('|');
// Signed-in areas. Fine-grained checks (membership, admin + MFA) happen in their layouts and RLS.
const PROTECTED = new RegExp(`^/(${LOCALES})/(app|admin|mfa|reset-password)(/|$)`);
// Pages that make no sense once signed in.
const GUEST_ONLY = new RegExp(`^/(${LOCALES})/(login|signup)(/|$)`);

type PendingCookie = { name: string; value: string; options: Record<string, unknown> };

export default async function proxy(request: NextRequest) {
  const env = getPublicEnv();

  // 1. Per-request CSP nonce, forwarded to Next.js through the request headers.
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp({
    nonce,
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    isDev: process.env.NODE_ENV === 'development',
  });
  request.headers.set('x-nonce', nonce);
  request.headers.set('content-security-policy', csp);

  // 2. Refresh the Supabase session; refreshed cookies go to the request (for Server Components)
  //    and to the response (for the browser).
  const pending: PendingCookie[] = [];
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: authCookieOptions,
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const cookie of cookiesToSet) {
            request.cookies.set(cookie.name, cookie.value);
            pending.push(cookie);
          }
        },
      },
    },
  );
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  // 3. Coarse routing guard, then locale routing.
  const { pathname } = request.nextUrl;
  const locale = pathname.split('/')[1] ?? routing.defaultLocale;
  let response: NextResponse;

  if (PROTECTED.test(pathname) && !signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.search = `?next=${encodeURIComponent(pathname)}`;
    response = NextResponse.redirect(url);
  } else if (GUEST_ONLY.test(pathname) && signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/app`;
    url.search = '';
    response = NextResponse.redirect(url);
  } else {
    response = handleI18nRouting(request);
  }

  for (const { name, value, options } of pending) {
    response.cookies.set(name, value, { ...options, ...authCookieOptions });
  }
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
