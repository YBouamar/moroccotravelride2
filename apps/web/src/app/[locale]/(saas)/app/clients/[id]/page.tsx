import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { StatusAction } from '@/components/list/status-action';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { setClientActiveAction, updateClientAction } from '@/features/fleet/actions';
import { getListAccess } from '@/features/fleet/access';
import { ClientForm } from '@/features/fleet/components/client-form';
import { getClient } from '@/features/fleet/queries';
import { FeatureGate } from '@/features/subscriptions/feature-gate';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';

interface ClientPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function ClientPage({ params }: ClientPageProps) {
  const { locale, id } = await params;
  setRequestLocale(asLocale(locale));
  const [t, access] = await Promise.all([
    getTranslations(),
    getListAccess('clients.read', 'clients.manage'),
  ]);
  if (!access) return <Alert>{t('lists.forbidden')}</Alert>;
  const client = await getClient(access.companyId, id);
  if (!client) notFound();

  const next = client.is_active ? 'inactive' : 'active';

  return (
    <FeatureGate feature="clients">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Link href="/app/clients" className="text-sm font-medium text-secondary underline">
          {t('lists.back')}
        </Link>
        <Card>
          <h1 className="mb-6 text-2xl font-bold">{client.name}</h1>
          {access.canManage ? (
            <ClientForm
              action={updateClientAction.bind(null, client.id)}
              nextHref="/app/clients"
              submitLabel={t('lists.saveChanges')}
              initial={{
                type: client.type,
                name: client.name,
                ice: client.ice ?? '',
                email: client.email ?? '',
                phone: client.phone ?? '',
                address: client.address ?? '',
                notes: client.notes ?? '',
              }}
            />
          ) : (
            <dl className="grid gap-2 text-sm">
              <dt className="text-muted">{t('clientForm.type')}</dt>
              <dd>{t(`clientType.${client.type}`)}</dd>
              <dt className="text-muted">{t('clients.contact')}</dt>
              <dd dir="ltr">{[client.email, client.phone].filter(Boolean).join(' · ')}</dd>
            </dl>
          )}
        </Card>
        {access.canManage ? (
          <Card>
            <h2 className="font-semibold">{t('lists.statusTitle')}</h2>
            <p className="mt-1 text-sm text-muted">
              {t('lists.currentStatus', {
                status: t(`clientStatus.${client.is_active ? 'active' : 'inactive'}`),
              })}
            </p>
            <div className="mt-4">
              <StatusAction
                label={t(`clients.setStatus.${next}`)}
                description={t(`clients.setStatusHelp.${next}`)}
                action={setClientActiveAction.bind(null, client.id, next === 'active')}
              />
            </div>
          </Card>
        ) : null}
      </div>
    </FeatureGate>
  );
}
