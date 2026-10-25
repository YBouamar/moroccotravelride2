'use client';

import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { setCommissionRateAction } from '../actions';
import { ActionFeedback } from './action-feedback';
import { useAdminAction } from './use-admin-action';

interface CommissionFormProps {
  companyId: string;
  /** Current specific rate in percent, '' when the platform default applies. */
  initialPercent: string;
  defaultPercent: string;
}

export function CommissionForm({ companyId, initialPercent, defaultPercent }: CommissionFormProps) {
  const t = useTranslations('admin.companies');
  const [percent, setPercent] = useState(initialPercent);
  const { pending, result, run } = useAdminAction();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    run(() => setCommissionRateAction({ companyId, percent }));
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <FormField
        id="commission"
        label={t('commissionLabel')}
        hint={t('commissionHint', { rate: defaultPercent })}
      >
        <Input
          inputMode="decimal"
          dir="ltr"
          value={percent}
          onChange={(event) => setPercent(event.target.value)}
        />
      </FormField>
      <Button type="submit" variant="secondary" disabled={pending} className="self-start">
        {t('save')}
      </Button>
      <ActionFeedback result={result} />
    </form>
  );
}
