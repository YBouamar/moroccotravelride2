import 'server-only';
import type { Locale } from 'next-intl';
import { cache } from 'react';
import { getPublicPlaces } from '@/features/search/queries';
import { createClient } from '@/lib/supabase/server';

/**
 * Real "from" prices of the home page (ADR-040): lowest active price of eligible carriers
 * (public.route_price_overview), never a hard-coded or invented figure.
 */
export const getHomePrices = cache(async (locale: Locale) => {
  const supabase = await createClient();
  const [places, { data, error }] = await Promise.all([
    getPublicPlaces(locale),
    supabase.rpc('route_price_overview'),
  ]);
  if (error) throw error;
  const placeById = new Map(places.map((place) => [place.id, place]));

  // A route and its return trip are shown once, at the lower of both prices.
  const routes = new Map<string, { from: string; to: string; minPriceCents: number }>();
  const cityMin = new Map<string, number>();
  for (const row of data ?? []) {
    const price = Number(row.min_price_cents);
    const key = [row.from_city_id, row.to_city_id].sort().join(':');
    const known = routes.get(key);
    if (!known || price < known.minPriceCents) {
      routes.set(key, { from: row.from_city_id, to: row.to_city_id, minPriceCents: price });
    }
    for (const id of [row.from_city_id, row.to_city_id]) {
      cityMin.set(id, Math.min(cityMin.get(id) ?? price, price));
    }
  }

  const popularRoutes = [...routes.values()]
    .filter((route) => placeById.has(route.from) && placeById.has(route.to))
    .sort((a, b) => a.minPriceCents - b.minPriceCents)
    .slice(0, 6)
    .map((route) => ({
      ...route,
      fromName: placeById.get(route.from)!.name,
      toName: placeById.get(route.to)!.name,
    }));

  return {
    places,
    popularRoutes,
    /** Lowest transfer price touching a city (or nothing yet). */
    cityMinPrice: (cityId: string) => cityMin.get(cityId),
    transferMinPrice: cityMin.size ? Math.min(...cityMin.values()) : undefined,
  };
});
