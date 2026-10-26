'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { DRIVER_LANGUAGES, driverSchema, type DriverInput } from '@mtr/shared';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import type { FormResult } from '@/lib/action-result';
import { useOnboardingAction } from './use-onboarding-action';

interface DriverFormProps {
  /** Create or update Server Action (bound to the driver id when editing). */
  action: (input: DriverInput) => Promise<FormResult>;
  nextHref: string;
  initial?: DriverInput;
  submitLabel?: string;
}

export function DriverForm({ action, nextHref, initial, submitLabel }: DriverFormProps) {
  const t = useTranslations();
  const { pending, error, run, fieldError } = useOnboardingAction(nextHref);
  const form = useForm({
    resolver: zodResolver(driverSchema),
    defaultValues: initial ?? {
      fullName: '',
      phone: '',
      licenseNumber: '',
      licenseExpiresOn: '',
      professionalCardNumber: '',
      professionalCardExpiresOn: '',
      languages: [],
    },
  });
  const errors = form.formState.errors;

  return (
    <form
      onSubmit={form.handleSubmit((values) => run(() => action(values)))}
      noValidate
      className="flex flex-col gap-4"
    >
      {error ? <Alert tone="danger">{t(`onboarding.errors.${error}`)}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="fullName"
          label={t('driverForm.fullName')}
          error={fieldError(errors.fullName?.message)}
        >
          <Input autoComplete="name" {...form.register('fullName')} />
        </FormField>
        <FormField
          id="phone"
          label={t('driverForm.phone')}
          error={fieldError(errors.phone?.message)}
        >
          <Input type="tel" dir="ltr" autoComplete="tel" {...form.register('phone')} />
        </FormField>
        <FormField
          id="licenseNumber"
          label={t('driverForm.licenseNumber')}
          error={fieldError(errors.licenseNumber?.message)}
        >
          <Input dir="ltr" {...form.register('licenseNumber')} />
        </FormField>
        <FormField
          id="licenseExpiresOn"
          label={t('driverForm.licenseExpiresOn')}
          error={fieldError(errors.licenseExpiresOn?.message)}
        >
          <Input type="date" {...form.register('licenseExpiresOn')} />
        </FormField>
        <FormField
          id="professionalCardNumber"
          label={t('driverForm.cardNumber')}
          error={fieldError(errors.professionalCardNumber?.message)}
        >
          <Input dir="ltr" {...form.register('professionalCardNumber')} />
        </FormField>
        <FormField
          id="professionalCardExpiresOn"
          label={t('driverForm.cardExpiresOn')}
          error={fieldError(errors.professionalCardExpiresOn?.message)}
        >
          <Input type="date" {...form.register('professionalCardExpiresOn')} />
        </FormField>
      </div>
      <fieldset>
        <legend className="text-sm font-medium">{t('driverForm.languages')}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {DRIVER_LANGUAGES.map((language) => (
            <label
              key={language}
              className="inline-flex min-h-11 items-center gap-2 rounded-control border border-border px-3 text-sm"
            >
              <input
                type="checkbox"
                value={language}
                className="size-4 accent-secondary"
                {...form.register('languages')}
              />
              {t(`languages.${language}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <Button type="submit" size="lg" disabled={pending} className="self-start">
        {submitLabel ?? t('onboarding.save')}
      </Button>
    </form>
  );
}
