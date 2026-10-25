import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Alert } from '@/components/ui/alert';
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

  return (
    <StepShell step="driver">
      {!context.canWrite ? <Alert tone="danger">{t('onboarding.errors.readOnly')}</Alert> : null}
      {drivers.length > 0 ? (
        <div className="mb-6">
          <h2 className="font-semibold">{t('driverForm.existing')}</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {drivers.map((driver) => (
              <li key={driver.id}>{driver.full_name}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <DriverForm nextHref="/app/onboarding" />
    </StepShell>
  );
}
