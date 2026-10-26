'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { invoiceLineSchema, type InvoiceLineInput } from '@mtr/shared';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useOnboardingAction } from '@/features/onboarding/components/use-onboarding-action';
import {
  addInvoiceLineAction,
  addTripLinesAction,
  createInvoiceAction,
  setDefaultVatAction,
  updateDraftAction,
} from '../actions';

/** Small forms of the invoicing pages (step 10). Errors are translated from onboarding.errors. */

function ErrorAlert({ error }: { error: string | null }) {
  const t = useTranslations('onboarding.errors');
  return error ? <Alert tone="danger">{t(error as 'unknown')}</Alert> : null;
}

export function NewInvoiceForm({ clients }: { clients: { id: string; name: string }[] }) {
  const t = useTranslations('invoices');
  const { pending, error, run } = useOnboardingAction();
  const [clientId, setClientId] = useState('');
  const selectId = useId();
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        if (clientId) run(() => createInvoiceAction(clientId));
      }}
    >
      <ErrorAlert error={error} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={selectId}>{t('client')}</Label>
        <Select
          id={selectId}
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
          required
          className="sm:w-72"
        >
          <option value="">{t('chooseClient')}</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" disabled={pending || !clientId}>
        {t('createDraft')}
      </Button>
    </form>
  );
}

export function DefaultVatForm({ initial }: { initial: string }) {
  const t = useTranslations('invoices');
  const { pending, error, run } = useOnboardingAction();
  const [value, setValue] = useState(initial);
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => setDefaultVatAction(value));
      }}
    >
      <ErrorAlert error={error} />
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t('defaultVat')}
        <Input
          inputMode="decimal"
          dir="ltr"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="sm:w-32"
        />
      </label>
      <Button type="submit" variant="secondary" disabled={pending}>
        {t('save')}
      </Button>
    </form>
  );
}

export function InvoiceLineForm({
  invoiceId,
  defaultVat,
}: {
  invoiceId: string;
  defaultVat: string;
}) {
  const t = useTranslations();
  const { pending, error, run, fieldError } = useOnboardingAction();
  const form = useForm<InvoiceLineInput>({
    resolver: zodResolver(invoiceLineSchema),
    defaultValues: { description: '', quantity: 1, unitPrice: '', vatRate: defaultVat },
  });
  const errors = form.formState.errors;
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit((values) =>
        run(
          () => addInvoiceLineAction(invoiceId, values),
          () => form.reset({ ...values, description: '', unitPrice: '' }),
        ),
      )}
    >
      <ErrorAlert error={error} />
      <FormField
        id="description"
        label={t('invoices.line.description')}
        error={fieldError(errors.description?.message)}
      >
        <Input {...form.register('description')} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          id="quantity"
          label={t('invoices.line.quantity')}
          error={fieldError(errors.quantity?.message)}
        >
          <Input type="number" min={1} {...form.register('quantity', { valueAsNumber: true })} />
        </FormField>
        <FormField
          id="unitPrice"
          label={t('invoices.line.unitPrice')}
          error={fieldError(errors.unitPrice?.message)}
        >
          <Input inputMode="decimal" dir="ltr" {...form.register('unitPrice')} />
        </FormField>
        <FormField
          id="vatRate"
          label={t('invoices.line.vatRate')}
          hint={t('invoices.vatHint')}
          error={fieldError(errors.vatRate?.message)}
        >
          <Input inputMode="decimal" dir="ltr" {...form.register('vatRate')} />
        </FormField>
      </div>
      <Button type="submit" variant="secondary" disabled={pending} className="self-start">
        {t('invoices.line.add')}
      </Button>
    </form>
  );
}

export interface TripChoice {
  id: string;
  label: string;
  price: string;
}

export function TripLinesForm({
  invoiceId,
  trips,
  defaultVat,
}: {
  invoiceId: string;
  trips: TripChoice[];
  defaultVat: string;
}) {
  const t = useTranslations('invoices');
  const { pending, error, run } = useOnboardingAction();
  const [selected, setSelected] = useState<string[]>([]);
  const [vatRate, setVatRate] = useState(defaultVat);
  if (trips.length === 0) return <p className="text-sm text-muted">{t('noTripToBill')}</p>;
  const labels = Object.fromEntries(trips.map((trip) => [trip.id, trip.label]));
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (selected.length) {
          run(
            () => addTripLinesAction(invoiceId, { tripIds: selected, vatRate, labels }),
            () => setSelected([]),
          );
        }
      }}
    >
      <ErrorAlert error={error} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">{t('tripsToBill')}</legend>
        {trips.map((trip) => (
          <label key={trip.id} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1 size-4"
              checked={selected.includes(trip.id)}
              onChange={(event) =>
                setSelected((current) =>
                  event.target.checked
                    ? [...current, trip.id]
                    : current.filter((id) => id !== trip.id),
                )
              }
            />
            <span>
              {trip.label} · <span dir="ltr">{trip.price}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-1.5 text-sm font-medium sm:w-48">
        {t('line.vatRate')}
        <Input
          inputMode="decimal"
          dir="ltr"
          value={vatRate}
          onChange={(event) => setVatRate(event.target.value)}
        />
      </label>
      <Button
        type="submit"
        variant="secondary"
        disabled={pending || selected.length === 0}
        className="self-start"
      >
        {t('addTrips', { count: selected.length })}
      </Button>
    </form>
  );
}

export function DraftDetailsForm({
  invoiceId,
  dueDate,
  notes,
}: {
  invoiceId: string;
  dueDate: string;
  notes: string;
}) {
  const t = useTranslations('invoices');
  const { pending, error, run } = useOnboardingAction();
  const [values, setValues] = useState({ dueDate, notes });
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => updateDraftAction(invoiceId, values));
      }}
    >
      <ErrorAlert error={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t('dueDate')}
          <Input
            type="date"
            value={values.dueDate}
            onChange={(event) => setValues({ ...values, dueDate: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t('notes')}
          <Input
            value={values.notes}
            maxLength={1000}
            onChange={(event) => setValues({ ...values, notes: event.target.value })}
          />
        </label>
      </div>
      <Button type="submit" variant="outline" disabled={pending} className="self-start">
        {t('save')}
      </Button>
    </form>
  );
}
