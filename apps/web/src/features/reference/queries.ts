import 'server-only';
import type { Locale } from 'next-intl';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export interface Option {
  id: string;
  name: string;
}

/** Cities usable as a head office (airports excluded), sorted in the UI language. */
export const getCityOptions = cache(async (locale: Locale): Promise<Option[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cities')
    .select('id, name_fr, name_en, name_ar')
    .eq('is_airport', false)
    .eq('is_active', true);
  if (error) throw error;
  return (data ?? [])
    .map((city) => ({ id: city.id, name: city[`name_${locale}`] }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
});

/** Vehicle types in their display order, with the indicative seat count. */
export const getVehicleTypeOptions = cache(
  async (locale: Locale): Promise<(Option & { seats: number })[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('vehicle_types')
      .select('code, name_fr, name_en, name_ar, indicative_seats')
      .order('sort_order');
    if (error) throw error;
    return (data ?? []).map((type) => ({
      id: type.code,
      name: type[`name_${locale}`],
      seats: type.indicative_seats,
    }));
  },
);
