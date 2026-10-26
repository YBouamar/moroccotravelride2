import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/** Trips of the signed-in driver (RLS: a driver reads the trips assigned to them only). */

export interface DriverTrip {
  id: string;
  company_id: string;
  status: 'planned' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  starts_at: string;
  ends_at: string;
  passenger_name: string;
  passenger_phone: string | null;
  passengers: number;
  luggage: number;
  pickup_address: string;
  dropoff_address: string;
  notes: string | null;
  pickup: { name_fr: string; name_en: string; name_ar: string } | null;
  dropoff: { name_fr: string; name_en: string; name_ar: string } | null;
  vehicle: { registration: string; brand: string; model: string } | null;
}

const COLUMNS =
  'id, company_id, status, starts_at, ends_at, passenger_name, passenger_phone, passengers, luggage, pickup_address, dropoff_address, notes, pickup:cities!trips_pickup_city_id_fkey(name_fr, name_en, name_ar), dropoff:cities!trips_dropoff_city_id_fkey(name_fr, name_en, name_ar), vehicle:vehicles(registration, brand, model)';

/** Open trips from the start of today (device time) over the next 7 days. */
export function useDriverTrips() {
  const [trips, setTrips] = useState<DriverTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 8 * 24 * 60 * 60 * 1000);
    const { data, error } = await supabase
      .from('trips')
      .select(COLUMNS)
      .in('status', ['assigned', 'in_progress', 'planned'])
      .gte('ends_at', start.toISOString())
      .lt('starts_at', end.toISOString())
      .order('starts_at');
    setFailed(!!error);
    if (!error) setTrips((data ?? []) as unknown as DriverTrip[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { trips, loading, failed, reload: load };
}

export async function getDriverTrip(id: string): Promise<DriverTrip | null> {
  const { data } = await supabase.from('trips').select(COLUMNS).eq('id', id).maybeSingle();
  return (data as unknown as DriverTrip | null) ?? null;
}
