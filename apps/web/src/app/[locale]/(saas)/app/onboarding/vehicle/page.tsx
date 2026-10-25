import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Alert } from '@/components/ui/alert';
import { StepShell } from '@/features/onboarding/components/step-shell';
import { VehicleForm } from '@/features/onboarding/components/vehicle-form';
import { getOfficeContext } from '@/features/onboarding/office';
import { getOnboardingData } from '@/features/onboarding/queries';
import { getVehicleTypeOptions } from '@/features/reference/queries';
import { asLocale } from '@/i18n/as-locale';

export default async function VehicleStepPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const [t, context] = await Promise.all([getTranslations(), getOfficeContext()]);
  if (!context) return <Alert>{t('onboarding.officeOnly')}</Alert>;

  const [{ vehicles }, types] = await Promise.all([
    getOnboardingData(context.membership.companyId),
    getVehicleTypeOptions(locale),
  ]);

  return (
    <StepShell step="vehicle">
      {!context.canWrite ? <Alert tone="danger">{t('onboarding.errors.readOnly')}</Alert> : null}
      {vehicles.length > 0 ? (
        <div className="mb-6">
          <h2 className="font-semibold">{t('vehicleForm.existing')}</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {vehicles.map((vehicle) => (
              <li key={vehicle.id}>
                <span dir="ltr">{vehicle.registration}</span> · {vehicle.brand} {vehicle.model}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <VehicleForm types={types} nextHref="/app/onboarding/driver" />
    </StepShell>
  );
}
