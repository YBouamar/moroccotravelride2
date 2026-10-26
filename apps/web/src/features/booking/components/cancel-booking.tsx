'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Alert } from '@/components/ui/alert';
import { ReasonDialogButton } from '@/components/ui/reason-dialog-button';
import { useRouter } from '@/i18n/navigation';
import { cancelGuestBookingAction, type BookingError } from '../actions';

/** Traveler cancellation from the magic link page (BR-011). The refund is computed server side. */
export function CancelBooking({
  bookingRef,
  token,
  policyText,
}: {
  bookingRef: string;
  token: string;
  policyText: string;
}) {
  const t = useTranslations('booking');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<BookingError | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {error ? <Alert tone="danger">{t(`errors.${error}`)}</Alert> : null}
      <ReasonDialogButton
        label={t('cancel.button')}
        title={t('cancel.title')}
        description={policyText}
        reasonLabel={t('cancel.reason')}
        confirmLabel={t('cancel.confirm')}
        disabled={pending}
        reasonRequired={false}
        onConfirm={(reason) =>
          startTransition(async () => {
            const result = await cancelGuestBookingAction(bookingRef, token, reason);
            if (!result.ok) setError(result.error);
            else router.refresh();
          })
        }
      />
    </div>
  );
}
