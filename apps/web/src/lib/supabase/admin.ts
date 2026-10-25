import 'server-only';
import type { Database } from '@mtr/db';
import { createClient } from '@supabase/supabase-js';
import { getPublicEnv } from '@/lib/env';
import { getServerEnv } from '@/lib/env.server';

/**
 * Service role client: bypasses RLS. Only for server-side operations that have no user context
 * (rate limiting, system jobs). Never use it to read or write tenant data on behalf of a user.
 */
export function createAdminClient() {
  return createClient<Database>(
    getPublicEnv().NEXT_PUBLIC_SUPABASE_URL,
    getServerEnv().SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
