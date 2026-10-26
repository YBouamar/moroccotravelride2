'use client';

import { useTranslations } from 'next-intl';
import { Alert } from '@/components/ui/alert';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { useOnboardingAction } from '@/features/onboarding/components/use-onboarding-action';
import type { FormResult } from '@/lib/action-result';

interface StatusActionProps {
  label: string;
  description: string;
  /** Server Action already bound to the row id and target status. */
  action: () => Promise<FormResult>;
  variant?: 'primary' | 'outline';
}

/** Confirmed status change (deactivate, reactivate, maintenance): never a physical delete. */
export function StatusAction({
  label,
  description,
  action,
  variant = 'outline',
}: StatusActionProps) {
  const t = useTranslations();
  const { pending, error, run } = useOnboardingAction();
  return (
    <div className="flex flex-col gap-2">
      <ConfirmButton
        label={label}
        description={description}
        variant={variant}
        disabled={pending}
        onConfirm={() => run(action)}
      />
      {error ? <Alert tone="danger">{t(`onboarding.errors.${error}`)}</Alert> : null}
    </div>
  );
}
