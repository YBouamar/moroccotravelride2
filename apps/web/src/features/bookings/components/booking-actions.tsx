'use client';

import type { BookingStatus } from '@mtr/shared';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Label } from '@/components/ui/input';
import { ReasonDialogButton } from '@/components/ui/reason-dialog-button';
import { Select } from '@/components/ui/select';
import { useOnboardingAction } from '@/features/onboarding/components/use-onboarding-action';
import {
  confirmBookingPaymentAction,
  confirmBookingRefundAction,
  respondBookingAction,
} from '../actions';

const DURATIONS = [30, 60, 90, 120, 180, 240, 300, 360, 480] as const;

interface BookingActionsProps {
  bookingId: string;
  status: BookingStatus;
  paymentStatus: string;
  refundDue: boolean;
  canRespond: boolean;
  canConfirmPayment: boolean;
}

/** Accept (with the estimated duration of the new trip), refuse, confirm payment or refund. */
export function BookingActions(props: BookingActionsProps) {
  const t = useTranslations();
  const { pending, error, run } = useOnboardingAction();
  const [duration, setDuration] = useState(120);
  const durationId = useId();

  return (
    <div className="flex flex-col gap-3">
      {error ? <Alert tone="danger">{t(`onboarding.errors.${error}`)}</Alert> : null}
      {props.canRespond && props.status === 'pending_carrier' ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={durationId}>{t('bookings.duration')}</Label>
            <Select
              id={durationId}
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              className="w-40"
            >
              {DURATIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {t('bookings.minutes', { minutes })}
                </option>
              ))}
            </Select>
          </div>
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              run(() => respondBookingAction(props.bookingId, true, { durationMinutes: duration }))
            }
          >
            {t('bookings.accept')}
          </Button>
          <ReasonDialogButton
            label={t('bookings.refuse')}
            title={t('bookings.refuseTitle')}
            description={t('bookings.refuseHelp')}
            reasonLabel={t('bookings.refuseReason')}
            confirmLabel={t('bookings.refuseConfirm')}
            disabled={pending}
            onConfirm={(reason) =>
              run(() => respondBookingAction(props.bookingId, false, { reason }))
            }
          />
        </div>
      ) : null}
      {props.canConfirmPayment &&
      props.paymentStatus === 'unpaid' &&
      ['confirmed', 'assigned', 'completed'].includes(props.status) ? (
        <ConfirmButton
          variant="outline"
          label={t('bookings.confirmPayment')}
          description={t('bookings.confirmPaymentHelp')}
          disabled={pending}
          onConfirm={() => run(() => confirmBookingPaymentAction(props.bookingId))}
        />
      ) : null}
      {props.canConfirmPayment && props.refundDue && props.paymentStatus === 'paid' ? (
        <ConfirmButton
          variant="outline"
          label={t('bookings.confirmRefund')}
          description={t('bookings.confirmRefundHelp')}
          disabled={pending}
          onConfirm={() => run(() => confirmBookingRefundAction(props.bookingId))}
        />
      ) : null}
    </div>
  );
}
