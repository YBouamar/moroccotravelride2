import { can, casablancaDate, isIsoDay } from '@mtr/shared';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { getListAccess } from '@/features/fleet/access';
import { FeatureGate } from '@/features/subscriptions/feature-gate';
import { createTripAction } from '@/features/trips/actions';
import { TripForm } from '@/features/trips/components/trip-form';
import { emptyTripInput } from '@/features/trips/form-values';
import { getAssignmentOptions, getPlaceOptions } from '@/features/trips/queries';
import { asLocale } from '@/i18n/as-locale';

export async function generateMetadata() {
  const t = await getTranslations('trips');
  return { title: t('new') };
}

interface NewTripPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ date?: string }>;
}

export default async function NewTripPage({ params, searchParams }: NewTripPageProps) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const requested = (await searchParams).date;
  const [t, access] = await Promise.all([
    getTranslations(),
    getListAccess('trips.read', 'trips.manage'),
  ]);
  if (!access?.canManage) return <Alert>{t('lists.forbidden')}</Alert>;
  const [places, options] = await Promise.all([
    getPlaceOptions(locale),
    getAssignmentOptions(access.companyId),
  ]);

  return (
    <FeatureGate feature="trips">
      <Card className="mx-auto w-full max-w-3xl">
        <h1 className="mb-6 text-2xl font-bold">{t('trips.new')}</h1>
        <TripForm
          action={createTripAction}
          places={places}
          options={options}
          initial={emptyTripInput(isIsoDay(requested) ? requested : casablancaDate())}
          canOverride={can(access.context.membership.role, 'trips.overrideConflicts')}
          submitLabel={t('lists.create')}
        />
      </Card>
    </FeatureGate>
  );
}
