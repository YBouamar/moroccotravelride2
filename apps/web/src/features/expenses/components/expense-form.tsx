'use client';

import { EXPENSE_CATEGORIES } from '@mtr/shared';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useOnboardingAction } from '@/features/onboarding/components/use-onboarding-action';
import { createExpenseAction } from '../actions';

interface ExpenseFormProps {
  today: string;
  vehicles: { id: string; registration: string }[];
  drivers: { id: string; full_name: string }[];
}

/** Office expense with an optional receipt (multipart form, checked server side). */
export function ExpenseForm({ today, vehicles, drivers }: ExpenseFormProps) {
  const t = useTranslations();
  const { pending, error, run } = useOnboardingAction();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        run(
          () => createExpenseAction(data),
          () => formRef.current?.reset(),
        );
      }}
    >
      {error ? <Alert tone="danger">{t(`onboarding.errors.${error}`)}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expense-category">{t('expenses.category')}</Label>
          <Select id="expense-category" name="category" required defaultValue="fuel">
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {t(`expenseCategory.${category}`)}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expense-amount">{t('expenses.amount')}</Label>
          <Input id="expense-amount" name="amount" inputMode="decimal" dir="ltr" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expense-date">{t('expenses.date')}</Label>
          <Input
            id="expense-date"
            name="spentOn"
            type="date"
            max={today}
            defaultValue={today}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expense-vehicle">{t('tripForm.vehicle')}</Label>
          <Select id="expense-vehicle" name="vehicleId" defaultValue="">
            <option value="">{t('expenses.none')}</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.registration}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expense-driver">{t('tripForm.driver')}</Label>
          <Select id="expense-driver" name="driverId" defaultValue="">
            <option value="">{t('expenses.none')}</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.full_name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expense-receipt">{t('expenses.receipt')}</Label>
          <Input
            id="expense-receipt"
            name="receipt"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expense-description">{t('expenses.description')}</Label>
        <Input id="expense-description" name="description" maxLength={300} />
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {t('expenses.add')}
      </Button>
    </form>
  );
}
