import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { getListAccess } from '@/features/fleet/access';
import { createDriverAction } from '@/features/onboarding/actions';
import { DriverForm } from '@/features/onboarding/components/driver-form';
import { FeatureGate } from '@/features/subscriptions/feature-gate';
import { asLocale } from '@/i18n/as-locale';

export async function generateMetadata() {
  const t = await getTranslations('drivers');
  return { title: t('new') };
}

export default async function NewDriverPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(asLocale((await params).locale));
  const [t, access] = await Promise.all([
    getTranslations(),
    getListAccess('drivers.read', 'drivers.manage'),
  ]);
  if (!access?.canManage) return <Alert>{t('lists.forbidden')}</Alert>;

  return (
    <FeatureGate feature="drivers">
      <Card className="mx-auto w-full max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold">{t('drivers.new')}</h1>
        <DriverForm
          action={createDriverAction}
          nextHref="/app/drivers"
          submitLabel={t('lists.create')}
        />
      </Card>
    </FeatureGate>
  );
}
