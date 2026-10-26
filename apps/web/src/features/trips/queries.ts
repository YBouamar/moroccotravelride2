import 'server-only';
import { likePattern, pageRange, TRIP_STATUSES, type TripStatus } from '@mtr/shared';
import type { Locale } from 'next-intl';
import { createClient } from '@/lib/supabase/server';

/** Trips, planning and assignment options (step 9). RLS restricts every query to the company. */

const TRIP_COLUMNS =
  'id, origin, status, passenger_name, passenger_phone, passengers, luggage, starts_at, ends_at, price_cents, pickup_address, dropoff_address, notes, conflict_override, override_reason, cancel_reason, client_id, vehicle_id, driver_id, pickup:cities!trips_pickup_city_id_fkey(id, name_fr, name_en, name_ar), dropoff:cities!trips_dropoff_city_id_fkey(id, name_fr, name_en, name_ar), vehicle:vehicles(registration, brand, model), driver:drivers(full_name), client:clients(name)';

export const isTripStatus = (value: unknown): value is TripStatus =>
  typeof value === 'string' && (TRIP_STATUSES as readonly string[]).includes(value);

export interface TripListQuery {
  q?: string;
  status?: string;
  /** UTC bounds of the period (Morocco days converted by the page). */
  from?: Date;
  to?: Date;
  page: number;
}

export async function listTrips(companyId: string, query: TripListQuery) {
  const supabase = await createClient();
  const { from, to } = pageRange(query.page);
  let request = supabase
    .from('trips')
    .select(TRIP_COLUMNS, { count: 'exact' })
    .eq('company_id', companyId);
  const pattern = likePattern(query.q);
  if (pattern) {
    request = request.or(
      `passenger_name.ilike.${pattern},pickup_address.ilike.${pattern},dropoff_address.ilike.${pattern}`,
    );
  }
  if (isTripStatus(query.status)) request = request.eq('status', query.status);
  if (query.from) request = request.gte('starts_at', query.from.toISOString());
  if (query.to) request = request.lt('starts_at', query.to.toISOString());
  const { data, count, error } = await request
    .order('starts_at', { ascending: true })
    .order('id')
    .range(from, to);
  if (error) throw error;
  return { rows: data, total: count ?? 0 };
}

/** Trips overlapping [from, to), cancelled ones excluded, for the planning views. */
export async function getPlanningTrips(companyId: string, from: Date, to: Date) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trips')
    .select(TRIP_COLUMNS)
    .eq('company_id', companyId)
    .neq('status', 'cancelled')
    .lt('starts_at', to.toISOString())
    .gt('ends_at', from.toISOString())
    .order('starts_at')
    .limit(500);
  if (error) throw error;
  return data;
}

export type TripRow = Awaited<ReturnType<typeof getPlanningTrips>>[number];

export async function getTrip(companyId: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('trips')
    .select(TRIP_COLUMNS)
    .eq('company_id', companyId)
    .eq('id', id)
    .maybeSingle();
  return data;
}

/** Cities and airports for pickups and drop-offs, sorted in the UI language. */
export async function getPlaceOptions(locale: Locale) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cities')
    .select('id, name_fr, name_en, name_ar, is_airport')
    .eq('is_active', true);
  if (error) throw error;
  return (data ?? [])
    .map((city) => ({ id: city.id, name: city[`name_${locale}`] }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

/** Active vehicles, drivers (with their license date for the Q24 warning) and clients. */
export async function getAssignmentOptions(companyId: string) {
  const supabase = await createClient();
  const [vehicles, drivers, clients] = await Promise.all([
    supabase
      .from('vehicles')
      .select('id, registration, brand, model, seats')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .order('registration'),
    supabase
      .from('drivers')
      .select('id, full_name, license_expires_on, status')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .order('full_name'),
    supabase
      .from('clients')
      .select('id, name')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name')
      .limit(1000),
  ]);
  return {
    vehicles: vehicles.data ?? [],
    drivers: drivers.data ?? [],
    clients: clients.data ?? [],
  };
}

export type AssignmentOptions = Awaited<ReturnType<typeof getAssignmentOptions>>;
