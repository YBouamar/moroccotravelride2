'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { vehicleSchema } from '@mtr/shared';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { Option } from '@/features/reference/queries';
import { createVehicleAction } from '../actions';
import { useOnboardingAction } from './use-onboarding-action';

// Empty optional number inputs become null instead of NaN.
const optionalNumber = (value: unknown) => (value === '' || value === null ? null : Number(value));

export function VehicleForm({
  types,
  nextHref,
}: {
  types: (Option & { seats: number })[];
  nextHref: string;
}) {
  const t = useTranslations();
  const { pending, error, run, fieldError } = useOnboardingAction(nextHref);
  const form = useForm({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      registration: '',
      brand: '',
      model: '',
      vehicleTypeCode: '',
      seats: Number.NaN,
      luggageCapacity: null,
      year: null,
    },
  });
  const errors = form.formState.errors;

  return (
    <form
      onSubmit={form.handleSubmit((values) => run(() => createVehicleAction(values)))}
      noValidate
      className="flex flex-col gap-4"
    >
      {error ? <Alert tone="danger">{t(`onboarding.errors.${error}`)}</Alert> : null}
      <FormField
        id="registration"
        label={t('vehicleForm.registration')}
        hint={t('vehicleForm.registrationHint')}
        error={fieldError(errors.registration?.message)}
      >
        <Input dir="ltr" {...form.register('registration')} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="brand"
          label={t('vehicleForm.brand')}
          error={fieldError(errors.brand?.message)}
        >
          <Input {...form.register('brand')} />
        </FormField>
        <FormField
          id="model"
          label={t('vehicleForm.model')}
          error={fieldError(errors.model?.message)}
        >
          <Input {...form.register('model')} />
        </FormField>
      </div>
      <FormField
        id="vehicleTypeCode"
        label={t('vehicleForm.type')}
        error={fieldError(errors.vehicleTypeCode?.message)}
      >
        <Select
          {...form.register('vehicleTypeCode', {
            // Suggest the indicative capacity of the chosen type (BR, Q20).
            onChange: (event) => {
              const type = types.find((candidate) => candidate.id === event.target.value);
              if (type && Number.isNaN(form.getValues('seats'))) form.setValue('seats', type.seats);
            },
          })}
        >
          <option value="">{t('vehicleForm.typePlaceholder')}</option>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </Select>
      </FormField>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          id="seats"
          label={t('vehicleForm.seats')}
          error={fieldError(errors.seats?.message)}
        >
          <Input
            type="number"
            min={1}
            max={80}
            {...form.register('seats', { valueAsNumber: true })}
          />
        </FormField>
        <FormField
          id="luggageCapacity"
          label={t('vehicleForm.luggage')}
          error={fieldError(errors.luggageCapacity?.message)}
        >
          <Input
            type="number"
            min={0}
            {...form.register('luggageCapacity', { setValueAs: optionalNumber })}
          />
        </FormField>
        <FormField id="year" label={t('vehicleForm.year')} error={fieldError(errors.year?.message)}>
          <Input
            type="number"
            min={1980}
            {...form.register('year', { setValueAs: optionalNumber })}
          />
        </FormField>
      </div>
      <Button type="submit" size="lg" disabled={pending} className="self-start">
        {t('onboarding.save')}
      </Button>
    </form>
  );
}
