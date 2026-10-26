import { z } from 'zod';
import { applyRate, assertCents, type BasisPoints, type Cents } from './money';
import { parseMoneyInput } from './trips';

/**
 * Invoices (step 10). Mirrors the database triggers of the invoicing migration, which remain
 * the authority: per-line VAT rounded half-up (BR-111), totals = sum of lines, gapless numbers
 * assigned at issue (BR-107), issued invoices immutable (BR-108).
 */

export const INVOICE_STATUSES = ['draft', 'issued', 'partially_paid', 'paid', 'cancelled'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_PAYMENT_METHODS = ['bank_transfer', 'cash', 'cheque', 'other'] as const;
export type InvoicePaymentMethod = (typeof INVOICE_PAYMENT_METHODS)[number];

export interface LineAmounts {
  subtotal: Cents;
  vat: Cents;
  total: Cents;
}

export function computeLine(quantity: number, unitPrice: Cents, vatRate: BasisPoints): LineAmounts {
  if (!Number.isInteger(quantity) || quantity < 1) throw new RangeError('quantity must be >= 1');
  assertCents(unitPrice);
  const subtotal = quantity * unitPrice;
  assertCents(subtotal, 'subtotal');
  const vat = applyRate(subtotal, vatRate);
  return { subtotal, vat, total: subtotal + vat };
}

export function computeTotals(lines: LineAmounts[]): LineAmounts {
  return lines.reduce(
    (sum, line) => ({
      subtotal: sum.subtotal + line.subtotal,
      vat: sum.vat + line.vat,
      total: sum.total + line.total,
    }),
    { subtotal: 0, vat: 0, total: 0 },
  );
}

/** VAT breakdown per rate, as printed at the bottom of an invoice. */
export function vatBreakdown(
  lines: (LineAmounts & { vatRate: BasisPoints })[],
): { vatRate: BasisPoints; base: Cents; vat: Cents }[] {
  const byRate = new Map<number, { base: Cents; vat: Cents }>();
  for (const line of lines) {
    const entry = byRate.get(line.vatRate) ?? { base: 0, vat: 0 };
    entry.base += line.subtotal;
    entry.vat += line.vat;
    byRate.set(line.vatRate, entry);
  }
  return [...byRate.entries()]
    .sort(([a], [b]) => a - b)
    .map(([vatRate, entry]) => ({ vatRate, ...entry }));
}

export const isInvoiceEditable = (status: InvoiceStatus) => status === 'draft';
export const canReceivePayment = (status: InvoiceStatus) =>
  status === 'issued' || status === 'partially_paid';
export const canBeCredited = (status: InvoiceStatus) =>
  status === 'issued' || status === 'partially_paid' || status === 'paid';

/** Remaining amount due (never negative). */
export const amountDue = (total: Cents, paid: Cents): Cents => Math.max(0, total - paid);

/** Percent typed by a user ("20", "5,5") to basis points; undefined when invalid. */
export function percentInputToBps(text: string): BasisPoints | undefined {
  const match = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(text.trim());
  if (!match) return undefined;
  const bps = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return bps <= 10_000 ? bps : undefined;
}

const amount = z
  .string()
  .refine((value) => typeof parseMoneyInput(value) === 'number', { error: 'amount' });
const percent = z
  .string()
  .refine((value) => percentInputToBps(value) !== undefined, { error: 'vatRate' });

export const invoiceLineSchema = z.object({
  description: z.string().trim().min(2, { error: 'required' }).max(300, { error: 'tooLong' }),
  quantity: z
    .number({ error: 'required' })
    .int({ error: 'required' })
    .min(1, { error: 'quantity' })
    .max(10_000, { error: 'quantity' }),
  unitPrice: amount,
  vatRate: percent,
});
export type InvoiceLineInput = z.input<typeof invoiceLineSchema>;

export const paymentSchema = z.object({
  amount: z.string().refine((value) => (parseMoneyInput(value) ?? 0) > 0, { error: 'amount' }),
  method: z.enum(INVOICE_PAYMENT_METHODS),
  paidOn: z.iso.date({ error: 'date' }),
  reference: z.string().trim().max(120, { error: 'tooLong' }),
});
export type PaymentInput = z.input<typeof paymentSchema>;
