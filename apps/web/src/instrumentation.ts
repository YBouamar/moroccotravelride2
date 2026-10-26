import * as Sentry from '@sentry/nextjs';
import { scrubEvent } from '@/lib/monitoring/scrub';

/**
 * Server and edge error monitoring (security audit 2026-10-26, finding 4). Disabled while
 * NEXT_PUBLIC_SENTRY_DSN is empty (local, tests). Every event is scrubbed before sending.
 */
export function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    beforeSend: (event) => scrubEvent(event),
    beforeSendTransaction: (event) => scrubEvent(event),
  });
}

export const onRequestError = Sentry.captureRequestError;
