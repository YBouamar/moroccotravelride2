'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { getDocumentUrlAction, reviewDocumentAction } from '../actions';
import { ActionFeedback } from './action-feedback';
import { useAdminAction } from './use-admin-action';

/** View a company document through a short-lived link, then approve or reject it. */
export function DocumentReview({
  documentId,
  pending: isPending,
}: {
  documentId: string;
  pending: boolean;
}) {
  const t = useTranslations('admin.companies');
  const [reason, setReason] = useState('');
  const [opening, startOpening] = useTransition();
  const { pending, result, run } = useAdminAction();

  const view = () =>
    startOpening(async () => {
      const link = await getDocumentUrlAction(documentId);
      if (link.ok) window.open(link.url, '_blank', 'noopener,noreferrer');
    });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={view} disabled={opening}>
          {t('view')}
        </Button>
        {isPending ? (
          <ConfirmButton
            label={t('approve')}
            description={t('approveConfirm')}
            disabled={pending}
            onConfirm={() =>
              run(() => reviewDocumentAction({ documentId, decision: 'approved', reason: '' }))
            }
          />
        ) : null}
      </div>
      {isPending ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1">
            <FormField id={`reason-${documentId}`} label={t('rejectReason')}>
              <Input
                value={reason}
                maxLength={500}
                onChange={(event) => setReason(event.target.value)}
              />
            </FormField>
          </div>
          <ConfirmButton
            label={t('reject')}
            description={t('rejectConfirm')}
            variant="outline"
            disabled={pending || reason.trim().length === 0}
            onConfirm={() =>
              run(() => reviewDocumentAction({ documentId, decision: 'rejected', reason }))
            }
          />
        </div>
      ) : null}
      <ActionFeedback result={result} />
    </div>
  );
}
