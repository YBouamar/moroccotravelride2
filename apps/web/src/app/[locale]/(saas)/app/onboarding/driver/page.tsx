import { casablancaDate, isDocumentValidOn } from '@mtr/shared';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { DriverForm } from '@/features/onboarding/components/driver-form';
import { StepShell } from '@/features/onboarding/components/step-shell';
import { getOfficeContext } from '@/features/onboarding/office';
import { getOnboardingData } from '@/features/onboarding/queries';
import { asLocale } from '@/i18n/as-locale';

export default async function DriverStepPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(asLocale((await params).locale));
  const [t, context] = await Promise.all([getTranslations(), getOfficeContext()]);
  if (!context) return <Alert>{t('onboarding.officeOnly')}</Alert>;

  const { drivers } = await getOnboardingData(context.membership.companyId);
  const today = casablancaDate();
  // Q24: an expired license is accepted but warned about (no trip until it is valid again).
  const hasExpired = drivers.some((driver) => !isDocumentValidOn(driver.license_expires_on, today));

  return (
    <StepShell step="driver">
      {!context.canWrite ? <Alert tone="danger">{t('onboarding.errors.readOnly')}</Alert> : null}
      {drivers.length > 0 ? (
        <div className="mb-6">
          <h2 className="font-semibold">{t('driverForm.existing')}</h2>
          <ul className="mt-2 flex flex-col gap-2 text-sm">
            {drivers.map((driver) => (
              <li key={driver.id} className="flex flex-wrap items-center gap-2">
                {driver.full_name}
                {!isDocumentValidOn(driver.license_expires_on, today) ? (
                  <Badge>{t('driverForm.licenseExpired')}</Badge>
                ) : null}
              </li>
            ))}
          </ul>
          {hasExpired ? (
            <Alert tone="danger" className="mt-3">
              {t('driverForm.licenseExpiredWarning')}
            </Alert>
          ) : null}
        </div>
      ) : null}
      <DriverForm nextHref="/app/onboarding" />
    </StepShell>
  );
}
