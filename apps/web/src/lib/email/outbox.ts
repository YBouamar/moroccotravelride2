import 'server-only';
import { getServerEnv } from '@/lib/env.server';
import { asAppLocale } from '@/lib/locale';
import { createAdminClient } from '@/lib/supabase/admin';
import { EMAIL_TEMPLATES, renderEmail, type EmailTemplate } from './templates';

/**
 * E-mail outbox (step 17). Rows are queued in the same request as the business change, then sent
 * right away when possible and retried by /api/cron/emails. Without RESEND_API_KEY (local, tests)
 * e-mails are marked "skipped": the content stays inspectable in the outbox.
 */

export interface QueuedEmail {
  to: string;
  template: EmailTemplate;
  locale: string;
  payload: Record<string, string>;
  bookingId?: string;
}

const MAX_ATTEMPTS = 5;

export async function queueEmails(emails: QueuedEmail[]): Promise<void> {
  if (emails.length === 0) return;
  const { error } = await createAdminClient()
    .from('email_outbox')
    .insert(
      emails.map((email) => ({
        to_email: email.to,
        template: email.template,
        locale: asAppLocale(email.locale),
        payload: email.payload,
        booking_id: email.bookingId ?? null,
      })),
    );
  // The booking itself is already saved: a failed queue is logged, never shown to the traveler.
  if (error) console.error('email queue failed', error.code);
}

async function send(to: string, subject: string, html: string, text: string) {
  const env = getServerEnv();
  if (!env.RESEND_API_KEY) return 'skipped' as const;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.EMAIL_FROM ?? 'MoroccoTravelRide <no-reply@example.com>',
      to: [to],
      subject,
      html,
      text,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`resend ${response.status}`);
  return 'sent' as const;
}

/** Sends up to `limit` pending e-mails. Returns how many were processed. */
export async function flushOutbox(limit = 20): Promise<number> {
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from('email_outbox')
    .select('id, to_email, template, locale, payload, attempts')
    .eq('status', 'pending')
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at')
    .limit(limit);
  if (error || !rows) return 0;

  for (const row of rows) {
    const template = (EMAIL_TEMPLATES as readonly string[]).includes(row.template)
      ? (row.template as EmailTemplate)
      : null;
    try {
      if (!template) throw new Error('unknown template');
      const email = await renderEmail(
        template,
        asAppLocale(row.locale),
        (row.payload ?? {}) as Record<string, string>,
      );
      const status = await send(row.to_email, email.subject, email.html, email.text);
      await admin
        .from('email_outbox')
        .update({
          status,
          attempts: row.attempts + 1,
          sent_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('id', row.id);
    } catch (cause) {
      const attempts = row.attempts + 1;
      await admin
        .from('email_outbox')
        .update({
          status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
          attempts,
          last_error: String(cause instanceof Error ? cause.message : cause).slice(0, 500),
        })
        .eq('id', row.id);
    }
  }
  return rows.length;
}
