import {
  BOOKING_STATUSES,
  can,
  formatMoney,
  minutesToAccept,
  parsePage,
  type BookingStatus,
} from '@mtr/shared';
import { Clock, Route } from 'lucide-react';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Pagination } from '@/components/list/pagination';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { BookingActions } from '@/features/bookings/components/booking-actions';
import { listCarrierBookings } from '@/features/bookings/queries';
import { getCompanyContext } from '@/features/companies/context';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';

export async function generateMetadata() {
  const t = await getTranslations('bookings');
  return { title: t('title') };
}

export default async function CarrierBookingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const query = await searchParams;
  const [t, format, context] = await Promise.all([
    getTranslations(),
    getFormatter(),
    getCompanyContext(),
  ]);
  if (!context || !can(context.membership.role, 'bookings.read'))
    return <Alert>{t('lists.forbidden')}</Alert>;
  const page = parsePage(query.page);
  const { rows, total } = await listCarrierBookings(context.membership.companyId, {
    status: query.status,
    page,
  });
  const role = context.membership.role;
  const now = new Date();
  const name = (place: { name_fr: string; name_en: string; name_ar: string } | null) =>
    place ? place[`name_${locale}`] : '';

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t('bookings.title')}</h1>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t('lists.status')}
          <Select name="status" defaultValue={query.status ?? ''} className="w-56">
            <option value="">{t('lists.all')}</option>
            {BOOKING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(`booking.status.${status}`)}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" variant="secondary">
          {t('lists.apply')}
        </Button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={Route}
          title={t('bookings.empty.title')}
          description={t('bookings.empty.text')}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((booking) => {
            const status = booking.status as BookingStatus;
            const pending = status === 'pending_carrier';
            return (
              <li key={booking.id}>
                <Card
                  className={
                    pending ? 'flex flex-col gap-3 border-secondary' : 'flex flex-col gap-3'
                  }
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">
                      <span dir="ltr">{booking.public_ref}</span> · {name(booking.from)} /{' '}
                      {name(booking.to)}
                    </p>
                    <span className="flex flex-wrap gap-2">
                      <Badge variant={pending ? 'neutral' : 'verified'}>
                        {t(`booking.status.${status}`)}
                      </Badge>
                      <Badge>{t(`booking.paymentStatus.${booking.payment_status}`)}</Badge>
                    </span>
                  </div>
                  {pending ? (
                    <p className="flex items-center gap-2 text-sm font-medium text-danger">
                      <Clock aria-hidden="true" className="size-4" />
                      {t('bookings.deadline', {
                        minutes: minutesToAccept(new Date(booking.accept_deadline), now),
                      })}
                    </p>
                  ) : null}
                  <div className="grid gap-1 text-sm sm:grid-cols-2">
                    <p>
                      {format.dateTime(new Date(booking.pickup_at), {
                        dateStyle: 'full',
                        timeStyle: 'short',
                      })}
                    </p>
                    <p>
                      {name(booking.vehicle_type)} ·{' '}
                      {t('booking.passengers', { count: booking.passengers })}
                    </p>
                    <p>{t('booking.pickup', { address: booking.pickup_address })}</p>
                    <p>{t('booking.dropoff', { address: booking.dropoff_address })}</p>
                    <p>
                      {booking.traveler_name} · <span dir="ltr">{booking.traveler_phone}</span>
                    </p>
                    <p>
                      {t(`booking.paymentMethod.${booking.payment_method}`)}
                      {booking.flight_number
                        ? ` · ${t('booking.flight', { number: booking.flight_number })}`
                        : null}
                    </p>
                  </div>
                  <p className="text-sm">
                    {t('bookings.amounts', {
                      total: formatMoney(booking.total_cents, locale),
                      commission: formatMoney(booking.commission_cents, locale),
                      carrier: formatMoney(booking.carrier_cents, locale),
                    })}
                  </p>
                  {booking.cancel_reason ? (
                    <p className="text-sm text-muted">
                      {t('bookings.cancelReason', {
                        reason:
                          booking.cancel_reason === 'expired'
                            ? t('bookings.expired')
                            : booking.cancel_reason,
                      })}
                    </p>
                  ) : null}
                  {booking.trip_id ? (
                    <Link
                      href={`/app/trips/${booking.trip_id}`}
                      className="text-sm font-medium text-secondary underline"
                    >
                      {t('bookings.openTrip')}
                    </Link>
                  ) : null}
                  <BookingActions
                    bookingId={booking.id}
                    status={status}
                    paymentStatus={booking.payment_status}
                    refundDue={booking.refund_cents > 0}
                    canRespond={can(role, 'bookings.respond')}
                    canConfirmPayment={can(role, 'invoices.manage')}
                  />
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination
        basePath="/app/bookings"
        params={{ status: query.status }}
        page={page}
        total={total}
      />
    </div>
  );
}
