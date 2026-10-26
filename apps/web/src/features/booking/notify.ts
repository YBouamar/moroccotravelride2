import 'server-only';
import { formatMoney } from '@mtr/shared';
import { after } from 'next/server';
import { getBookingLinkSecret, getServerEnv } from '@/lib/env.server';
import { flushOutbox, queueEmails, type QueuedEmail } from '@/lib/email/outbox';
import type { EmailTemplate } from '@/lib/email/templates';
import { asAppLocale } from '@/lib/locale';
import { bookingLinkExpiry, createBookingToken } from '@/lib/security/booking-link';
import { createAdminClient } from '@/lib/supabase/admin';

/** E-mails of the booking lifecycle (step 17): traveler and carrier office members. */

export function bookingLink(booking: {
  public_ref: string;
  traveler_email: string;
  pickup_at: string;
  locale: string;
}) {
  const token = createBookingToken({
    secret: getBookingLinkSecret(),
    ref: booking.public_ref,
    email: booking.traveler_email,
    expiresAt: bookingLinkExpiry(new Date(booking.pickup_at)),
  });
  const site = getServerEnv().NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return {
    token,
    url: `${site}/${asAppLocale(booking.locale)}/booking/${booking.public_ref}#t=${token}`,
  };
}

interface BookingForEmail {
  id: string;
  company_id: string;
  public_ref: string;
  traveler_name: string;
  traveler_email: string;
  pickup_at: string;
  locale: string;
  total_cents: number;
}

/**
 * Queues the traveler e-mail (with the magic link) and, optionally, the carrier e-mails, then
 * flushes the outbox after the response so the user never waits for the provider.
 */
export async function notifyBooking(
  booking: BookingForEmail,
  templates: { traveler?: EmailTemplate; carrier?: EmailTemplate },
  extra: Record<string, string> = {},
) {
  const locale = asAppLocale(booking.locale);
  const payload = {
    ref: booking.public_ref,
    name: booking.traveler_name,
    total: formatMoney(booking.total_cents, locale),
    date: new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA-u-nu-latn' : `${locale}-MA`, {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'Africa/Casablanca',
    }).format(new Date(booking.pickup_at)),
    ...extra,
  };
  const emails: QueuedEmail[] = [];
  if (templates.traveler) {
    emails.push({
      to: booking.traveler_email,
      template: templates.traveler,
      locale,
      payload: { ...payload, link: bookingLink(booking).url },
      bookingId: booking.id,
    });
  }
  if (templates.carrier) {
    const { data: recipients } = await createAdminClient().rpc('booking_notification_recipients', {
      p_company: booking.company_id,
    });
    const site = getServerEnv().NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    for (const recipient of recipients ?? []) {
      emails.push({
        to: recipient.email,
        template: templates.carrier,
        locale: recipient.locale,
        payload: { ...payload, link: `${site}/${asAppLocale(recipient.locale)}/app/bookings` },
        bookingId: booking.id,
      });
    }
  }
  await queueEmails(emails);
  after(() =>
    flushOutbox().catch((cause) =>
      // Message only: a provider error may quote an e-mail address.
      console.error('outbox flush failed', cause instanceof Error ? cause.name : 'unknown'),
    ),
  );
}
