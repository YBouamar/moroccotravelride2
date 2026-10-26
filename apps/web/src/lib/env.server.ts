import 'server-only';
import { createHmac } from 'node:crypto';
import { z } from 'zod';

const serverEnvSchema = z.object({
  // Service role key: bypasses RLS. Server only, never exposed (CLAUDE.md rule 11).
  SUPABASE_SECRET_KEY: z.string().min(1),
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
  RATE_LIMIT_SALT: z.string().min(32),
  // Signs the guest booking links; derived from RATE_LIMIT_SALT when not set (see below).
  BOOKING_LINK_SECRET: z.string().min(32).optional(),
  // E-mail sending (Resend). Without a key, e-mails stay in the outbox as "skipped".
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(3).optional(),
  // Shared secret of the scheduled call that flushes the e-mail outbox (/api/cron/emails).
  CRON_SECRET: z.string().min(32).optional(),
  NEXT_PUBLIC_SITE_URL: z.url().optional(),
});

let cached: z.infer<typeof serverEnvSchema> | undefined;

export function getServerEnv() {
  cached ??= serverEnvSchema.parse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY || undefined,
    RATE_LIMIT_SALT: process.env.RATE_LIMIT_SALT,
    BOOKING_LINK_SECRET: process.env.BOOKING_LINK_SECRET || undefined,
    RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
    EMAIL_FROM: process.env.EMAIL_FROM || undefined,
    CRON_SECRET: process.env.CRON_SECRET || undefined,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  });
  return cached;
}

/**
 * Key of the booking magic links: BOOKING_LINK_SECRET, or a key derived from RATE_LIMIT_SALT
 * with a distinct label so that the two uses never share the same key material.
 */
export function getBookingLinkSecret(): string {
  const env = getServerEnv();
  return (
    env.BOOKING_LINK_SECRET ??
    createHmac('sha256', env.RATE_LIMIT_SALT).update('mtr-booking-link-key').digest('hex')
  );
}
