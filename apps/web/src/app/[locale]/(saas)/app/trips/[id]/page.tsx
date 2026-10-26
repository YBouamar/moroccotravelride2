import { can, formatMoney, isOpenTrip } from '@mtr/shared';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { getListAccess } from '@/features/fleet/access';
import { FeatureGate } from '@/features/subscriptions/feature-gate';
import { updateTripAction } from '@/features/trips/actions';
import { TripStatusBadge } from '@/features/trips/components/trip-card';
import { TripForm } from '@/features/trips/components/trip-form';
import { TripStatusActions } from '@/features/trips/components/trip-status-actions';
import { tripToInput } from '@/features/trips/form-values';
import { getAssignmentOptions, getPlaceOptions, getTrip } from '@/features/trips/queries';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';

interface TripPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function TripPage({ params }: TripPageProps) {
  const { locale: rawLocale, id } = await params;
  const locale = asLocale(rawLocale);
  setRequestLocale(locale);
  const [t, format, access] = await Promise.all([
    getTranslations(),
    getFormatter(),
    getListAccess('trips.read', 'trips.manage'),
  ]);
  if (!access) return <Alert>{t('lists.forbidden')}</Alert>;
  const trip = await getTrip(access.companyId, id);
  if (!trip) notFound();

  const editable = access.canManage && isOpenTrip(trip.status);
  const [places, options] = editable
    ? await Promise.all([getPlaceOptions(locale), getAssignmentOptions(access.companyId)])
    : [[], null];

  return (
    <FeatureGate feature="trips">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Link href="/app/trips" className="text-sm font-medium text-secondary underline">
          {t('lists.back')}
        </Link>
        <Card className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">{trip.passenger_name}</h1>
            <TripStatusBadge status={trip.status} />
          </div>
          <p className="text-sm text-muted">
            {format.dateTime(new Date(trip.starts_at), { dateStyle: 'full', timeStyle: 'short' })}
            {trip.price_cents !== null ? ` · ${formatMoney(trip.price_cents, locale)}` : null}
            {trip.origin === 'marketplace' ? ` · ${t('trips.fromMarketplace')}` : null}
          </p>
          {trip.conflict_override ? (
            <Alert>{t('trips.overridden', { reason: trip.override_reason ?? '' })}</Alert>
          ) : null}
          {trip.cancel_reason ? (
            <Alert tone="danger">
              {t('trips.cancelledBecause', { reason: trip.cancel_reason })}
            </Alert>
          ) : null}
          {access.canManage ? <TripStatusActions tripId={trip.id} status={trip.status} /> : null}
        </Card>
        {editable && options ? (
          <Card>
            <h2 className="mb-6 text-lg font-semibold">{t('trips.edit')}</h2>
            <TripForm
              action={updateTripAction.bind(null, trip.id)}
              places={places}
              options={options}
              initial={tripToInput(trip)}
              canOverride={can(access.context.membership.role, 'trips.overrideConflicts')}
              submitLabel={t('lists.saveChanges')}
            />
          </Card>
        ) : null}
      </div>
    </FeatureGate>
  );
}
