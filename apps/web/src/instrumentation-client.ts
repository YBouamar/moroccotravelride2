import * as Sentry from '@sentry/nextjs';
import { scrubEvent } from '@/lib/monitoring/scrub';

// Browser error monitoring, same rules as the server: off without DSN, no PII, scrubbed events.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    // No session replay: it would record what travelers type.
    integrations: [],
    beforeSend: (event) => scrubEvent(event),
    beforeSendTransaction: (event) => scrubEvent(event),
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
