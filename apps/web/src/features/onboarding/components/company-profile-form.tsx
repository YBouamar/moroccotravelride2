'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { companyProfileSchema, type CompanyProfileInput } from '@mtr/shared';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { Option } from '@/features/reference/queries';
import { saveCompanyProfileAction } from '../actions';
import { useOnboardingAction } from './use-onboarding-action';

export function CompanyProfileForm({
  initial,
  cities,
}: {
  initial: CompanyProfileInput;
  cities: Option[];
}) {
  const t = useTranslations();
  const { pending, error, run, fieldError } = useOnboardingAction('/app/onboarding/documents');
  const form = useForm({ resolver: zodResolver(companyProfileSchema), defaultValues: initial });
  const errors = form.formState.errors;

  const field = (
    name: keyof CompanyProfileInput,
    label: string,
    props: Record<string, unknown> = {},
    hint?: string,
  ) => (
    <FormField id={name} label={label} hint={hint} error={fieldError(errors[name]?.message)}>
      <Input {...props} {...form.register(name)} />
    </FormField>
  );

  return (
    <form
      onSubmit={form.handleSubmit((values) => run(() => saveCompanyProfileAction(values)))}
      noValidate
      className="flex flex-col gap-4"
    >
      {error ? <Alert tone="danger">{t(`onboarding.errors.${error}`)}</Alert> : null}
      {field('legalName', t('companyForm.legalName'), { autoComplete: 'organization' })}
      {field('tradeName', t('companyForm.tradeName'))}
      <div className="grid gap-4 sm:grid-cols-2">
        {field(
          'ice',
          t('companyForm.ice'),
          { inputMode: 'numeric', dir: 'ltr', maxLength: 15 },
          t('companyForm.iceHint'),
        )}
        {field('ifNumber', t('companyForm.ifNumber'), { dir: 'ltr' })}
        {field('rcNumber', t('companyForm.rcNumber'), { dir: 'ltr' })}
        {field('tpNumber', t('companyForm.tpNumber'), { dir: 'ltr' })}
      </div>
      {field('address', t('companyForm.address'), { autoComplete: 'street-address' })}
      <FormField
        id="cityId"
        label={t('companyForm.city')}
        error={fieldError(errors.cityId?.message)}
      >
        <Select {...form.register('cityId')}>
          <option value="">{t('companyForm.cityPlaceholder')}</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </Select>
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        {field('licenseNumber', t('companyForm.licenseNumber'), { dir: 'ltr' })}
        {field('licenseExpiresOn', t('companyForm.licenseExpiresOn'), { type: 'date' })}
      </div>
      <Button type="submit" size="lg" disabled={pending} className="self-start">
        {t('onboarding.save')}
      </Button>
    </form>
  );
}
