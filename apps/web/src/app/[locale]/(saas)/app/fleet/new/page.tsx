import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { getListAccess } from '@/features/fleet/access';
import { createVehicleAction } from '@/features/onboarding/actions';
import { VehicleForm } from '@/features/onboarding/components/vehicle-form';
import { getVehicleTypeOptions } from '@/features/reference/queries';
import { FeatureGate } from '@/features/subscriptions/feature-gate';
import { asLocale } from '@/i18n/as-locale';

export async function generateMetadata() {
  const t = await getTranslations('fleet');
  return { title: t('new') };
}

export default async function NewVehiclePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const [t, access, types] = await Promise.all([
    getTranslations(),
    getListAccess('vehicles.read', 'vehicles.manage'),
    getVehicleTypeOptions(locale),
  ]);
  if (!access?.canManage) return <Alert>{t('lists.forbidden')}</Alert>;

  return (
    <FeatureGate feature="vehicles">
      <Card className="mx-auto w-full max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold">{t('fleet.new')}</h1>
        <VehicleForm
          types={types}
          action={createVehicleAction}
          nextHref="/app/fleet"
          submitLabel={t('lists.create')}
        />
      </Card>
    </FeatureGate>
  );
}
