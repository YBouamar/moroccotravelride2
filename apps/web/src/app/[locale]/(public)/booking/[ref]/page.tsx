import {
  canTravelerCancel,
  computeTravelerCancellation,
  formatMoney,
  PUBLIC_REF_PATTERN,
  type BookingStatus,
  type CancellationPolicy,
} from '@mtr/shared';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { CancelBooking } from '@/features/booking/components/cancel-booking';
import { ReviewForm } from '@/features/reviews/components/review-form';
import { getGuestBooking } from '@/features/booking/queries';
import { asLocale } from '@/i18n/as-locale';
import { getBookingLinkSecret } from '@/lib/env.server';
import { verifyBookingToken } from '@/lib/security/booking-link';

export async function generateMetadata() {
  const t = await getTranslations('booking');
  // Private page: never indexed, never cached by shared caches.
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function GuestBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; ref: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { locale: rawLocale, ref } = await params;
  const locale = asLocale(rawLocale);
  setRequestLocale(locale);
  const token = (await searchParams).t ?? '';
  const [t, format] = await Promise.all([getTranslations('booking'), getFormatter()]);

  const booking = PUBLIC_REF_PATTERN.test(ref) ? await getGuestBooking(ref) : null;
  // Same answer for an unknown reference and a bad link: no way to probe references.
  if (
    !booking ||
    !verifyBookingToken({
      secret: getBookingLinkSecret(),
      ref,
      email: booking.traveler_email,
      token,
    })
  ) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Alert tone="danger">{t('errors.link')}</Alert>
      </div>
    );
  }

  const status = booking.status as BookingStatus;
  const name = (place: { name_fr: string; name_en: string; name_ar: string } | null) =>
    place ? place[`name_${locale}`] : '';
  const carrier = booking.company?.trade_name ?? booking.company?.legal_name ?? '';
  const paid = booking.payment_status === 'paid';
  const preview = computeTravelerCancellation({
    policy: booking.cancellation_policy as unknown as CancellationPolicy,
    pickupAt: new Date(booking.pickup_at),
    now: new Date(),
    totalCents: booking.total_cents,
    commissionRateBps: 0,
    paid,
  });
  const policyText = paid
    ? t('cancel.refundPreview', {
        percent: preview.refundBps / 100,
        amount: formatMoney(preview.refundCents, locale),
      })
    : t('cancel.unpaid');
  const showBank =
    booking.payment_method === 'bank_transfer' &&
    (status === 'confirmed' || status === 'assigned') &&
    !paid &&
    booking.company?.bank_rib;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('heading', { ref: booking.public_ref })}</h1>
        <Badge variant={status === 'confirmed' || status === 'assigned' ? 'verified' : 'neutral'}>
          {t(`status.${status}`)}
        </Badge>
      </div>
      <Alert tone={status.startsWith('cancelled') ? 'danger' : undefined}>
        {t(`statusText.${status}`, { carrier })}
      </Alert>

      <Card className="flex flex-col gap-2 text-sm">
        <CardTitle>{t('details')}</CardTitle>
        <p className="text-base font-medium">
          {name(booking.from)} / {name(booking.to)}
        </p>
        <p>
          {format.dateTime(new Date(booking.pickup_at), { dateStyle: 'full', timeStyle: 'short' })}
        </p>
        <p>{t('pickup', { address: booking.pickup_address })}</p>
        <p>{t('dropoff', { address: booking.dropoff_address })}</p>
        <p>
          {name(booking.vehicle_type)} · {t('passengers', { count: booking.passengers })}
          {booking.flight_number ? ` · ${t('flight', { number: booking.flight_number })}` : null}
        </p>
        <p>{t('carrier', { name: carrier })}</p>
        <p className="mt-2 text-xl font-bold">{formatMoney(booking.total_cents, locale)}</p>
        <p className="text-muted">
          {t(`paymentMethod.${booking.payment_method}`)} ·{' '}
          {t(`paymentStatus.${booking.payment_status}`)}
        </p>
        {booking.refund_cents > 0 ? (
          <p className="font-medium">
            {t('refundDue', { amount: formatMoney(booking.refund_cents, locale) })}
          </p>
        ) : null}
      </Card>

      {showBank ? (
        <Card className="flex flex-col gap-1 text-sm">
          <CardTitle>{t('bank.title')}</CardTitle>
          <p>{t('bank.text', { ref: booking.public_ref })}</p>
          <p>{booking.company?.bank_name}</p>
          <p dir="ltr" className="font-mono">
            {booking.company?.bank_rib}
          </p>
        </Card>
      ) : null}

      {status === 'completed' ? (
        <Card className="flex flex-col gap-3">
          <CardTitle>{t('review.title')}</CardTitle>
          <ReviewForm bookingRef={booking.public_ref} token={token} />
        </Card>
      ) : null}

      {canTravelerCancel(status) ? (
        <Card className="flex flex-col gap-3">
          <CardTitle>{t('cancel.title')}</CardTitle>
          <p className="text-sm text-muted">{policyText}</p>
          <CancelBooking bookingRef={booking.public_ref} token={token} policyText={policyText} />
        </Card>
      ) : null}
    </div>
  );
}
