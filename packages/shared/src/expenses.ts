import { z } from 'zod';
import { parseMoneyInput } from './trips';

/** Expenses (step 18, V2). BR-115: submitted -> approved | rejected, decided by the office. */

export const EXPENSE_CATEGORIES = [
  'fuel',
  'toll',
  'parking',
  'maintenance',
  'meal',
  'other',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_STATUSES = ['submitted', 'approved', 'rejected'] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const isExpenseReviewable = (status: ExpenseStatus) => status === 'submitted';

export const expenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.string().refine(
    (value) => {
      const cents = parseMoneyInput(value);
      return typeof cents === 'number' && cents > 0 && cents <= 100_000_000;
    },
    { error: 'amount' },
  ),
  spentOn: z.iso.date({ error: 'date' }),
  description: z.string().trim().max(300, { error: 'tooLong' }),
  vehicleId: z.union([z.literal(''), z.uuid()]),
  driverId: z.union([z.literal(''), z.uuid()]),
});
export type ExpenseInput = z.input<typeof expenseSchema>;

/** Totals per category, for the monthly view (approved expenses only). */
export function totalsByCategory(
  expenses: { category: ExpenseCategory; amountCents: number; status: ExpenseStatus }[],
): Record<ExpenseCategory, number> {
  const totals = Object.fromEntries(EXPENSE_CATEGORIES.map((category) => [category, 0])) as Record<
    ExpenseCategory,
    number
  >;
  for (const expense of expenses) {
    if (expense.status === 'approved') totals[expense.category] += expense.amountCents;
  }
  return totals;
}
