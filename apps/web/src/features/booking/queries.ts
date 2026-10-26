import 'server-only';
import type { SearchInput } from '@mtr/shared';
import type { Locale } from 'next-intl';
import { searchOffers } from '@/features/search/queries';
import { createAdminClient } from '@/lib/supabase/admin';

/** The offer being booked, re-checked with the same rules as the search (eligibility, seats). */
export async function getBookableOffer(offerId: string, search: SearchInput, locale: Locale) {
  const offers = await searchOffers(search, locale);
  return offers.find((offer) => offer.offerId === offerId) ?? null;
}

/**
 * Booking seen by the traveler through the magic link. The service role is used because a guest
 * has no session; the caller must have verified the signed token for this reference first.
 */
export async function getGuestBooking(publicRef: string) {
  const { data } = await createAdminClient()
    .from('bookings')
    .select(
      'id, public_ref, status, payment_status, payment_method, cancellation_policy, traveler_name, traveler_email, passengers, luggage, pickup_address, dropoff_address, flight_number, pickup_at, total_cents, refund_cents, cancel_reason, accept_deadline, locale, from:cities!bookings_from_city_id_fkey(name_fr, name_en, name_ar), to:cities!bookings_to_city_id_fkey(name_fr, name_en, name_ar), vehicle_type:vehicle_types(name_fr, name_en, name_ar), company:companies(trade_name, legal_name, bank_name, bank_rib)',
    )
    .eq('public_ref', publicRef)
    .maybeSingle();
  return data;
}

export type GuestBooking = NonNullable<Awaited<ReturnType<typeof getGuestBooking>>>;
