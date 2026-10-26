'use client';

import { isOpenTrip, type TripStatus } from '@mtr/shared';
import { useTranslations } from 'next-intl';
import { Alert } from '@/components/ui/alert';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { ReasonDialogButton } from '@/components/ui/reason-dialog-button';
import { useOnboardingAction } from '@/features/onboarding/components/use-onboarding-action';
import { cancelTripAction, setTripProgressAction } from '../actions';

/** Start, finish or cancel a trip (BR-113). The database refuses any other transition. */
export function TripStatusActions({ tripId, status }: { tripId: string; status: TripStatus }) {
  const t = useTranslations();
  const { pending, error, run } = useOnboardingAction();

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
          <ReasonDialogButton
            label={t('trips.actions.cancel')}
            title={t('trips.actions.cancelTitle')}
            description={t('trips.actions.cancelHelp')}
            reasonLabel={t('trips.actions.cancelReason')}
            confirmLabel={t('trips.actions.cancelConfirm')}
            disabled={pending}
            onConfirm={(reason) => run(() => cancelTripAction(tripId, reason))}
          />
        ) : null}
      </div>
    </div>
  );
}
