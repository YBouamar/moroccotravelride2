'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { INVOICE_PAYMENT_METHODS, paymentSchema, type PaymentInput } from '@mtr/shared';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { ReasonDialogButton } from '@/components/ui/reason-dialog-button';
import { Select } from '@/components/ui/select';
import { useOnboardingAction } from '@/features/onboarding/components/use-onboarding-action';
import { addPaymentAction, createCreditNoteAction } from '../actions';

/** Records a payment received for an issued invoice (offline: transfer, cash, cheque). */
export function PaymentForm({
  invoiceId,
  amountDue,
  today,
}: {
  invoiceId: string;
  /** Remaining amount, already in the input format ("800,50"). */
  amountDue: string;
  today: string;
}) {
  const t = useTranslations();
  const { pending, error, run, fieldError } = useOnboardingAction();
  const form = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: amountDue, method: 'bank_transfer', paidOn: today, reference: '' },
  });
  const errors = form.formState.errors;
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit((values) => run(() => addPaymentAction(invoiceId, values)))}
    >
      {error ? <Alert tone="danger">{t(`onboarding.errors.${error}`)}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="amount"
          label={t('invoices.payment.amount')}
          error={fieldError(errors.amount?.message)}
        >
          <Input inputMode="decimal" dir="ltr" {...form.register('amount')} />
        </FormField>
        <FormField id="method" label={t('invoices.payment.method')}>
          <Select {...form.register('method')}>
            {INVOICE_PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {t(`invoicePaymentMethod.${method}`)}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField
          id="paidOn"
          label={t('invoices.payment.paidOn')}
          error={fieldError(errors.paidOn?.message)}
        >
          <Input type="date" max={today} {...form.register('paidOn')} />
        </FormField>
        <FormField
          id="reference"
          label={t('invoices.payment.reference')}
          error={fieldError(errors.reference?.message)}
        >
          <Input {...form.register('reference')} />
        </FormField>
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {t('invoices.payment.record')}
      </Button>
    </form>
  );
}

export function CreditNoteButton({ invoiceId }: { invoiceId: string }) {
  const t = useTranslations();
  const { pending, error, run } = useOnboardingAction();
  return (
    <div className="flex flex-col gap-2">
      {error ? <Alert tone="danger">{t(`onboarding.errors.${error}`)}</Alert> : null}
      <ReasonDialogButton
        label={t('invoices.creditNote.create')}
        title={t('invoices.creditNote.title')}
        description={t('invoices.creditNote.help')}
        reasonLabel={t('invoices.creditNote.reason')}
        confirmLabel={t('invoices.creditNote.confirm')}
        disabled={pending}
        onConfirm={(reason) => run(() => createCreditNoteAction(invoiceId, reason))}
      />
    </div>
  );
}
