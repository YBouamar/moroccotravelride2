import 'server-only';
import type { Database } from '@mtr/db';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getPublicEnv } from '@/lib/env';
import { authCookieOptions } from './cookies';

/** Supabase client acting as the signed-in user: every query goes through RLS. */
export async function createClient() {
  const cookieStore = await cookies();
  const env = getPublicEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: authCookieOptions,
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, { ...options, ...authCookieOptions });
            }
          } catch {
            // Called from a Server Component: cookies are read-only there, the proxy refreshes them.
          }
        },
      },
    },
  );
}
