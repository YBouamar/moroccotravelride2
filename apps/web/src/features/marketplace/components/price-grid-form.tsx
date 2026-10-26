'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { priceGridSchema, type PriceGridInput } from '@mtr/shared';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useOnboardingAction } from '@/features/onboarding/components/use-onboarding-action';
import type { Option } from '@/features/reference/queries';
import { savePriceGridAction } from '../actions';

/** Adds or updates a route price of the carrier's grid (BR-008). */
export function PriceGridForm({ places, types }: { places: Option[]; types: Option[] }) {
  const t = useTranslations();
  const { pending, error, run, fieldError } = useOnboardingAction();
  const form = useForm<PriceGridInput>({
    resolver: zodResolver(priceGridSchema),
    defaultValues: {
      fromCityId: '',
      toCityId: '',
      vehicleTypeCode: '',
      price: '',
      withReturn: true,
    },
  });
  const errors = form.formState.errors;
  const placeOptions = (
    <>
      <option value="">{t('tripForm.placePlaceholder')}</option>
      {places.map((place) => (
        <option key={place.id} value={place.id}>
          {place.name}
        </option>
      ))}
    </>
  );

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit((values) =>
        run(
          () => savePriceGridAction(values),
          () => form.reset({ ...values, price: '' }),
        ),
      )}
    >
      {error ? <Alert tone="danger">{t(`onboarding.errors.${error}`)}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="fromCityId"
          label={t('marketplace.grid.from')}
          error={fieldError(errors.fromCityId?.message)}
        >
          <Select {...form.register('fromCityId')}>{placeOptions}</Select>
        </FormField>
        <FormField
          id="toCityId"
          label={t('marketplace.grid.to')}
          error={fieldError(errors.toCityId?.message)}
        >
          <Select {...form.register('toCityId')}>{placeOptions}</Select>
        </FormField>
        <FormField
          id="vehicleTypeCode"
          label={t('vehicleForm.type')}
          error={fieldError(errors.vehicleTypeCode?.message)}
        >
          <Select {...form.register('vehicleTypeCode')}>
            <option value="">{t('vehicleForm.typePlaceholder')}</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField
          id="price"
          label={t('marketplace.grid.price')}
          hint={t('marketplace.grid.priceHint')}
          error={fieldError(errors.price?.message)}
        >
          <Input inputMode="decimal" dir="ltr" {...form.register('price')} />
        </FormField>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4" {...form.register('withReturn')} />
        {t('marketplace.grid.withReturn')}
      </label>
      <Button type="submit" disabled={pending} className="self-start">
        {t('marketplace.grid.save')}
      </Button>
    </form>
  );
}
