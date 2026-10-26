import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { createClientAction } from '@/features/fleet/actions';
import { getListAccess } from '@/features/fleet/access';
import { ClientForm } from '@/features/fleet/components/client-form';
import { FeatureGate } from '@/features/subscriptions/feature-gate';
import { asLocale } from '@/i18n/as-locale';

export async function generateMetadata() {
  const t = await getTranslations('clients');
  return { title: t('new') };
}

export default async function NewClientPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(asLocale((await params).locale));
  const [t, access] = await Promise.all([
    getTranslations(),
    getListAccess('clients.read', 'clients.manage'),
  ]);
  if (!access?.canManage) return <Alert>{t('lists.forbidden')}</Alert>;

  return (
    <FeatureGate feature="clients">
      <Card className="mx-auto w-full max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold">{t('clients.new')}</h1>
        <ClientForm
          action={createClientAction}
          nextHref="/app/clients"
          submitLabel={t('lists.create')}
        />
      </Card>
    </FeatureGate>
  );
}
