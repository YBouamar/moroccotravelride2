import 'server-only';
import { INVOICE_STATUSES, likePattern, pageRange, type InvoiceStatus } from '@mtr/shared';
import { createClient } from '@/lib/supabase/server';

/** Invoices, credit notes and payments (step 10). RLS: owners, managers and accountants. */

export const isInvoiceStatus = (value: unknown): value is InvoiceStatus =>
  typeof value === 'string' && (INVOICE_STATUSES as readonly string[]).includes(value);

export async function listInvoices(
  companyId: string,
  query: { q?: string; status?: string; page: number },
) {
  const supabase = await createClient();
  const { from, to } = pageRange(query.page);
  let request = supabase
    .from('invoices')
    .select(
      'id, number, status, issue_date, due_date, total_cents, paid_cents, created_at, client:clients(name)',
      { count: 'exact' },
    )
    .eq('company_id', companyId);
  const pattern = likePattern(query.q);
  if (pattern) {
    // Number or client name: the matching clients are looked up first (one filter per table).
    const { data: clients } = await supabase
      .from('clients')
      .select('id')
      .eq('company_id', companyId)
      .ilike('name', pattern)
      .limit(100);
    const ids = (clients ?? []).map((client) => client.id);
    request = request.or(
      ids.length
        ? `number.ilike.${pattern},client_id.in.(${ids.join(',')})`
        : `number.ilike.${pattern}`,
    );
  }
  if (isInvoiceStatus(query.status)) request = request.eq('status', query.status);
  const { data, count, error } = await request
    .order('created_at', { ascending: false })
    .order('id')
    .range(from, to);
  if (error) throw error;
  return { rows: data, total: count ?? 0 };
}

export async function getInvoice(companyId: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('invoices')
    .select(
      'id, company_id, client_id, number, status, issue_date, due_date, notes, subtotal_cents, vat_cents, total_cents, paid_cents, seller, buyer, created_at, client:clients(name, type, ice, address, email), lines:invoice_lines(id, position, description, quantity, unit_price_cents, vat_rate_bps, subtotal_cents, vat_cents, total_cents, trip_id, created_at), payments(id, amount_cents, method, paid_on, reference, created_at), credit_note:credit_notes(number, issue_date, reason, total_cents)',
    )
    .eq('company_id', companyId)
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  const byPosition = <T extends { position: number; created_at: string }>(a: T, b: T) =>
    a.position - b.position || a.created_at.localeCompare(b.created_at);
  return {
    ...data,
    lines: [...data.lines].sort(byPosition),
    payments: [...data.payments].sort((a, b) => a.paid_on.localeCompare(b.paid_on)),
    // One full credit note at most (unique invoice_id).
    creditNote: (Array.isArray(data.credit_note) ? data.credit_note[0] : data.credit_note) ?? null,
  };
}

export type InvoiceDetail = NonNullable<Awaited<ReturnType<typeof getInvoice>>>;

/** Completed trips not yet on a live invoice (drafts and issued, credited ones are free again). */
export async function getUninvoicedTrips(companyId: string) {
  const supabase = await createClient();
  const [trips, lines] = await Promise.all([
    supabase
      .from('trips')
      .select(
        'id, starts_at, passenger_name, price_cents, client_id, pickup:cities!trips_pickup_city_id_fkey(name_fr, name_en, name_ar), dropoff:cities!trips_dropoff_city_id_fkey(name_fr, name_en, name_ar)',
      )
      .eq('company_id', companyId)
      .eq('status', 'completed')
      .order('starts_at', { ascending: false })
      .limit(200),
    supabase
      .from('invoice_lines')
      .select('trip_id, invoice:invoices!inner(status)')
      .eq('company_id', companyId)
      .not('trip_id', 'is', null)
      .neq('invoice.status', 'cancelled'),
  ]);
  const billed = new Set((lines.data ?? []).map((line) => line.trip_id));
  return (trips.data ?? []).filter((trip) => !billed.has(trip.id));
}

export type UninvoicedTrip = Awaited<ReturnType<typeof getUninvoicedTrips>>[number];

export async function getInvoiceClients(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('clients')
    .select('id, name')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name')
    .limit(1000);
  return data ?? [];
}

export async function getCompanyInvoiceSettings(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('companies')
    .select('default_vat_rate, ice, if_number, rc_number, address')
    .eq('id', companyId)
    .single();
  return data;
}
