'use server';

import {
  bpsToRate,
  can,
  casablancaDate,
  invoiceLineSchema,
  parseMoneyInput,
  paymentSchema,
  percentInputToBps,
  type InvoiceLineInput,
  type PaymentInput,
} from '@mtr/shared';
import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { z } from 'zod';
import { getCompanyContext } from '@/features/companies/context';
import { redirect } from '@/i18n/navigation';
import { fail, fromDbError, type FormResult } from '@/lib/action-result';
import { createClient } from '@/lib/supabase/server';

/**
 * Invoice writes (step 10). The company comes from the session (rule 11). Numbering, frozen
 * legal details, immutability and payment checks are done by the database (invoicing migration).
 */
async function financeContext(
  ...ids: string[]
): Promise<{ error: FormResult } | { companyId: string; role: string }> {
  if (ids.some((id) => !z.uuid().safeParse(id).success)) return { error: fail('forbidden') };
  const context = await getCompanyContext();
  if (!context || !can(context.membership.role, 'invoices.manage')) {
    return { error: fail('forbidden') };
  }
  if (!context.canWrite) return { error: fail('readOnly') };
  return { companyId: context.membership.companyId, role: context.membership.role };
}

const done = (id?: string): FormResult => {
  revalidatePath('/', 'layout');
  return { ok: true, id };
};

/** Lines keep the order in which they were added. */
async function nextPosition(invoiceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('invoice_lines')
    .select('position')
    .eq('invoice_id', invoiceId)
    .order('position', { ascending: false })
    .limit(1);
  return (data?.[0]?.position ?? -1) + 1;
}

const oneRow = (result: { error: { code?: string } | null; data: unknown[] | null }) => {
  if (result.error) return fromDbError(result.error);
  return result.data?.length ? done() : fail('forbidden');
};

export async function createInvoiceAction(clientId: string): Promise<FormResult> {
  const context = await financeContext(clientId);
  if ('error' in context) return context.error;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('invoices')
    .insert({ company_id: context.companyId, client_id: clientId })
    .select('id')
    .single();
  if (error) return fromDbError(error);
  revalidatePath('/', 'layout');
  return redirect({ href: `/app/invoices/${data.id}`, locale: await getLocale() });
}

export async function addInvoiceLineAction(
  invoiceId: string,
  input: InvoiceLineInput,
): Promise<FormResult> {
  const context = await financeContext(invoiceId);
  if ('error' in context) return context.error;
  const parsed = invoiceLineSchema.safeParse(input);
  if (!parsed.success) return fail('invalid');

  const supabase = await createClient();
  const { error } = await supabase.from('invoice_lines').insert({
    invoice_id: invoiceId,
    company_id: context.companyId,
    position: await nextPosition(invoiceId),
    description: parsed.data.description,
    quantity: parsed.data.quantity,
    unit_price_cents: parseMoneyInput(parsed.data.unitPrice) ?? 0,
    vat_rate_bps: percentInputToBps(parsed.data.vatRate)!,
  });
  return error ? fromDbError(error) : done();
}

const tripLinesSchema = z.object({
  tripIds: z.array(z.uuid()).min(1).max(100),
  vatRate: z.string().refine((value) => percentInputToBps(value) !== undefined),
});

/** One line per completed trip, priced with the agreed trip price. */
export async function addTripLinesAction(
  invoiceId: string,
  input: { tripIds: string[]; vatRate: string; labels: Record<string, string> },
): Promise<FormResult> {
  const context = await financeContext(invoiceId);
  if ('error' in context) return context.error;
  const parsed = tripLinesSchema.safeParse(input);
  if (!parsed.success) return fail('invalid');

  const supabase = await createClient();
  const { data: trips, error: tripsError } = await supabase
    .from('trips')
    .select('id, price_cents, starts_at')
    .eq('company_id', context.companyId)
    .eq('status', 'completed')
    .in('id', parsed.data.tripIds);
  if (tripsError) return fromDbError(tripsError);
  if (!trips.length) return fail('invalid');

  const vatRate = percentInputToBps(parsed.data.vatRate)!;
  const base = await nextPosition(invoiceId);
  const { error } = await supabase.from('invoice_lines').insert(
    trips
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      .map((trip, index) => ({
        invoice_id: invoiceId,
        company_id: context.companyId,
        position: base + index,
        // The label is built by the page (translated, Morocco date); it is only a description.
        description: (input.labels[trip.id] ?? '').slice(0, 300) || trip.id,
        quantity: 1,
        unit_price_cents: trip.price_cents ?? 0,
        vat_rate_bps: vatRate,
        trip_id: trip.id,
      })),
  );
  return error ? fromDbError(error) : done();
}

