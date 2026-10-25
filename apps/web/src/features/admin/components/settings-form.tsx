'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { paymentInfoSchema, type PaymentInfo } from '@mtr/shared';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { updatePlatformSettingsAction } from '../actions';
import { ActionFeedback } from './action-feedback';
import { useAdminAction } from './use-admin-action';

const formSchema = z.object({
  paymentInfo: paymentInfoSchema,
  graceDays: z.number({ error: 'required' }).int().min(1, { error: 'required' }).max(90),
});

export function SettingsForm({
  paymentInfo,
  graceDays,
}: {
  paymentInfo: PaymentInfo;
  graceDays: number;
}) {
  const t = useTranslations('admin.settings');
  const tValidation = useTranslations('validation');
  const { pending, result, run } = useAdminAction();
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { paymentInfo, graceDays },
  });
  const errors = form.formState.errors;
  const message = (code?: string) =>
    code ? tValidation(code as Parameters<typeof tValidation>[0]) : undefined;

  const onSubmit = form.handleSubmit((values) => run(() => updatePlatformSettingsAction(values)));

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <Card>
        <CardTitle>{t('paymentTitle')}</CardTitle>
        <CardDescription>{t('paymentHint')}</CardDescription>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FormField
            id="bank"
            label={t('bank')}
            error={message(errors.paymentInfo?.bank_name?.message)}
          >
            <Input {...form.register('paymentInfo.bank_name')} />
          </FormField>
          <FormField
            id="holder"
            label={t('holder')}
            error={message(errors.paymentInfo?.account_holder?.message)}
          >
            <Input {...form.register('paymentInfo.account_holder')} />
          </FormField>
          <FormField id="rib" label={t('rib')} error={message(errors.paymentInfo?.rib?.message)}>
            <Input inputMode="numeric" dir="ltr" {...form.register('paymentInfo.rib')} />
          </FormField>
          <FormField
            id="email"
            label={t('email')}
            error={message(errors.paymentInfo?.email?.message)}
          >
            <Input type="email" dir="ltr" {...form.register('paymentInfo.email')} />
          </FormField>
          <FormField
            id="phone"
            label={t('phone')}
            error={message(errors.paymentInfo?.phone?.message)}
          >
            <Input type="tel" dir="ltr" {...form.register('paymentInfo.phone')} />
          </FormField>
        </div>
      </Card>
      <Card>
        <CardTitle>{t('graceTitle')}</CardTitle>
        <div className="mt-4 max-w-xs">
          <FormField id="grace" label={t('graceDays')} error={message(errors.graceDays?.message)}>
            <Input
              type="number"
              min={1}
              max={90}
              {...form.register('graceDays', { valueAsNumber: true })}
            />
          </FormField>
        </div>
      </Card>
      <Button type="submit" variant="secondary" disabled={pending} className="self-start">
        {t('save')}
      </Button>
      <ActionFeedback result={result} />
    </form>
  );
}
