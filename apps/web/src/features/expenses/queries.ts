import 'server-only';
import { EXPENSE_STATUSES, pageRange, type ExpenseStatus } from '@mtr/shared';
import { createClient } from '@/lib/supabase/server';

/** Expenses (step 18, V2). RLS: office roles read all, drivers their own. */

export const isExpenseStatus = (value: unknown): value is ExpenseStatus =>
  typeof value === 'string' && (EXPENSE_STATUSES as readonly string[]).includes(value);

export async function listExpenses(companyId: string, query: { status?: string; page: number }) {
  const supabase = await createClient();
  const { from, to } = pageRange(query.page);
  let request = supabase
    .from('expenses')
    .select(
      'id, category, amount_cents, spent_on, description, status, rejection_reason, receipt_path, created_at, vehicle:vehicles(registration), driver:drivers(full_name)',
      { count: 'exact' },
    )
    .eq('company_id', companyId);
  if (isExpenseStatus(query.status)) request = request.eq('status', query.status);
  const { data, count, error } = await request
    .order('spent_on', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

export type ExpenseRow = Awaited<ReturnType<typeof listExpenses>>['rows'][number];
