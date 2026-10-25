'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { signUpCarrierSchema } from '@mtr/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Turnstile } from '@/components/security/turnstile';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Link } from '@/i18n/navigation';
import { signUpCarrierAction } from '../actions';
import { useAuthForm } from './use-auth-form';

interface SignupFormProps {
  cities: { id: string; name: string }[];
  siteKey?: string;
  nonce?: string;
}

export function SignupForm({ cities, siteKey, nonce }: SignupFormProps) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const [done, setDone] = useState(false);
  const { error, captcha, setCaptcha, captchaKey, pending, submit, fieldError } = useAuthForm();
  const form = useForm({
    resolver: zodResolver(signUpCarrierSchema),
    defaultValues: {
      fullName: '',
      legalName: '',
      cityId: '',
      email: '',
      password: '',
      acceptTerms: false,
    },
  });
  const { errors } = form.formState;

  if (done) {
    return (
      <Alert tone="success" title={t('signup.successTitle')}>
        {t('signup.successText')}
      </Alert>
    );
  }

  const onSubmit = form.handleSubmit((values) =>
    submit(
      () => signUpCarrierAction(values, { locale, captcha }),
      () => setDone(true),
    ),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {error ? <Alert tone="danger">{t(`errors.${error}`)}</Alert> : null}
      <FormField
        id="fullName"
        label={t('fields.fullName')}
        error={fieldError(errors.fullName?.message)}
      >
        <Input autoComplete="name" {...form.register('fullName')} />
      </FormField>
      <FormField
        id="legalName"
        label={t('fields.legalName')}
        error={fieldError(errors.legalName?.message)}
      >
        <Input autoComplete="organization" {...form.register('legalName')} />
      </FormField>
      <FormField id="cityId" label={t('fields.city')} error={fieldError(errors.cityId?.message)}>
        <Select {...form.register('cityId')}>
          <option value="">{t('fields.cityPlaceholder')}</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField id="email" label={t('fields.email')} error={fieldError(errors.email?.message)}>
        <Input type="email" autoComplete="email" {...form.register('email')} />
      </FormField>
      <FormField
        id="password"
        label={t('fields.password')}
        hint={t('passwordHint')}
        error={fieldError(errors.password?.message)}
      >
        <Input type="password" autoComplete="new-password" {...form.register('password')} />
      </FormField>
      <div className="flex flex-col gap-1.5">
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 size-5 shrink-0 accent-secondary"
            aria-invalid={errors.acceptTerms ? true : undefined}
            aria-describedby={errors.acceptTerms ? 'acceptTerms-error' : undefined}
            {...form.register('acceptTerms')}
          />
          <span>{t('signup.acceptTerms')}</span>
        </label>
        <Link href="/legal/terms" className="ms-8 text-sm text-secondary underline">
          {t('signup.termsLink')}
        </Link>
        {errors.acceptTerms ? (
          <p id="acceptTerms-error" className="text-sm text-danger">
            {fieldError(errors.acceptTerms.message)}
          </p>
        ) : null}
      </div>
      <Turnstile
        key={captchaKey}
        siteKey={siteKey}
        nonce={nonce}
        locale={locale}
        onToken={setCaptcha}
      />
      <Button type="submit" size="lg" disabled={pending}>
        {t('signup.submit')}
      </Button>
    </form>
  );
}
