'use client';

import type { CompanyStatus } from '@mtr/shared';
import { useTranslations } from 'next-intl';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { setCompanyStatusAction } from '../actions';
import { ActionFeedback } from './action-feedback';
import { useAdminAction } from './use-admin-action';

const TRANSITIONS: Record<
  CompanyStatus,
  { to: CompanyStatus; label: 'verify' | 'suspend' | 'reopen' }[]
> = {
  pending: [
    { to: 'verified', label: 'verify' },
    { to: 'suspended', label: 'suspend' },
  ],
  verified: [{ to: 'suspended', label: 'suspend' }],
  suspended: [
    { to: 'verified', label: 'verify' },
    { to: 'pending', label: 'reopen' },
  ],
};

export function CompanyStatusActions({
  companyId,
  status,
}: {
  companyId: string;
  status: CompanyStatus;
}) {
  const t = useTranslations('admin.companies');
  const { pending, result, run } = useAdminAction();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {TRANSITIONS[status].map(({ to, label }) => (
          <ConfirmButton
            key={to}
            label={t(label)}
            description={t(`${label}Confirm`)}
            variant={to === 'verified' ? 'primary' : 'outline'}
            disabled={pending}
            onConfirm={() => run(() => setCompanyStatusAction({ companyId, status: to }))}
          />
        ))}
      </div>
      <ActionFeedback result={result} />
    </div>
  );
}
