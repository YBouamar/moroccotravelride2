'use server';

import { can } from '@mtr/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { notifyBooking } from '@/features/booking/notify';
import { getCompanyContext } from '@/features/companies/context';
import { fail, type FormResult } from '@/lib/action-result';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * Carrier responses to marketplace bookings (step 15). The database functions check the role,
 * the deadline and the state; the traveler is told by e-mail.
 */

const BOOKING_CODES: Record<string, FormResult> = {
  MT022: fail('invalidTransition'),
  MT023: fail('locked'),
  MT025: fail('paymentRefused'),
  '42501': fail('forbidden'),
};

async function context(permission: 'bookings.respond' | 'invoices.manage', bookingId: string) {
  if (!z.uuid().safeParse(bookingId).success) return null;
  const company = await getCompanyContext();
  return company && can(company.membership.role, permission) ? company : null;
}

/** Booking as needed by the e-mails (read after the change, server side). */
async function bookingForEmail(bookingId: string) {
  const { data } = await createAdminClient()
    .from('bookings')
    .select(
      'id, company_id, public_ref, traveler_name, traveler_email, pickup_at, locale, total_cents',
    )
    .eq('id', bookingId)
    .single();
  return data;
}

export async function respondBookingAction(
  bookingId: string,
  accept: boolean,
  options: { durationMinutes?: number; reason?: string } = {},
): Promise<FormResult> {
  if (!(await context('bookings.respond', bookingId))) return fail('forbidden');
  const duration = z.number().int().min(15).max(4320).catch(120).parse(options.durationMinutes);
  const reason = z
    .string()
    .trim()
    .max(300)
    .catch('')
    .parse(options.reason ?? '');
  if (!accept && reason.length < 3) return fail('invalid');

  const supabase = await createClient();
  const { error } = await supabase.rpc('respond_booking', {
    p_booking: bookingId,
    p_accept: accept === true,
    p_duration_minutes: duration,
    p_reason: reason || undefined,
  });
  if (error) return BOOKING_CODES[error.code] ?? fail('unknown');

  const booking = await bookingForEmail(bookingId);
  if (booking) {
    await notifyBooking(
      booking,
      { traveler: accept ? 'booking_confirmed' : 'booking_refused' },
      accept ? {} : { reason },
    );
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function confirmBookingPaymentAction(bookingId: string): Promise<FormResult> {
  if (!(await context('invoices.manage', bookingId))) return fail('forbidden');
  const supabase = await createClient();
  const { error } = await supabase.rpc('confirm_booking_payment', { p_booking: bookingId });
  if (error) return BOOKING_CODES[error.code] ?? fail('unknown');
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function confirmBookingRefundAction(bookingId: string): Promise<FormResult> {
  if (!(await context('invoices.manage', bookingId))) return fail('forbidden');
  const supabase = await createClient();
  const { error } = await supabase.rpc('confirm_booking_refund', { p_booking: bookingId });
  if (error) return BOOKING_CODES[error.code] ?? fail('unknown');
  revalidatePath('/', 'layout');
  return { ok: true };
}
