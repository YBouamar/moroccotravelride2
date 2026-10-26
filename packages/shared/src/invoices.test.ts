import { describe, expect, it } from 'vitest';
import {
  amountDue,
  canBeCredited,
  canReceivePayment,
  computeLine,
  computeTotals,
  invoiceLineSchema,
  paymentSchema,
  percentInputToBps,
  vatBreakdown,
} from './invoices';

describe('invoice amounts (BR-111)', () => {
  it('rounds VAT half-up per line, like the database trigger', () => {
    expect(computeLine(1, 80_000, 1000)).toEqual({ subtotal: 80_000, vat: 8000, total: 88_000 });
    expect(computeLine(3, 3333, 1000)).toEqual({ subtotal: 9999, vat: 1000, total: 10_999 });
    expect(computeLine(1, 50_000, 0)).toEqual({ subtotal: 50_000, vat: 0, total: 50_000 });
  });

  it('sums the rounded lines', () => {
    const totals = computeTotals([computeLine(1, 80_000, 1000), computeLine(3, 3333, 1000)]);
    expect(totals).toEqual({ subtotal: 89_999, vat: 9000, total: 98_999 });
  });

  it('groups the VAT by rate', () => {
    const lines = [
      { ...computeLine(1, 10_000, 2000), vatRate: 2000 },
      { ...computeLine(2, 5000, 1000), vatRate: 1000 },
      { ...computeLine(1, 5000, 2000), vatRate: 2000 },
    ];
    expect(vatBreakdown(lines)).toEqual([
      { vatRate: 1000, base: 10_000, vat: 1000 },
      { vatRate: 2000, base: 15_000, vat: 3000 },
    ]);
  });

  it('rejects invalid quantities', () => {
    expect(() => computeLine(0, 100, 0)).toThrow(RangeError);
  });
});

describe('invoice states', () => {
  it('accepts payments only on issued invoices and credits only issued ones', () => {
    expect(canReceivePayment('draft')).toBe(false);
    expect(canReceivePayment('partially_paid')).toBe(true);
    expect(canReceivePayment('paid')).toBe(false);
    expect(canBeCredited('paid')).toBe(true);
    expect(canBeCredited('cancelled')).toBe(false);
    expect(amountDue(10_000, 12_000)).toBe(0);
  });
});

describe('invoice inputs', () => {
  it('parses VAT percentages into basis points', () => {
    expect(percentInputToBps('20')).toBe(2000);
    expect(percentInputToBps('5,5')).toBe(550);
    expect(percentInputToBps('101')).toBeUndefined();
    expect(percentInputToBps('abc')).toBeUndefined();
  });

  it('validates lines and payments', () => {
    const line = { description: 'Transfert', quantity: 1, unitPrice: '800', vatRate: '10' };
    expect(invoiceLineSchema.safeParse(line).success).toBe(true);
    expect(invoiceLineSchema.safeParse({ ...line, unitPrice: '' }).success).toBe(false);
    expect(invoiceLineSchema.safeParse({ ...line, vatRate: '' }).success).toBe(false);
    const payment = { amount: '500', method: 'cash', paidOn: '2026-10-26', reference: '' };
    expect(paymentSchema.safeParse(payment).success).toBe(true);
    expect(paymentSchema.safeParse({ ...payment, amount: '0' }).success).toBe(false);
  });
});
