'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  QUOTE_KINDS,
  quoteRequestSchema,
  type QuoteKind,
  type QuoteRequestInput,
} from '@mtr/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { Turnstile } from '@/components/security/turnstile';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Link } from '@/i18n/navigation';
import { createQuoteRequestAction, type QuoteError } from '../actions';

interface QuoteFormProps {
  kind: QuoteKind;
  cities: { id: string; name: string }[];
  /** First day a request can start (tomorrow, Morocco time); the server checks again. */
  minDay: string;
  siteKey?: string;
  nonce?: string;
}

/** Quote request for chauffeur hire or an organized tour (ADR-040): no account needed. */
export function QuoteForm({ kind, cities, minDay, siteKey, nonce }: QuoteFormProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<QuoteError | null>(null);
  const [sent, setSent] = useState(false);
  const [captcha, setCaptcha] = useState('');
  const [captchaKey, setCaptchaKey] = useState(0);
  const form = useForm<QuoteRequestInput>({
    resolver: zodResolver(quoteRequestSchema),
    defaultValues: {
      kind,
      name: '',
      email: '',
      phone: '',
      fromCity: '',
      startDate: '',
      days: 1,
      passengers: 2,
      message: '',
    },
  });
  const errors = form.formState.errors;
  const fieldError = (code?: string) =>
    code ? t(`validation.${code}` as 'validation.required') : undefined;

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await createQuoteRequestAction(values, { locale, captcha });
      // Turnstile tokens are single use: get a fresh one for any next attempt.
      setCaptchaKey((key) => key + 1);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSent(true);
      form.reset();
    });
  });

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="success">{t('quote.sent')}</Alert>
        <Link href="/" className="text-sm font-medium text-secondary underline">
          {t('quote.backHome')}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {error ? <Alert tone="danger">{t(`quote.errors.${error}`)}</Alert> : null}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">{t('quote.fields.kind')}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {QUOTE_KINDS.map((option) => (
            <label
              key={option}
              className="flex items-start gap-2 rounded-control border border-border p-3 text-sm has-checked:border-secondary has-checked:bg-background"
            >
              <input
                type="radio"
                value={option}
                className="mt-1 size-4"
                {...form.register('kind')}
              />
              <span>
                <span className="block font-medium">{t(`quote.kinds.${option}.title`)}</span>
                <span className="block text-muted">{t(`quote.kinds.${option}.text`)}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="name" label={t('book.fields.name')} error={fieldError(errors.name?.message)}>
          <Input autoComplete="name" {...form.register('name')} />
        </FormField>
        <FormField
          id="email"
          label={t('book.fields.email')}
          error={fieldError(errors.email?.message)}
        >
          <Input type="email" dir="ltr" autoComplete="email" {...form.register('email')} />
        </FormField>
        <FormField
          id="phone"
          label={t('book.fields.phone')}
          hint={t('book.fields.phoneHint')}
          error={fieldError(errors.phone?.message)}
        >
          <Input type="tel" dir="ltr" autoComplete="tel" {...form.register('phone')} />
        </FormField>
        <FormField
          id="fromCity"
          label={t('quote.fields.city')}
          error={fieldError(errors.fromCity?.message)}
        >
          <Select {...form.register('fromCity')}>
            <option value="">{t('search.placePlaceholder')}</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField
          id="startDate"
          label={t('quote.fields.startDate')}
          error={fieldError(errors.startDate?.message)}
        >
          <Input type="date" min={minDay} {...form.register('startDate')} />
        </FormField>
        <FormField
          id="days"
          label={t('quote.fields.days')}
          error={fieldError(errors.days?.message)}
        >
          <Input
            type="number"
            min={1}
            max={30}
            {...form.register('days', { valueAsNumber: true })}
          />
        </FormField>
        <FormField
          id="passengers"
          label={t('search.passengers')}
          error={fieldError(errors.passengers?.message)}
        >
          <Input
            type="number"
            min={1}
            max={80}
            {...form.register('passengers', { valueAsNumber: true })}
          />
        </FormField>
      </div>
      <FormField
        id="message"
        label={t('quote.fields.message')}
        hint={t('quote.fields.messageHint')}
        error={fieldError(errors.message?.message)}
      >
        <textarea
          rows={4}
          className="w-full rounded-control border border-border bg-surface px-3 py-2 text-base text-foreground placeholder:text-muted"
          {...form.register('message')}
        />
      </FormField>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1 size-4" {...form.register('acceptTerms')} />
        <span>
          {t.rich('quote.fields.terms', {
            link: (chunks) => (
              <Link href="/legal/privacy" className="underline" target="_blank">
                {chunks}
              </Link>
            ),
          })}
        </span>
      </label>
      {errors.acceptTerms ? (
        <p className="text-sm text-danger">{fieldError('acceptTerms')}</p>
      ) : null}

      <Turnstile
        key={captchaKey}
        siteKey={siteKey}
        nonce={nonce}
        locale={locale}
        onToken={setCaptcha}
      />
      <Button type="submit" size="lg" disabled={pending} className="self-start">
        {t('quote.submit')}
      </Button>
    </form>
  );
}
