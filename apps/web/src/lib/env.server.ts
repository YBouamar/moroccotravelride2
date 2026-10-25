import 'server-only';
import { z } from 'zod';

const serverEnvSchema = z.object({
  // Service role key: bypasses RLS. Server only, never exposed (CLAUDE.md rule 11).
  SUPABASE_SECRET_KEY: z.string().min(1),
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
  RATE_LIMIT_SALT: z.string().min(32),
});

let cached: z.infer<typeof serverEnvSchema> | undefined;

export function getServerEnv() {
  cached ??= serverEnvSchema.parse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY || undefined,
    RATE_LIMIT_SALT: process.env.RATE_LIMIT_SALT,
  });
  return cached;
}
