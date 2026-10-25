const TURNSTILE = 'https://challenges.cloudflare.com';

/**
 * Strict Content Security Policy with a per-request nonce (docs/SECURITY.md 2.3).
 * Scripts: only nonce-bearing scripts and what they load ('strict-dynamic').
 * Styles keep 'unsafe-inline' (inline styles injected by Next.js and next/font): accepted risk,
 * styles cannot execute code.
 */
export function buildCsp({
  nonce,
  supabaseUrl,
  isDev,
}: {
  nonce: string;
  supabaseUrl: string;
  isDev: boolean;
}): string {
  const supabase = new URL(supabaseUrl);
  const realtime = `${supabase.protocol === 'https:' ? 'wss' : 'ws'}://${supabase.host}`;

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      TURNSTILE,
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'", supabase.origin, realtime, TURNSTILE],
    'frame-src': [TURNSTILE],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
  };

  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(' ')}`);
  if (!isDev) policy.push('upgrade-insecure-requests');
  return policy.join('; ');
}
