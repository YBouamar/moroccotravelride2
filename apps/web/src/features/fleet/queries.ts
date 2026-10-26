import 'server-only';
import { likePattern, pageRange } from '@mtr/shared';
import { createClient } from '@/lib/supabase/server';
import {
  DRIVER_STATUSES,
  CLIENT_FILTERS,
  SORTS,
  VEHICLE_STATUSES,
  type ListEntity,
} from './constants';

/**
 * Server-side lists of vehicles, drivers and clients (step 8). The company always comes from the
 * signed-in user's context; RLS restricts every query to that company's rows anyway.
 */

export interface ListQuery {
  q?: string;
  status?: string;
  sort?: string;
  /** 1-based page; `null` returns every row (CSV export, capped). */
  page: number | null;
}

/** Hard cap of a CSV export: a carrier has a few hundred rows at most at this stage. */
export const EXPORT_LIMIT = 5000;

const isOneOf = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (values as readonly string[]).includes(value);

function sortColumn(entity: ListEntity, sort: string | undefined) {
  const sorts: Record<string, string> = SORTS[entity];
  const key = sort && sort in sorts ? sort : Object.keys(sorts)[0]!;
  // Recent first, everything else alphabetical / soonest first.
  return { column: sorts[key]!, ascending: key !== 'recent', key };
}

function range(page: number | null) {
  return page === null ? { from: 0, to: EXPORT_LIMIT - 1 } : pageRange(page);
}

export async function listVehicles(companyId: string, query: ListQuery) {
  const supabase = await createClient();
  const { column, ascending } = sortColumn('vehicles', query.sort);
  const { from, to } = range(query.page);
  let request = supabase
    .from('vehicles')
    .select(
      'id, registration, brand, model, vehicle_type_code, seats, luggage_capacity, year, status',
      { count: 'exact' },
    )
    .eq('company_id', companyId);
  const pattern = likePattern(query.q);
  if (pattern) {
    request = request.or(
      `registration.ilike.${pattern},brand.ilike.${pattern},model.ilike.${pattern}`,
    );
  }
  if (isOneOf(VEHICLE_STATUSES, query.status)) request = request.eq('status', query.status);
  const { data, count, error } = await request
    .order(column, { ascending })
    .order('id')
    .range(from, to);
  if (error) throw error;
  return { rows: data, total: count ?? 0 };
}

export async function listDrivers(companyId: string, query: ListQuery) {
  const supabase = await createClient();
  const { column, ascending } = sortColumn('drivers', query.sort);
  const { from, to } = range(query.page);
  let request = supabase
    .from('drivers')
    .select(
      'id, full_name, phone, license_number, license_expires_on, professional_card_expires_on, languages, status',
      { count: 'exact' },
    )
    .eq('company_id', companyId);
  const pattern = likePattern(query.q);
  if (pattern) {
    request = request.or(
      `full_name.ilike.${pattern},phone.ilike.${pattern},license_number.ilike.${pattern}`,
    );
  }
  if (isOneOf(DRIVER_STATUSES, query.status)) request = request.eq('status', query.status);
  const { data, count, error } = await request
    .order(column, { ascending })
    .order('id')
    .range(from, to);
  if (error) throw error;
  return { rows: data, total: count ?? 0 };
}

export async function listClients(companyId: string, query: ListQuery) {
  const supabase = await createClient();
  const { column, ascending } = sortColumn('clients', query.sort);
  const { from, to } = range(query.page);
  let request = supabase
    .from('clients')
    .select('id, type, name, ice, email, phone, address, is_active', { count: 'exact' })
    .eq('company_id', companyId);
  const pattern = likePattern(query.q);
  if (pattern) {
    request = request.or(
      `name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},ice.ilike.${pattern}`,
    );
  }
  if (isOneOf(CLIENT_FILTERS, query.status)) {
    request = request.eq('is_active', query.status === 'active');
  }
  const { data, count, error } = await request
    .order(column, { ascending })
    .order('id')
    .range(from, to);
  if (error) throw error;
  return { rows: data, total: count ?? 0 };
}

export async function getVehicle(companyId: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('vehicles')
    .select(
      'id, registration, brand, model, vehicle_type_code, seats, luggage_capacity, year, status',
    )
    .eq('company_id', companyId)
    .eq('id', id)
    .maybeSingle();
  return data;
}

export async function getDriver(companyId: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('drivers')
    .select(
      'id, full_name, phone, license_number, license_expires_on, professional_card_number, professional_card_expires_on, languages, status',
    )
    .eq('company_id', companyId)
    .eq('id', id)
    .maybeSingle();
  return data;
}

export async function getClient(companyId: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('clients')
    .select('id, type, name, ice, email, phone, address, notes, is_active')
    .eq('company_id', companyId)
    .eq('id', id)
    .maybeSingle();
  return data;
}
