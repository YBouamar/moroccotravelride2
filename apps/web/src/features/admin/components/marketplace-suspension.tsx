'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { setMarketplaceSuspensionAction } from '../actions';
import { ActionFeedback } from './action-feedback';
import { useAdminAction } from './use-admin-action';

export function MarketplaceSuspension({
  companyId,
  suspended,
}: {
  companyId: string;
  suspended: boolean;
}) {
  const t = useTranslations('admin.companies');
  const [reason, setReason] = useState('');
  const { pending, result, run } = useAdminAction();

  return (
    <div className="flex flex-col gap-3">
      {suspended ? (
        <ConfirmButton
          label={t('liftSuspension')}
          description={t('liftConfirm')}
          disabled={pending}
          onConfirm={() => run(() => setMarketplaceSuspensionAction({ companyId, reason: '' }))}
        />
      ) : (
        <>
          <FormField id="suspension-reason" label={t('suspendReason')}>
            <Input
              value={reason}
              maxLength={300}
              onChange={(event) => setReason(event.target.value)}
            />
          </FormField>
          <ConfirmButton
            label={t('suspendMarketplace')}
            description={t('suspendMarketplaceConfirm', { reason })}
            variant="outline"
            disabled={pending || reason.trim().length === 0}
            onConfirm={() => run(() => setMarketplaceSuspensionAction({ companyId, reason }))}
          />
        </>
      )}
      <ActionFeedback result={result} />
    </div>
  );
}
