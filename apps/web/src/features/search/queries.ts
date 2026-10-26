import 'server-only';
import { searchPickupAt, searchSchema, type SearchInput } from '@mtr/shared';
import type { Locale } from 'next-intl';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

/** Public marketplace search (step 13). Runs public.search_offers, allowed to anonymous users. */

export type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Valid search from the query string, or null (the page then shows the empty form). */
export function parseSearch(params: SearchParams): SearchInput | null {
  const parsed = searchSchema.safeParse({
    from: first(params.from),
    to: first(params.to),
    date: first(params.date),
    time: first(params.time),
    passengers: first(params.passengers),
  });
  return parsed.success ? parsed.data : null;
}

/** All active places (cities and airports) with their name in the UI language. */
export const getPublicPlaces = cache(async (locale: Locale) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cities')
    .select('id, slug, name_fr, name_en, name_ar, is_airport')
    .eq('is_active', true);
  if (error) throw error;
  return (data ?? [])
    .map((city) => ({
      id: city.id,
      slug: city.slug,
      name: city[`name_${locale}`],
      isAirport: city.is_airport,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
});

export async function searchOffers(search: SearchInput, locale: Locale) {
  const supabase = await createClient();
  const [{ data, error }, types] = await Promise.all([
    supabase.rpc('search_offers', {
      p_from: search.from,
      p_to: search.to,
      p_pickup_at: searchPickupAt(search).toISOString(),
      p_passengers: search.passengers,
    }),
    supabase.from('vehicle_types').select('code, name_fr, name_en, name_ar, indicative_seats'),
  ]);
  if (error) throw error;
  // Public rating from published reviews only (moderated, step 27).
  const companies = [...new Set((data ?? []).map((offer) => offer.company_id))];
  const { data: ratings } = companies.length
    ? await supabase.rpc('carrier_ratings', { p_companies: companies })
    : { data: [] };
  const ratingOf = new Map((ratings ?? []).map((rating) => [rating.company_id, rating]));
  const typeName = new Map((types.data ?? []).map((type) => [type.code, type[`name_${locale}`]]));
  return (data ?? []).map((offer) => ({
    offerId: offer.offer_id,
    carrierName: offer.carrier_name,
    vehicleType: typeName.get(offer.vehicle_type_code) ?? offer.vehicle_type_code,
    priceCents: offer.price_cents,
    maxSeats: offer.max_seats,
    rating: ratingOf.get(offer.company_id) ?? null,
  }));
}

export type Offer = Awaited<ReturnType<typeof searchOffers>>[number];
