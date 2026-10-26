'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CLIENT_TYPES, clientSchema, type ClientInput } from '@mtr/shared';
import { useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useOnboardingAction } from '@/features/onboarding/components/use-onboarding-action';
import type { FormResult } from '@/lib/action-result';

interface ClientFormProps {
  /** Create or update Server Action (bound to the client id when editing). */
  action: (input: ClientInput) => Promise<FormResult>;
  nextHref: string;
  initial?: ClientInput;
  submitLabel: string;
}

export function ClientForm({ action, nextHref, initial, submitLabel }: ClientFormProps) {
  const t = useTranslations();
  const { pending, error, run, fieldError } = useOnboardingAction(nextHref);
  const form = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: initial ?? {
      type: 'b2b',
      name: '',
      ice: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
    },
  });
  const errors = form.formState.errors;
  const isCompany = useWatch({ control: form.control, name: 'type' }) === 'b2b';

  return (
    <form
      onSubmit={form.handleSubmit((values) => run(() => action(values)))}
      noValidate
      className="flex flex-col gap-4"
    >
      {error ? <Alert tone="danger">{t(`onboarding.errors.${error}`)}</Alert> : null}
      <FormField id="type" label={t('clientForm.type')}>
        <Select {...form.register('type')}>
          {CLIENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`clientType.${type}`)}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField id="name" label={t('clientForm.name')} error={fieldError(errors.name?.message)}>
        <Input {...form.register('name')} />
      </FormField>
      {isCompany ? (
        <FormField
          id="ice"
          label={t('clientForm.ice')}
          hint={t('clientForm.iceHint')}
          error={fieldError(errors.ice?.message)}
        >
          <Input dir="ltr" inputMode="numeric" maxLength={15} {...form.register('ice')} />
        </FormField>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="email"
          label={t('clientForm.email')}
          error={fieldError(errors.email?.message)}
        >
          <Input type="email" dir="ltr" autoComplete="off" {...form.register('email')} />
        </FormField>
        <FormField
          id="phone"
          label={t('clientForm.phone')}
          error={fieldError(errors.phone?.message)}
        >
          <Input type="tel" dir="ltr" {...form.register('phone')} />
        </FormField>
      </div>
      <FormField
        id="address"
        label={t('clientForm.address')}
        error={fieldError(errors.address?.message)}
      >
        <Input {...form.register('address')} />
      </FormField>
      <FormField id="notes" label={t('clientForm.notes')} error={fieldError(errors.notes?.message)}>
        <textarea
          rows={3}
          className="w-full rounded-control border border-border bg-surface px-3 py-2 text-base text-foreground"
          {...form.register('notes')}
        />
      </FormField>
      <Button type="submit" size="lg" disabled={pending} className="self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
