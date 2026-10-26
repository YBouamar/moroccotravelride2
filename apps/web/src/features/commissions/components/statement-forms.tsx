'use client';

import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useOnboardingAction } from '@/features/onboarding/components/use-onboarding-action';
import { generateStatementsAction, recordStatementPaymentAction } from '../actions';

export function GenerateStatementsForm({ defaultMonth }: { defaultMonth: string }) {
  const t = useTranslations();
  const { pending, error, run } = useOnboardingAction();
  const [month, setMonth] = useState(defaultMonth);
  const id = useId();
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => generateStatementsAction(month));
      }}
    >
      {error ? <Alert tone="danger">{t(`onboarding.errors.${error}`)}</Alert> : null}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id}>{t('commissions.month')}</Label>
        <Input
          id={id}
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {t('commissions.generate')}
      </Button>
    </form>
  );
}

export function StatementPaymentForm({
  statementId,
  due,
  today,
}: {
  statementId: string;
  due: string;
  today: string;
}) {
  const t = useTranslations();
  const { pending, error, run } = useOnboardingAction();
  const [values, setValues] = useState({
    amount: due,
    method: 'instant_transfer',
    receivedOn: today,
    reference: '',
  });
  const id = useId();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        run(() =>
          recordStatementPaymentAction(statementId, {
            ...values,
            method: values.method as 'cash' | 'instant_transfer' | 'bank_transfer',
          }),
        );
      }}
    >
      {error ? <Alert tone="danger">{t(`onboarding.errors.${error}`)}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-amount`}>{t('commissions.payment.amount')}</Label>
          <Input
            id={`${id}-amount`}
            inputMode="decimal"
            dir="ltr"
            value={values.amount}
            onChange={(event) => setValues({ ...values, amount: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-method`}>{t('commissions.payment.method')}</Label>
          <Select
            id={`${id}-method`}
            value={values.method}
            onChange={(event) => setValues({ ...values, method: event.target.value })}
          >
            {(['instant_transfer', 'cash', 'bank_transfer'] as const).map((method) => (
              <option key={method} value={method}>
                {t(`commissions.methods.${method}`)}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-date`}>{t('commissions.payment.date')}</Label>
          <Input
            id={`${id}-date`}
            type="date"
            max={today}
            value={values.receivedOn}
            onChange={(event) => setValues({ ...values, receivedOn: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-ref`}>{t('commissions.payment.reference')}</Label>
          <Input
            id={`${id}-ref`}
            value={values.reference}
            maxLength={120}
            onChange={(event) => setValues({ ...values, reference: event.target.value })}
          />
        </div>
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {t('commissions.payment.record')}
      </Button>
    </form>
  );
}
