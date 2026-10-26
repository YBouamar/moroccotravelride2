import 'server-only';
import type { Locale } from 'next-intl';
import { createClient } from '@/lib/supabase/server';

/**
 * Live map data (step 20): trips in progress with their last known position. RLS: owners,
 * managers and dispatchers read positions (accountants and the platform do not).
 */
export async function getLiveTrips(companyId: string, locale: Locale) {
  const supabase = await createClient();
  const [trips, positions] = await Promise.all([
    supabase
      .from('trips')
      .select(
        'id, starts_at, ends_at, passenger_name, driver:drivers(full_name), vehicle:vehicles(registration), pickup:cities!trips_pickup_city_id_fkey(name_fr, name_en, name_ar), dropoff:cities!trips_dropoff_city_id_fkey(name_fr, name_en, name_ar)',
      )
      .eq('company_id', companyId)
      .eq('status', 'in_progress')
      .order('starts_at'),
    supabase.rpc('live_positions', { p_company: companyId }),
  ]);
  const byTrip = new Map((positions.data ?? []).map((point) => [point.trip_id, point]));
  const name = (place: { name_fr: string; name_en: string; name_ar: string } | null) =>
    place ? place[`name_${locale}`] : '';
  return (trips.data ?? []).map((trip) => {
    const point = byTrip.get(trip.id);
    return {
      id: trip.id,
      label: `${trip.driver?.full_name ?? ''} · ${trip.vehicle?.registration ?? ''}`,
      route: `${name(trip.pickup)} / ${name(trip.dropoff)}`,
      passenger: trip.passenger_name,
      position: point
        ? { lat: Number(point.latitude), lng: Number(point.longitude), at: point.recorded_at }
        : null,
    };
  });
}

export type LiveTrip = Awaited<ReturnType<typeof getLiveTrips>>[number];
