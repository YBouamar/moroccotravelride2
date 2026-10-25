import 'server-only';
import { createHash } from 'node:crypto';
import { getServerEnv } from '@/lib/env.server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Counts one hit for `subject` (IP, email...) in `scope` and tells whether it is still allowed.
 * Subjects are salted and hashed: no raw IP or email is stored (data minimization, law 09-08).
 * Fails closed: if the check cannot run, the action is refused.
 */
export async function consumeRateLimit(
  scope: string,
  subject: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const digest = createHash('sha256')
    .update(`${subject}:${getServerEnv().RATE_LIMIT_SALT}`)
    .digest('hex')
    .slice(0, 40);

  const { data, error } = await createAdminClient().rpc('consume_rate_limit', {
    p_key: `${scope}:${digest}`,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error('rate limit check failed', error.code);
    return false;
  }
  return data === true;
}
