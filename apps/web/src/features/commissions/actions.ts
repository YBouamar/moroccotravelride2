'use server';

import { parseMoneyInput } from '@mtr/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getSessionUser } from '@/features/auth/session';
import { fail, type FormResult } from '@/lib/action-result';
import { createClient } from '@/lib/supabase/server';

/**
 * Admin actions on commission statements (step 16). The database functions check that the caller
 * is a platform admin with MFA (private.is_platform_admin requires aal2).
 */

async function adminOnly() {
  const user = await getSessionUser();
  return !!user?.isPlatformAdmin;
}

export async function generateStatementsAction(month: string): Promise<FormResult> {
  if (!(await adminOnly())) return fail('forbidden');
  const parsed = z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .safeParse(month);
  if (!parsed.success) return fail('invalid');
  const supabase = await createClient();
  const { error } = await supabase.rpc('generate_commission_statements', {
    p_month: `${parsed.data}-01`,
  });
  if (error) return fail(error.code === '42501' ? 'forbidden' : 'unknown');
  revalidatePath('/', 'layout');
  return { ok: true };
}

const paymentSchema = z.object({
  amount: z.string().refine((value) => (parseMoneyInput(value) ?? 0) > 0),
  method: z.enum(['cash', 'instant_transfer', 'bank_transfer']),
  receivedOn: z.iso.date(),
  reference: z.string().trim().max(120),
});

export async function recordStatementPaymentAction(
  statementId: string,
  input: z.input<typeof paymentSchema>,
): Promise<FormResult> {
  if (!(await adminOnly()) || !z.uuid().safeParse(statementId).success) return fail('forbidden');
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return fail('invalid');
  const supabase = await createClient();
  const { error } = await supabase.rpc('record_statement_payment', {
    p_statement: statementId,
    p_amount_cents: parseMoneyInput(parsed.data.amount)!,
    p_method: parsed.data.method,
    p_received_on: parsed.data.receivedOn,
    p_reference: parsed.data.reference || undefined,
  });
  if (error)
    return fail(
      error.code === 'MT008' ? 'paymentRefused' : error.code === '42501' ? 'forbidden' : 'unknown',
    );
  revalidatePath('/', 'layout');
  return { ok: true };
}
