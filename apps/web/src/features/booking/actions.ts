'use server';

import {
  bookingSchema,
  formatMoney,
  PUBLIC_REF_PATTERN,
  searchPickupAt,
  searchSchema,
  type BookingInput,
} from '@mtr/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getBookingLinkSecret } from '@/lib/env.server';
import { asAppLocale } from '@/lib/locale';
import { readBookingCookie, setBookingCookie } from '@/lib/security/booking-cookie';
import { verifyBookingToken } from '@/lib/security/booking-link';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { getClientIp } from '@/lib/security/request-context';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { createAdminClient } from '@/lib/supabase/admin';
import { bookingLink, notifyBooking } from './notify';

export type BookingError =
  | 'invalid'
  | 'captcha'
  | 'rateLimited'
  | 'unavailable'
  | 'tooLate'
  | 'cannotCancel'
  | 'link'
  | 'unknown';
export type BookingResult = { ok: true; ref: string } | { ok: false; error: BookingError };

const fail = (error: BookingError): BookingResult => ({ ok: false, error });

const contextSchema = searchSchema
  .pick({ date: true, time: true, passengers: true })
  .extend({ offer: z.uuid(), locale: z.string(), captcha: z.string().optional() });

/**
 * Guest booking (step 14, BR-014). Anti-bot and rate limit first, then the database function,
 * which re-checks the offer, the lead time and freezes price and commission (BR-003).
 */
export async function createBookingAction(
  input: BookingInput,
  context: z.input<typeof contextSchema>,
): Promise<BookingResult> {
  const ctx = contextSchema.safeParse(context);
  const parsed = bookingSchema.safeParse(input);
  if (!ctx.success || !parsed.success) return fail('invalid');

  const ip = await getClientIp();
  if (!(await consumeRateLimit('booking-ip', ip, 10, 60 * 60))) return fail('rateLimited');
  if (!(await verifyTurnstile(ctx.data.captcha, ip))) return fail('captcha');
  const value = parsed.data;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('create_booking', {
    p_offer: ctx.data.offer,
    p_pickup_at: searchPickupAt(ctx.data).toISOString(),
    p_passengers: ctx.data.passengers,
    p_luggage: value.luggage,
    p_traveler_name: value.travelerName,
    p_traveler_email: value.travelerEmail,
    p_traveler_phone: value.travelerPhone,
    p_pickup_address: value.pickupAddress,
    p_dropoff_address: value.dropoffAddress,
    p_flight_number: value.flightNumber,
    p_notes: value.notes,
    p_payment_method: value.paymentMethod,
    p_locale: asAppLocale(ctx.data.locale),
  });
  if (error) {
    if (error.code === 'MT021') return fail('tooLate');
    if (error.code === 'MT020') return fail('unavailable');
    console.error('booking failed', error.code);
    return fail('unknown');
  }
  const created = data[0];
  if (!created) return fail('unknown');

  const { data: booking } = await admin
    .from('bookings')
    .select(
      'id, company_id, public_ref, traveler_name, traveler_email, pickup_at, locale, total_cents',
    )
    .eq('id', created.booking_id)
    .single();
  if (booking) {
    await notifyBooking(booking, {
      traveler: 'booking_received',
      carrier: 'booking_new_for_carrier',
    });
  }
  // The traveler who just booked gets the access cookie directly: no token in any URL.
  if (booking) await setBookingCookie(created.public_ref, bookingLink(booking).token);
  return { ok: true, ref: created.public_ref };
}

/** Traveler cancellation through the magic link (BR-011); the token comes from the cookie. */
export async function cancelGuestBookingAction(
  ref: string,
  reason: string,
): Promise<BookingResult> {
  if (!PUBLIC_REF_PATTERN.test(ref)) return fail('link');
  const token = await readBookingCookie(ref);
  const ip = await getClientIp();
  if (!(await consumeRateLimit('booking-cancel-ip', ip, 20, 60 * 60))) return fail('rateLimited');

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from('bookings')
    .select(
      'id, company_id, public_ref, traveler_name, traveler_email, pickup_at, locale, total_cents',
    )
    .eq('public_ref', ref)
    .maybeSingle();
  if (
    !booking ||
    !verifyBookingToken({
      secret: getBookingLinkSecret(),
      ref,
      email: booking.traveler_email,
      token,
    })
  ) {
    return fail('link');
  }

  const { data: refund, error } = await admin.rpc('cancel_booking_by_traveler', {
    p_booking: booking.id,
    p_reason: z.string().trim().max(300).catch('').parse(reason),
  });
  if (error) return fail(error.code === 'MT024' ? 'cannotCancel' : 'unknown');

  await notifyBooking(
    booking,
    { traveler: 'booking_cancelled', carrier: 'booking_cancelled' },
    { refund: formatMoney(Number(refund ?? 0), asAppLocale(booking.locale)) },
  );
  revalidatePath('/', 'layout');
  return { ok: true, ref };
}

/**
 * Exchanges the token of an e-mail link (read by the page from the URL fragment, which browsers
 * never send to the server) for the HttpOnly access cookie of this booking.
 */
export async function openBookingLinkAction(ref: string, token: string): Promise<BookingResult> {
  if (!PUBLIC_REF_PATTERN.test(ref) || typeof token !== 'string' || token.length > 200) {
    return fail('link');
  }
  if (!(await consumeRateLimit('booking-link-ip', await getClientIp(), 30, 60 * 60))) {
    return fail('rateLimited');
  }
  const { data: booking } = await createAdminClient()
    .from('bookings')
    .select('traveler_email')
    .eq('public_ref', ref)
    .maybeSingle();
  if (
    !booking ||
    !verifyBookingToken({
      secret: getBookingLinkSecret(),
      ref,
      email: booking.traveler_email,
      token,
    })
  ) {
    return fail('link');
  }
  await setBookingCookie(ref, token);
  return { ok: true, ref };
}
