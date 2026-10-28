'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { bookingSchema, type BookingInput } from '@mtr/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { Turnstile } from '@/components/security/turnstile';
import { Alert } from '@/components/ui/alert';
import { FormField } from '@/components/ui/form-field';
import { Input, Textarea } from '@/components/ui/input';
import { Link, useRouter } from '@/i18n/navigation';
import { createBookingAction, type BookingError } from '../actions';
import { BookingSubmit } from './booking-submit';
import { PaymentOptions } from './payment-options';

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
      router.push(`/booking/${result.ref}`);
    });
  });

  const invalidCount = form.formState.submitCount > 0 ? Object.keys(errors).length : 0;
  const section = 'mb-3 font-heading text-lg font-semibold text-primary';

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
      {error ? <Alert tone="danger">{t(`book.errors.${error}`)}</Alert> : null}

      <fieldset>
        <legend className={section}>{t('book.sections.contact')}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField
              id="travelerName"
              label={t('book.fields.name')}
              error={fieldError(errors.travelerName?.message)}
            >
              <Input autoComplete="name" {...form.register('travelerName')} />
            </FormField>
          </div>
          <FormField
            id="travelerEmail"
            label={t('book.fields.email')}
            hint={t('book.fields.emailHint')}
            error={fieldError(errors.travelerEmail?.message)}
          >
            <Input
              type="email"
              dir="ltr"
              autoComplete="email"
              {...form.register('travelerEmail')}
            />
          </FormField>
          <FormField
            id="travelerPhone"
            label={t('book.fields.phone')}
            hint={t('book.fields.phoneHint')}
            error={fieldError(errors.travelerPhone?.message)}
          >
            <Input type="tel" dir="ltr" autoComplete="tel" {...form.register('travelerPhone')} />
          </FormField>
        </div>
      </fieldset>

      <fieldset>
        <legend className={section}>{t('book.sections.trip')}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
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
            <Input
              dir="ltr"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              {...form.register('flightNumber')}
            />
          </FormField>
          <FormField
            id="luggage"
            label={t('book.fields.luggage')}
            error={fieldError(errors.luggage?.message)}
          >
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              {...form.register('luggage', { valueAsNumber: true })}
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField
              id="notes"
              label={t('book.fields.notes')}
              error={fieldError(errors.notes?.message)}
            >
              <Textarea rows={3} {...form.register('notes')} />
            </FormField>
          </div>
        </div>
      </fieldset>

      <PaymentOptions field={form.register('paymentMethod')} />

      <div className="flex flex-col gap-5 border-t border-border pt-6">
        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 accent-secondary"
              aria-invalid={errors.acceptTerms ? true : undefined}
              aria-describedby={errors.acceptTerms ? 'acceptTerms-error' : undefined}
              {...form.register('acceptTerms')}
            />
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
            <p id="acceptTerms-error" className="mt-1.5 ms-7 text-sm text-danger">
              {fieldError('acceptTerms')}
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
        <BookingSubmit pending={pending} invalidCount={invalidCount} />
      </div>
    </form>
  );
}
