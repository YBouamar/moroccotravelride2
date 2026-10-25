/** Carrier onboarding (docs/UX.md 3.1): company, license document, first vehicle, first driver. */

export const ONBOARDING_STEPS = ['company', 'documents', 'vehicle', 'driver'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export interface CompanyProfileFields {
  legal_name: string | null;
  ice: string | null;
  if_number: string | null;
  rc_number: string | null;
  address: string | null;
  city_id: string | null;
  license_number: string | null;
  license_expires_on: string | null;
}

/** The fields required before the admin can verify the company. */
export function isCompanyProfileComplete(company: CompanyProfileFields): boolean {
  return [
    company.legal_name,
    company.ice,
    company.if_number,
    company.rc_number,
    company.address,
    company.city_id,
    company.license_number,
    company.license_expires_on,
  ].every((value) => typeof value === 'string' && value.trim().length > 0);
}

export interface OnboardingState {
  profileComplete: boolean;
  /** A tourism license document is uploaded (any verification status but rejected). */
  hasLicenseDocument: boolean;
  vehicleCount: number;
  driverCount: number;
}

export interface OnboardingProgress {
  steps: { key: OnboardingStep; done: boolean }[];
  doneCount: number;
  completed: boolean;
  /** First step not done yet, undefined when everything is done. */
  nextStep?: OnboardingStep;
}

export function onboardingProgress(state: OnboardingState): OnboardingProgress {
  const done: Record<OnboardingStep, boolean> = {
    company: state.profileComplete,
    documents: state.hasLicenseDocument,
    vehicle: state.vehicleCount > 0,
    driver: state.driverCount > 0,
  };
  const steps = ONBOARDING_STEPS.map((key) => ({ key, done: done[key] }));
  const doneCount = steps.filter((step) => step.done).length;
  return {
    steps,
    doneCount,
    completed: doneCount === steps.length,
    nextStep: steps.find((step) => !step.done)?.key,
  };
}
