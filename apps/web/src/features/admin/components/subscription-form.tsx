'use client';

import {
  PLAN_CODES,
  SUBSCRIPTION_STATUSES,
  type PlanCode,
  type SubscriptionStatus,
} from '@mtr/shared';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { updateSubscriptionAction } from '../actions';
import { ActionFeedback } from './action-feedback';
import { useAdminAction } from './use-admin-action';

export interface SubscriptionValues {
  planCode: PlanCode;
  status: SubscriptionStatus;
  /** yyyy-mm-dd or '' */
  trialEndsAt: string;
  periodStart: string;
  periodEnd: string;
}

export function SubscriptionForm({
  companyId,
  initial,
}: {
  companyId: string;
  initial: SubscriptionValues;
}) {
  const t = useTranslations();
  const [values, setValues] = useState(initial);
  const { pending, result, run } = useAdminAction();
  const set = <K extends keyof SubscriptionValues>(key: K, value: SubscriptionValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    run(() => updateSubscriptionAction({ companyId, ...values }));
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id="plan" label={t('subscription.plan')}>
          <Select
            value={values.planCode}
            onChange={(event) => set('planCode', event.target.value as PlanCode)}
          >
            {PLAN_CODES.map((code) => (
              <option key={code} value={code}>
                {t(`plans.${code}`)}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="status" label={t('subscription.status')}>
          <Select
            value={values.status}
            onChange={(event) => set('status', event.target.value as SubscriptionStatus)}
          >
            {SUBSCRIPTION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(`subscriptionStatus.${status}`)}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="trial-end" label={t('admin.companies.trialEndsAt')}>
          <Input
            type="date"
            value={values.trialEndsAt}
            onChange={(event) => set('trialEndsAt', event.target.value)}
          />
        </FormField>
        <div />
        <FormField id="period-start" label={t('admin.companies.periodStart')}>
          <Input
            type="date"
            value={values.periodStart}
            onChange={(event) => set('periodStart', event.target.value)}
          />
        </FormField>
        <FormField id="period-end" label={t('admin.companies.periodEnd')}>
          <Input
            type="date"
            value={values.periodEnd}
            onChange={(event) => set('periodEnd', event.target.value)}
          />
        </FormField>
      </div>
      <Button type="submit" variant="secondary" disabled={pending} className="self-start">
        {t('admin.companies.save')}
      </Button>
      <ActionFeedback result={result} />
    </form>
  );
}
