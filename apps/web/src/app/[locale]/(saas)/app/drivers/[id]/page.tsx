import { casablancaDate, isDocumentValidOn, type DriverInput } from '@mtr/shared';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { StatusAction } from '@/components/list/status-action';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { setDriverStatusAction, updateDriverAction } from '@/features/fleet/actions';
import { getListAccess } from '@/features/fleet/access';
import { getDriver } from '@/features/fleet/queries';
import { DriverForm } from '@/features/onboarding/components/driver-form';
import { FeatureGate } from '@/features/subscriptions/feature-gate';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';

interface DriverPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function DriverPage({ params }: DriverPageProps) {
  const { locale, id } = await params;
  setRequestLocale(asLocale(locale));
  const [t, access] = await Promise.all([
    getTranslations(),
    getListAccess('drivers.read', 'drivers.manage'),
  ]);
  if (!access) return <Alert>{t('lists.forbidden')}</Alert>;
  const driver = await getDriver(access.companyId, id);
  if (!driver) notFound();

  const licenseValid = isDocumentValidOn(driver.license_expires_on, casablancaDate());
  const nextStatus = driver.status === 'active' ? 'inactive' : 'active';

  return (
    <FeatureGate feature="drivers">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Link href="/app/drivers" className="text-sm font-medium text-secondary underline">
          {t('lists.back')}
        </Link>
        {!licenseValid ? (
          <Alert tone="danger">{t('driverForm.licenseExpiredWarning')}</Alert>
        ) : null}
        <Card>
          <h1 className="mb-6 text-2xl font-bold">{driver.full_name}</h1>
          {access.canManage ? (
            <DriverForm
              action={updateDriverAction.bind(null, driver.id)}
              nextHref="/app/drivers"
              submitLabel={t('lists.saveChanges')}
              initial={{
                fullName: driver.full_name,
                phone: driver.phone,
                licenseNumber: driver.license_number,
                licenseExpiresOn: driver.license_expires_on,
                professionalCardNumber: driver.professional_card_number ?? '',
                professionalCardExpiresOn: driver.professional_card_expires_on ?? '',
                languages: driver.languages as DriverInput['languages'],
              }}
            />
          ) : (
            <p className="text-sm text-muted">{t(`driverStatus.${driver.status}`)}</p>
          )}
        </Card>
        {access.canManage ? (
          <Card>
            <h2 className="font-semibold">{t('lists.statusTitle')}</h2>
            <p className="mt-1 text-sm text-muted">
              {t('lists.currentStatus', { status: t(`driverStatus.${driver.status}`) })}
            </p>
            <div className="mt-4">
              <StatusAction
                label={t(`drivers.setStatus.${nextStatus}`)}
                description={t(`drivers.setStatusHelp.${nextStatus}`)}
                action={setDriverStatusAction.bind(null, driver.id, nextStatus)}
              />
            </div>
          </Card>
        ) : null}
      </div>
    </FeatureGate>
  );
}
