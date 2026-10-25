import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Alert } from '@/components/ui/alert';
import { CompanyProfileForm } from '@/features/onboarding/components/company-profile-form';
import { StepShell } from '@/features/onboarding/components/step-shell';
import { getOfficeContext } from '@/features/onboarding/office';
import { getOnboardingData } from '@/features/onboarding/queries';
import { getCityOptions } from '@/features/reference/queries';
import { asLocale } from '@/i18n/as-locale';

export default async function CompanyStepPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const context = await getOfficeContext();
  if (!context) return <Alert>{(await getTranslations('onboarding'))('officeOnly')}</Alert>;

  const [{ company }, cities] = await Promise.all([
    getOnboardingData(context.membership.companyId),
    getCityOptions(locale),
  ]);

  return (
    <StepShell step="company">
      <CompanyProfileForm
        cities={cities}
        initial={{
          legalName: company.legal_name,
          tradeName: company.trade_name ?? '',
          ice: company.ice ?? '',
          ifNumber: company.if_number ?? '',
          rcNumber: company.rc_number ?? '',
          tpNumber: company.tp_number ?? '',
          address: company.address ?? '',
          cityId: company.city_id ?? '',
          licenseNumber: company.license_number ?? '',
          licenseExpiresOn: company.license_expires_on ?? '',
        }}
      />
    </StepShell>
  );
}
