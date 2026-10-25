'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema } from '@mtr/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { resetPasswordAction } from '../actions';
import { useAuthForm } from './use-auth-form';

export function ResetPasswordForm() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const { error, pending, submit, fieldError } = useAuthForm();
  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    submit(() => resetPasswordAction(values, { locale })),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {error ? <Alert tone="danger">{t(`errors.${error}`)}</Alert> : null}
      <FormField
        id="password"
        label={t('fields.newPassword')}
        hint={t('passwordHint')}
        error={fieldError(errors.password?.message)}
      >
        <Input type="password" autoComplete="new-password" {...form.register('password')} />
      </FormField>
      <FormField
        id="confirmPassword"
        label={t('fields.confirmPassword')}
        error={fieldError(errors.confirmPassword?.message)}
      >
        <Input type="password" autoComplete="new-password" {...form.register('confirmPassword')} />
      </FormField>
      <Button type="submit" size="lg" disabled={pending}>
        {t('reset.submit')}
      </Button>
    </form>
  );
}
