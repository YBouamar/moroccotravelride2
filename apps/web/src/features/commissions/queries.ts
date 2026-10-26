import 'server-only';
import { casablancaDate, casablancaStartOfDay, pageRange } from '@mtr/shared';
import { createClient } from '@/lib/supabase/server';

/** Commission statements (step 16). RLS: finance roles of the company, platform admins. */

export const STATEMENT_STATUSES = ['issued', 'overdue', 'paid'] as const;

export async function getCarrierCommissions(companyId: string) {
  const supabase = await createClient();
  const monthStart = casablancaStartOfDay(`${casablancaDate().slice(0, 7)}-01`);
  const [statements, unbilled] = await Promise.all([
    supabase
      .from('commission_statements')
      .select('id, month, total_cents, paid_cents, status, due_date')
      .eq('company_id', companyId)
      .order('month', { ascending: false })
      .limit(24),
    supabase
      .from('commission_ledger')
      .select('amount_cents')
      .eq('company_id', companyId)
      .is('statement_id', null)
      .gte('occurred_at', monthStart.toISOString()),
  ]);
  return {
    statements: statements.data ?? [],
    currentMonthCents: (unbilled.data ?? []).reduce((sum, line) => sum + line.amount_cents, 0),
  };
}

export async function listAllStatements(query: { status?: string; page: number }) {
  const supabase = await createClient();
  const { from, to } = pageRange(query.page);
  let request = supabase
    .from('commission_statements')
    .select(
      'id, month, total_cents, paid_cents, status, due_date, company:companies(id, legal_name, trade_name, marketplace_suspended_at)',
      {
        count: 'exact',
      },
    );
  if ((STATEMENT_STATUSES as readonly string[]).includes(query.status ?? '')) {
    request = request.eq('status', query.status as (typeof STATEMENT_STATUSES)[number]);
  }
  const { data, count, error } = await request
    .order('due_date', { ascending: true })
    .order('id')
    .range(from, to);
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

/** Admin supervision of marketplace bookings (step 17). */
export async function listAllBookings(query: { status?: string; page: number }) {
  const supabase = await createClient();
  const { from, to } = pageRange(query.page);
  let request = supabase
    .from('bookings')
    .select(
      'id, public_ref, status, payment_status, payment_method, traveler_name, traveler_email, traveler_phone, pickup_at, total_cents, commission_cents, cancel_reason, accept_deadline, created_at, company:companies(id, legal_name, trade_name)',
      { count: 'exact' },
    );
  if (query.status) request = request.eq('status', query.status as 'pending_carrier');
  const { data, count, error } = await request
    .order('created_at', { ascending: false })
    .order('id')
    .range(from, to);
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}
