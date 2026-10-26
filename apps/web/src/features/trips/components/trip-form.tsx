'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { canDriverPerformTrip, tripSchema, type TripInput } from '@mtr/shared';
import { useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { Option } from '@/features/reference/queries';
import { useOnboardingAction } from '@/features/onboarding/components/use-onboarding-action';
import type { FormResult } from '@/lib/action-result';
import type { AssignmentOptions } from '../queries';

interface TripFormProps {
  action: (input: TripInput) => Promise<FormResult>;
  places: Option[];
  options: AssignmentOptions;
  initial: TripInput;
  /** Owners and managers may override a conflict (BR-114). */
  canOverride: boolean;
  submitLabel: string;
}

const OVERRIDABLE = new Set(['conflict', 'capacity']);

export function TripForm(props: TripFormProps) {
  const { action, places, options, initial, canOverride, submitLabel } = props;
  const t = useTranslations();
  const { pending, error, run, fieldError } = useOnboardingAction('/app/trips');
  const form = useForm<TripInput>({ resolver: zodResolver(tripSchema), defaultValues: initial });
  const errors = form.formState.errors;
  const [startsAt, override] = useWatch({
    control: form.control,
    name: ['startsAt', 'conflictOverride'],
  });
  const tripDay = startsAt?.slice(0, 10) ?? '';
  const showOverride = canOverride && (override || (error !== null && OVERRIDABLE.has(error)));
  const field = (name: keyof TripInput) => fieldError(errors[name]?.message);

  const placeSelect = (name: 'pickupCityId' | 'dropoffCityId') => (
    <Select {...form.register(name)}>
      <option value="">{t('tripForm.placePlaceholder')}</option>
      {places.map((place) => (
        <option key={place.id} value={place.id}>
          {place.name}
        </option>
      ))}
    </Select>
  );

  return (
    <form
      onSubmit={form.handleSubmit((values) => run(() => action(values)))}
      noValidate
      className="flex flex-col gap-6"
    >
      {error ? <Alert tone="danger">{t(`onboarding.errors.${error}`)}</Alert> : null}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-semibold">{t('tripForm.passengerSection')}</legend>
        <FormField id="clientId" label={t('tripForm.client')}>
          <Select {...form.register('clientId')}>
            <option value="">{t('tripForm.noClient')}</option>
            {options.clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField
          id="passengerName"
          label={t('tripForm.passengerName')}
          error={field('passengerName')}
        >
          <Input {...form.register('passengerName')} />
        </FormField>
        <FormField
          id="passengerPhone"
          label={t('tripForm.passengerPhone')}
          error={field('passengerPhone')}
        >
          <Input type="tel" dir="ltr" {...form.register('passengerPhone')} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField id="passengers" label={t('tripForm.passengers')} error={field('passengers')}>
            <Input
              type="number"
              min={1}
              {...form.register('passengers', { valueAsNumber: true })}
            />
          </FormField>
          <FormField id="luggage" label={t('tripForm.luggage')} error={field('luggage')}>
            <Input type="number" min={0} {...form.register('luggage', { valueAsNumber: true })} />
          </FormField>
        </div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-semibold">{t('tripForm.routeSection')}</legend>
        <FormField id="pickupCityId" label={t('tripForm.pickupCity')} error={field('pickupCityId')}>
          {placeSelect('pickupCityId')}
        </FormField>
        <FormField
          id="pickupAddress"
          label={t('tripForm.pickupAddress')}
          error={field('pickupAddress')}
        >
          <Input {...form.register('pickupAddress')} />
        </FormField>
        <FormField
          id="dropoffCityId"
          label={t('tripForm.dropoffCity')}
          error={field('dropoffCityId')}
        >
          {placeSelect('dropoffCityId')}
        </FormField>
        <FormField
          id="dropoffAddress"
          label={t('tripForm.dropoffAddress')}
          error={field('dropoffAddress')}
        >
          <Input {...form.register('dropoffAddress')} />
        </FormField>
        <FormField
          id="startsAt"
          label={t('tripForm.startsAt')}
          hint={t('tripForm.timeHint')}
          error={field('startsAt')}
        >
          <Input type="datetime-local" {...form.register('startsAt')} />
        </FormField>
        <FormField id="endsAt" label={t('tripForm.endsAt')} error={field('endsAt')}>
          <Input type="datetime-local" {...form.register('endsAt')} />
        </FormField>
        <FormField
          id="price"
          label={t('tripForm.price')}
          hint={t('tripForm.priceHint')}
          error={field('price')}
        >
          <Input inputMode="decimal" dir="ltr" {...form.register('price')} />
        </FormField>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-semibold">{t('tripForm.assignmentSection')}</legend>
        <FormField id="vehicleId" label={t('tripForm.vehicle')}>
          <Select {...form.register('vehicleId')}>
            <option value="">{t('tripForm.unassigned')}</option>
            {options.vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {`${vehicle.registration} · ${vehicle.brand} ${vehicle.model} · ${t('tripForm.seats', { seats: vehicle.seats })}`}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="driverId" label={t('tripForm.driver')} hint={t('tripForm.driverHint')}>
          <Select {...form.register('driverId')}>
            <option value="">{t('tripForm.unassigned')}</option>
            {options.drivers.map((driver) => {
              // Q24: no trip without a valid license on the day of the trip (also enforced in DB).
              const eligible =
                !tripDay ||
                canDriverPerformTrip(
                  { licenseExpiresOn: driver.license_expires_on, status: driver.status },
                  tripDay,
                );
              return (
                <option key={driver.id} value={driver.id} disabled={!eligible}>
                  {eligible
                    ? driver.full_name
                    : `${driver.full_name} (${t('driverForm.licenseExpired')})`}
                </option>
              );
            })}
          </Select>
        </FormField>
        <div className="sm:col-span-2">
          <FormField id="notes" label={t('tripForm.notes')} error={field('notes')}>
            <textarea
              rows={2}
              className="w-full rounded-control border border-border bg-surface px-3 py-2 text-base text-foreground"
              {...form.register('notes')}
            />
          </FormField>
        </div>
      </fieldset>

      {showOverride ? (
        <fieldset className="flex flex-col gap-3 rounded-card border border-danger p-4">
          <legend className="px-1 font-semibold">{t('tripForm.overrideTitle')}</legend>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1 size-4" {...form.register('conflictOverride')} />
            {t('tripForm.overrideLabel')}
          </label>
          <FormField
            id="overrideReason"
            label={t('tripForm.overrideReason')}
            error={field('overrideReason')}
          >
            <Input {...form.register('overrideReason')} />
          </FormField>
        </fieldset>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
