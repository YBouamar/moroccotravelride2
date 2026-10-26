'use client';

import { isOpenTrip, type TripStatus } from '@mtr/shared';
import { useTranslations } from 'next-intl';
import { useId, useRef, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Input, Label } from '@/components/ui/input';
import { useOnboardingAction } from '@/features/onboarding/components/use-onboarding-action';
import { cancelTripAction, setTripProgressAction } from '../actions';

/** Start, finish or cancel a trip (BR-113). The database refuses any other transition. */
export function TripStatusActions({ tripId, status }: { tripId: string; status: TripStatus }) {
  const t = useTranslations();
  const { pending, error, run } = useOnboardingAction();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [reason, setReason] = useState('');

  return (
    <div className="flex flex-col gap-3">
      {error ? <Alert tone="danger">{t(`onboarding.errors.${error}`)}</Alert> : null}
      <div className="flex flex-wrap gap-3">
        {status === 'assigned' ? (
          <ConfirmButton
            label={t('trips.actions.start')}
            description={t('trips.actions.startHelp')}
            disabled={pending}
            onConfirm={() => run(() => setTripProgressAction(tripId, 'in_progress'))}
          />
        ) : null}
        {status === 'in_progress' ? (
          <ConfirmButton
            label={t('trips.actions.complete')}
            description={t('trips.actions.completeHelp')}
            disabled={pending}
            onConfirm={() => run(() => setTripProgressAction(tripId, 'completed'))}
          />
        ) : null}
        {isOpenTrip(status) ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => dialog.current?.showModal()}
          >
            {t('trips.actions.cancel')}
          </Button>
        ) : null}
      </div>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-card border border-border bg-surface p-6 text-foreground backdrop:bg-navy/60"
      >
        <form
          method="dialog"
          onSubmit={(event) => {
            event.preventDefault();
            if (reason.trim().length < 3) return;
            dialog.current?.close();
            run(() => cancelTripAction(tripId, reason));
          }}
          className="flex flex-col gap-4"
        >
          <h2 id={titleId} className="text-lg font-semibold">
            {t('trips.actions.cancelTitle')}
          </h2>
          <p className="text-sm text-muted">{t('trips.actions.cancelHelp')}</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${titleId}-reason`}>{t('trips.actions.cancelReason')}</Label>
            <Input
              id={`${titleId}-reason`}
              required
              minLength={3}
              maxLength={300}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => dialog.current?.close()}>
              {t('admin.confirm.cancel')}
            </Button>
            <Button type="submit">{t('trips.actions.cancelConfirm')}</Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
