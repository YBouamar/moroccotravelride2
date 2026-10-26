'use server';

import {
  ACCEPTED_DOCUMENT_MIME,
  can,
  detectDocumentType,
  expenseSchema,
  MAX_DOCUMENT_BYTES,
  parseMoneyInput,
} from '@mtr/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getSessionUser } from '@/features/auth/session';
import { getCompanyContext } from '@/features/companies/context';
import { fail, fromDbError, type FormResult } from '@/lib/action-result';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { createClient } from '@/lib/supabase/server';

/**
 * Expenses from the web (step 18). The database decides who may file, review and change what
 * (trigger private.guard_expense and RLS); the company comes from the session (rule 11).
 */

const done = (): FormResult => {
  revalidatePath('/', 'layout');
  return { ok: true };
};

export async function createExpenseAction(formData: FormData): Promise<FormResult> {
  const [context, user] = await Promise.all([getCompanyContext(), getSessionUser()]);
  if (!context || !user || !can(context.membership.role, 'expenses.read')) return fail('forbidden');
  if (!context.canWrite) return fail('readOnly');
  const parsed = expenseSchema.safeParse({
    category: formData.get('category'),
    amount: formData.get('amount') ?? '',
    spentOn: formData.get('spentOn') ?? '',
    description: formData.get('description') ?? '',
    vehicleId: formData.get('vehicleId') ?? '',
    driverId: formData.get('driverId') ?? '',
  });
  if (!parsed.success) return fail('invalid');
  const companyId = context.membership.companyId;
  const supabase = await createClient();

  // Optional receipt: real type from the bytes, 10 MB, rate limited like documents.
  let receiptPath: string | null = null;
  const file = formData.get('receipt');
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_DOCUMENT_BYTES) return fail('fileSize');
    if (!(await consumeRateLimit('upload-user', user.id, 20, 60 * 60))) return fail('rateLimited');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = detectDocumentType(bytes);
    if (!mime) return fail('fileType');
    receiptPath = `${companyId}/${crypto.randomUUID()}.${ACCEPTED_DOCUMENT_MIME[mime]}`;
    const upload = await supabase.storage
      .from('expense-receipts')
      .upload(receiptPath, bytes, { contentType: mime, upsert: false });
    if (upload.error) return fail('unknown');
  }

  const value = parsed.data;
  const { error } = await supabase.from('expenses').insert({
    company_id: companyId,
    category: value.category,
    amount_cents: parseMoneyInput(value.amount)!,
    spent_on: value.spentOn,
    description: value.description || null,
    vehicle_id: value.vehicleId || null,
    driver_id: value.driverId || null,
    receipt_path: receiptPath,
  });
  if (error) {
    if (receiptPath) await supabase.storage.from('expense-receipts').remove([receiptPath]);
    return fromDbError(error);
  }
  return done();
}

export async function reviewExpenseAction(
  expenseId: string,
  decision: 'approved' | 'rejected',
  reason = '',
): Promise<FormResult> {
  if (!z.uuid().safeParse(expenseId).success) return fail('forbidden');
  const context = await getCompanyContext();
  if (!context || !can(context.membership.role, 'expenses.review')) return fail('forbidden');
  if (decision !== 'approved' && decision !== 'rejected') return fail('invalid');
  const trimmed = reason.trim().slice(0, 300);
  if (decision === 'rejected' && trimmed.length < 3) return fail('invalid');

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('expenses')
    .update({ status: decision, rejection_reason: decision === 'rejected' ? trimmed : null })
    .eq('id', expenseId)
    .eq('company_id', context.membership.companyId)
    .select('id');
  if (error) return fromDbError(error);
  return data.length ? done() : fail('forbidden');
}

/** Short-lived link to a receipt (RLS on storage decides who may read it). */
export async function getReceiptUrlAction(expenseId: string): Promise<string | null> {
  if (!z.uuid().safeParse(expenseId).success) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('expenses')
    .select('receipt_path')
    .eq('id', expenseId)
    .maybeSingle();
  if (!data?.receipt_path) return null;
  const signed = await supabase.storage
    .from('expense-receipts')
    .createSignedUrl(data.receipt_path, 300);
  return signed.data?.signedUrl ?? null;
}
