'use client';

import { OFFLINE_PAYMENT_METHODS } from '@mtr/shared';
import { useTranslations } from 'next-intl';
import type { UseFormRegisterReturn } from 'react-hook-form';

/** Offline payment choice as selectable cards: the checked one takes the deep teal border. */
export function PaymentOptions({ field }: { field: UseFormRegisterReturn<'paymentMethod'> }) {
  const t = useTranslations('book');

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 font-heading text-lg font-semibold text-primary">
        {t('fields.payment')}
      </legend>
      {OFFLINE_PAYMENT_METHODS.map((method) => (
        <label
          key={method}
          className="flex cursor-pointer items-start gap-3 rounded-control border border-border p-4 text-sm transition-colors duration-150 hover:border-muted has-checked:border-secondary has-checked:bg-background has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-secondary"
        >
          <input
            type="radio"
            value={method}
            className="mt-0.5 size-4 shrink-0 accent-secondary focus-visible:outline-none"
            {...field}
          />
          <span>
            <span className="block font-semibold">{t(`payment.${method}.title`)}</span>
            <span className="mt-0.5 block text-muted">{t(`payment.${method}.text`)}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