export async function deleteInvoiceLineAction(
  invoiceId: string,
  lineId: string,
): Promise<FormResult> {
  const context = await financeContext(invoiceId, lineId);
  if ('error' in context) return context.error;
  const supabase = await createClient();
  return oneRow(
    await supabase
      .from('invoice_lines')
      .delete()
      .eq('id', lineId)
      .eq('invoice_id', invoiceId)
      .eq('company_id', context.companyId)
      .select('id'),
  );
}

const draftSchema = z.object({
  dueDate: z.union([z.literal(''), z.iso.date()]),
  notes: z.string().trim().max(1000),
});

export async function updateDraftAction(
  invoiceId: string,
  input: { dueDate: string; notes: string },
): Promise<FormResult> {
  const context = await financeContext(invoiceId);
  if ('error' in context) return context.error;
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return fail('invalid');
  const supabase = await createClient();
  return oneRow(
    await supabase
      .from('invoices')
      .update({ due_date: parsed.data.dueDate || null, notes: parsed.data.notes || null })
      .eq('id', invoiceId)
      .eq('company_id', context.companyId)
      .eq('status', 'draft')
      .select('id'),
  );
}

export async function deleteDraftAction(invoiceId: string): Promise<FormResult> {
  const context = await financeContext(invoiceId);
  if ('error' in context) return context.error;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId)
    .eq('company_id', context.companyId)
    .eq('status', 'draft')
    .select('id');
  if (error) return fromDbError(error);
  if (!data.length) return fail('forbidden');
  revalidatePath('/', 'layout');
  return redirect({ href: '/app/invoices', locale: await getLocale() });
}

export async function issueInvoiceAction(invoiceId: string): Promise<FormResult> {
  const context = await financeContext(invoiceId);
  if ('error' in context) return context.error;
  const supabase = await createClient();
  const { error } = await supabase.rpc('issue_invoice', { p_invoice_id: invoiceId });
  return error ? fromDbError(error) : done(invoiceId);
}

export async function createCreditNoteAction(
  invoiceId: string,
  reason: string,
): Promise<FormResult> {
  const context = await financeContext(invoiceId);
  if ('error' in context) return context.error;
  const parsed = z.string().trim().min(3).max(300).safeParse(reason);
  if (!parsed.success) return fail('invalid');
  const supabase = await createClient();
  const { error } = await supabase.rpc('create_credit_note', {
    p_invoice_id: invoiceId,
    p_reason: parsed.data,
  });
  return error ? fromDbError(error) : done(invoiceId);
}

export async function addPaymentAction(
  invoiceId: string,
  input: PaymentInput,
): Promise<FormResult> {
  const context = await financeContext(invoiceId);
  if ('error' in context) return context.error;
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return fail('invalid');
  // A payment cannot be dated in the future (Morocco calendar).
  if (parsed.data.paidOn > casablancaDate()) return fail('invalid');

  const supabase = await createClient();
  const { error } = await supabase.from('payments').insert({
    company_id: context.companyId,
    invoice_id: invoiceId,
    amount_cents: parseMoneyInput(parsed.data.amount)!,
    method: parsed.data.method,
    paid_on: parsed.data.paidOn,
    reference: parsed.data.reference || null,
  });
  return error ? fromDbError(error) : done(invoiceId);
}

export async function deletePaymentAction(
  invoiceId: string,
  paymentId: string,
): Promise<FormResult> {
  const context = await financeContext(invoiceId, paymentId);
  if ('error' in context) return context.error;
  const supabase = await createClient();
  return oneRow(
    await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId)
      .eq('invoice_id', invoiceId)
      .eq('company_id', context.companyId)
      .select('id'),
  );
}

/** Default VAT rate of the company (ADR-007: chosen by the carrier, never imposed). */
export async function setDefaultVatAction(percent: string): Promise<FormResult> {
  const context = await getCompanyContext();
  if (!context || !can(context.membership.role, 'company.update')) return fail('forbidden');
  const bps = percent.trim() === '' ? null : percentInputToBps(percent);
  if (bps === undefined) return fail('invalid');
  const supabase = await createClient();
  return oneRow(
    await supabase
      .from('companies')
      .update({ default_vat_rate: bps === null ? null : bpsToRate(bps) })
      .eq('id', context.membership.companyId)
      .select('id'),
  );
}
