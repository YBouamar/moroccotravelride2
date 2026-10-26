'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { bookingSchema, OFFLINE_PAYMENT_METHODS, type BookingInput } from '@mtr/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { Turnstile } from '@/components/security/turnstile';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Link, useRouter } from '@/i18n/navigation';
import { createBookingAction, type BookingError } from '../actions';

interface BookingFormProps {
  offer: string;
  date: string;
  time: string;
  passengers: number;
  siteKey?: string;
  nonce?: string;
}

/** Guest booking form (step 14): no account needed, the magic link is sent by e-mail. */
export function BookingForm({ offer, date, time, passengers, siteKey, nonce }: BookingFormProps) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<BookingError | null>(null);
  const [captcha, setCaptcha] = useState('');
  const [captchaKey, setCaptchaKey] = useState(0);
  const form = useForm<BookingInput>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      travelerName: '',
      travelerEmail: '',
      travelerPhone: '',
      luggage: passengers,
      pickupAddress: '',
      dropoffAddress: '',
      flightNumber: '',
      notes: '',
      paymentMethod: 'cash_to_driver',
    },
  });
  const errors = form.formState.errors;
  const fieldError = (code?: string) =>
    code ? t(`validation.${code}` as 'validation.required') : undefined;

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await createBookingAction(values, {
        offer,
        date,
        time,
        passengers,
        locale,
        captcha,
      });
      if (!result.ok) {
        setError(result.error);
        // Turnstile tokens are single use: get a fresh one for the next attempt.
        setCaptchaKey((key) => key + 1);
        return;
      }
      router.push(`/booking/${result.ref}?t=${result.token}`);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {error ? <Alert tone="danger">{t(`book.errors.${error}`)}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="travelerName"
          label={t('book.fields.name')}
          error={fieldError(errors.travelerName?.message)}
        >
          <Input autoComplete="name" {...form.register('travelerName')} />
        </FormField>
        <FormField
          id="travelerEmail"
          label={t('book.fields.email')}
          hint={t('book.fields.emailHint')}
          error={fieldError(errors.travelerEmail?.message)}
        >
          <Input type="email" dir="ltr" autoComplete="email" {...form.register('travelerEmail')} />
        </FormField>
        <FormField
          id="travelerPhone"
          label={t('book.fields.phone')}
          hint={t('book.fields.phoneHint')}
          error={fieldError(errors.travelerPhone?.message)}
        >
          <Input type="tel" dir="ltr" autoComplete="tel" {...form.register('travelerPhone')} />
        </FormField>
        <FormField
          id="luggage"
          label={t('book.fields.luggage')}
          error={fieldError(errors.luggage?.message)}
        >
          <Input type="number" min={0} {...form.register('luggage', { valueAsNumber: true })} />
        </FormField>
        <FormField
          id="pickupAddress"
          label={t('book.fields.pickupAddress')}
          error={fieldError(errors.pickupAddress?.message)}
        >
          <Input {...form.register('pickupAddress')} />
        </FormField>
        <FormField
          id="dropoffAddress"
          label={t('book.fields.dropoffAddress')}
          error={fieldError(errors.dropoffAddress?.message)}
        >
          <Input {...form.register('dropoffAddress')} />
        </FormField>
        <FormField
          id="flightNumber"
          label={t('book.fields.flight')}
          error={fieldError(errors.flightNumber?.message)}
        >
          <Input dir="ltr" {...form.register('flightNumber')} />
        </FormField>
        <FormField
          id="notes"
          label={t('book.fields.notes')}
          error={fieldError(errors.notes?.message)}
        >
          <Input {...form.register('notes')} />
        </FormField>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">{t('book.fields.payment')}</legend>
        {OFFLINE_PAYMENT_METHODS.map((method) => (
          <label
            key={method}
            className="flex items-start gap-2 rounded-control border border-border p-3 text-sm"
          >
            <input
              type="radio"
              value={method}
              className="mt-1 size-4"
              {...form.register('paymentMethod')}
            />
            <span>
              <span className="block font-medium">{t(`book.payment.${method}.title`)}</span>
              <span className="block text-muted">{t(`book.payment.${method}.text`)}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1 size-4" {...form.register('acceptTerms')} />
        <span>
          {t.rich('book.fields.terms', {
            link: (chunks) => (
              <Link href="/legal/terms" className="underline" target="_blank">
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
        {t('book.submit')}
      </Button>
    </form>
  );
}
