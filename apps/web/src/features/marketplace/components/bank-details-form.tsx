'use client';

import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { useOnboardingAction } from '@/features/onboarding/components/use-onboarding-action';
import { saveBankDetailsAction } from '../actions';

/** Carrier bank details for travelers paying by transfer (BR-009). */
export function BankDetailsForm({ bankName, rib }: { bankName: string; rib: string }) {
  const t = useTranslations();
  const { pending, error, run } = useOnboardingAction();
  const [values, setValues] = useState({ bankName, rib });
  const id = useId();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => saveBankDetailsAction(values));
      }}
    >
      {error ? <Alert tone="danger">{t(`onboarding.errors.${error}`)}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-bank`}>{t('marketplace.bank.name')}</Label>
          <Input
            id={`${id}-bank`}
            value={values.bankName}
            maxLength={100}
            onChange={(event) => setValues({ ...values, bankName: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-rib`}>{t('marketplace.bank.rib')}</Label>
          <Input
            id={`${id}-rib`}
            dir="ltr"
            inputMode="numeric"
            value={values.rib}
            onChange={(event) => setValues({ ...values, rib: event.target.value })}
          />
        </div>
      </div>
      <Button type="submit" variant="secondary" disabled={pending} className="self-start">
        {t('marketplace.bank.save')}
      </Button>
    </form>
  );
}
