'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema } from '@mtr/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { Turnstile } from '@/components/security/turnstile';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { signInAction } from '../actions';
import { useAuthForm } from './use-auth-form';

interface LoginFormProps {
  next?: string;
  notice?: 'link';
  siteKey?: string;
  nonce?: string;
}

export function LoginForm({ next, notice, siteKey, nonce }: LoginFormProps) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const { error, captcha, setCaptcha, captchaKey, pending, submit, fieldError } = useAuthForm();
  const form = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    submit(() => signInAction(values, { locale, next, captcha })),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {error ? <Alert tone="danger">{t(`errors.${error}`)}</Alert> : null}
      {!error && notice ? <Alert tone="danger">{t(`errors.${notice}`)}</Alert> : null}
      <FormField id="email" label={t('fields.email')} error={fieldError(errors.email?.message)}>
        <Input type="email" autoComplete="email" {...form.register('email')} />
      </FormField>
      <FormField
        id="password"
        label={t('fields.password')}
        error={fieldError(errors.password?.message)}
      >
        <Input type="password" autoComplete="current-password" {...form.register('password')} />
      </FormField>
      <Turnstile
        key={captchaKey}
        siteKey={siteKey}
        nonce={nonce}
        locale={locale}
        onToken={setCaptcha}
      />
      <Button type="submit" size="lg" disabled={pending}>
        {t('login.submit')}
      </Button>
    </form>
  );
}
