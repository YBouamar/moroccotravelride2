'use client';

import { useTranslations } from 'next-intl';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ReasonDialogButton } from '@/components/ui/reason-dialog-button';
import { useOnboardingAction } from '@/features/onboarding/components/use-onboarding-action';
import { getReceiptUrlAction, reviewExpenseAction } from '../actions';

/** Approve, reject (with a reason) and open the receipt through a 5-minute signed link. */
export function ExpenseReview({
  expenseId,
  canReview,
  hasReceipt,
}: {
  expenseId: string;
  canReview: boolean;
  hasReceipt: boolean;
}) {
  const t = useTranslations();
  const { pending, error, run } = useOnboardingAction();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {error ? <Alert tone="danger">{t(`onboarding.errors.${error}`)}</Alert> : null}
      {hasReceipt ? (
        <Button
          type="button"
          variant="ghost"
          onClick={async () => {
            const url = await getReceiptUrlAction(expenseId);
            if (url) window.open(url, '_blank', 'noopener');
          }}
        >
          {t('expenses.viewReceipt')}
        </Button>
      ) : null}
      {canReview ? (
        <>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => run(() => reviewExpenseAction(expenseId, 'approved'))}
          >
            {t('expenses.approve')}
          </Button>
          <ReasonDialogButton
            label={t('expenses.reject')}
            title={t('expenses.rejectTitle')}
            description={t('expenses.rejectHelp')}
            reasonLabel={t('expenses.rejectReason')}
            confirmLabel={t('expenses.reject')}
            disabled={pending}
            onConfirm={(reason) => run(() => reviewExpenseAction(expenseId, 'rejected', reason))}
          />
        </>
      ) : null}
    </div>
  );
}
