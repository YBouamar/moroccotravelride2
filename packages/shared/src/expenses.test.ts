import { describe, expect, it } from 'vitest';
import { expenseSchema, isExpenseReviewable, totalsByCategory } from './expenses';

describe('expenses (BR-115)', () => {
  it('validates amounts and dates', () => {
    const base = {
      category: 'fuel',
      amount: '450',
      spentOn: '2026-10-26',
      description: '',
      vehicleId: '',
      driverId: '',
    } as const;
    expect(expenseSchema.safeParse(base).success).toBe(true);
    expect(expenseSchema.safeParse({ ...base, amount: '0' }).success).toBe(false);
    expect(expenseSchema.safeParse({ ...base, spentOn: '26/10/2026' }).success).toBe(false);
  });

  it('only submitted expenses can be reviewed', () => {
    expect(isExpenseReviewable('submitted')).toBe(true);
    expect(isExpenseReviewable('approved')).toBe(false);
  });

  it('sums approved expenses per category', () => {
    const totals = totalsByCategory([
      { category: 'fuel', amountCents: 45_000, status: 'approved' },
      { category: 'fuel', amountCents: 30_000, status: 'submitted' },
      { category: 'toll', amountCents: 2_000, status: 'approved' },
    ]);
    expect(totals.fuel).toBe(45_000);
    expect(totals.toll).toBe(2_000);
    expect(totals.meal).toBe(0);
  });
});
