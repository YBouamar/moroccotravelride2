'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema } from '@mtr/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Turnstile } from '@/components/security/turnstile';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { forgotPasswordAction } from '../actions';
import { useAuthForm } from './use-auth-form';

export function ForgotPasswordForm({ siteKey, nonce }: { siteKey?: string; nonce?: string }) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const [done, setDone] = useState(false);
  const { error, captcha, setCaptcha, captchaKey, pending, submit, fieldError } = useAuthForm();
  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  if (done) return <Alert tone="success">{t('forgot.successText')}</Alert>;

  const onSubmit = form.handleSubmit((values) =>
    submit(
      () => forgotPasswordAction(values, { captcha }),
      () => setDone(true),
    ),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {error ? <Alert tone="danger">{t(`errors.${error}`)}</Alert> : null}
      <FormField
        id="email"
        label={t('fields.email')}
        error={fieldError(form.formState.errors.email?.message)}
      >
        <Input type="email" autoComplete="email" {...form.register('email')} />
      </FormField>
      <Turnstile
        key={captchaKey}
        siteKey={siteKey}
        nonce={nonce}
        locale={locale}
        onToken={setCaptcha}
      />
      <Button type="submit" size="lg" disabled={pending}>
        {t('forgot.submit')}
      </Button>
    </form>
  );
}
