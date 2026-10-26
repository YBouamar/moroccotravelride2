import 'server-only';
import { BOOKING_STATUSES, pageRange, type BookingStatus } from '@mtr/shared';
import { createClient } from '@/lib/supabase/server';

/** Carrier side of marketplace bookings (step 15). RLS: office roles of the company. */

export const isBookingStatus = (value: unknown): value is BookingStatus =>
  typeof value === 'string' && (BOOKING_STATUSES as readonly string[]).includes(value);

export async function listCarrierBookings(
  companyId: string,
  query: { status?: string; page: number },
) {
  const supabase = await createClient();
  const { from, to } = pageRange(query.page);
  let request = supabase
    .from('bookings')
    .select(
      'id, public_ref, status, payment_status, payment_method, traveler_name, traveler_phone, passengers, luggage, pickup_address, dropoff_address, flight_number, notes, pickup_at, total_cents, commission_cents, carrier_cents, refund_cents, accept_deadline, cancel_reason, trip_id, from:cities!bookings_from_city_id_fkey(name_fr, name_en, name_ar), to:cities!bookings_to_city_id_fkey(name_fr, name_en, name_ar), vehicle_type:vehicle_types(name_fr, name_en, name_ar)',
      { count: 'exact' },
    )
    .eq('company_id', companyId);
  if (isBookingStatus(query.status)) request = request.eq('status', query.status);
  const { data, count, error } = await request
    .order('pickup_at', { ascending: true })
    .order('id')
    .range(from, to);
  if (error) throw error;
  // Pending bookings first: they expire (BR-010).
  const rows = [...(data ?? [])].sort(
    (a, b) => Number(b.status === 'pending_carrier') - Number(a.status === 'pending_carrier'),
  );
  return { rows, total: count ?? 0 };
}

export type CarrierBooking = Awaited<ReturnType<typeof listCarrierBookings>>['rows'][number];

export async function countPendingBookings(companyId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'pending_carrier');
  return count ?? 0;
}
