import 'server-only';
import { isCompanyProfileComplete, onboardingProgress } from '@mtr/shared';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

/** Everything the onboarding needs for one company (RLS: owners and managers). */
export const getOnboardingData = cache(async (companyId: string) => {
  const supabase = await createClient();
  const [company, documents, vehicles, drivers] = await Promise.all([
    supabase
      .from('companies')
      .select(
        'legal_name, trade_name, ice, if_number, rc_number, tp_number, address, city_id, license_number, license_expires_on',
      )
      .eq('id', companyId)
      .single(),
    supabase
      .from('company_documents')
      .select('id, type, verification_status, rejection_reason, expires_on, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false }),
    supabase
      .from('vehicles')
      .select('id, registration, brand, model')
      .eq('company_id', companyId)
      .order('created_at'),
    supabase
      .from('drivers')
      .select('id, full_name, license_expires_on')
      .eq('company_id', companyId)
      .order('created_at'),
  ]);
  if (company.error) throw company.error;

  const documentList = documents.data ?? [];
  return {
    company: company.data,
    documents: documentList,
    vehicles: vehicles.data ?? [],
    drivers: drivers.data ?? [],
    progress: onboardingProgress({
      profileComplete: isCompanyProfileComplete(company.data),
      hasLicenseDocument: documentList.some(
        (document) =>
          document.type === 'tourism_license' && document.verification_status !== 'rejected',
      ),
      vehicleCount: vehicles.data?.length ?? 0,
      driverCount: drivers.data?.length ?? 0,
    }),
  };
});
