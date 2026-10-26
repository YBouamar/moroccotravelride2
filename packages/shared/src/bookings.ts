import { z } from 'zod';
import { computeCommission } from './commission';
import { applyRate, type BasisPoints, type Cents } from './money';
import { OFFLINE_PAYMENT_METHODS } from './payment-methods';
import type { PlatformSettings } from './platform-settings';

/**
 * Marketplace bookings (steps 14 to 17). Mirrors the database functions (create_booking,
 * respond_booking, cancellation), which remain the authority. Booking and payment statuses are
 * independent: payments are offline (ADR-016).
 */

export const BOOKING_STATUSES = [
  'pending_carrier',
  'confirmed',
  'assigned',
  'completed',
  'cancelled_by_traveler',
  'cancelled_by_carrier',
  'disputed',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_PAYMENT_STATUSES = [
  'unpaid',
  'paid',
  'partially_refunded',
  'refunded',
] as const;
export type BookingPaymentStatus = (typeof BOOKING_PAYMENT_STATUSES)[number];

const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  pending_carrier: ['confirmed', 'cancelled_by_carrier', 'cancelled_by_traveler'],
  confirmed: ['assigned', 'cancelled_by_traveler', 'cancelled_by_carrier'],
  assigned: ['confirmed', 'completed', 'cancelled_by_traveler', 'cancelled_by_carrier', 'disputed'],
  completed: ['disputed'],
  cancelled_by_traveler: [],
  cancelled_by_carrier: [],
  disputed: [],
};

export function canBookingTransition(from: BookingStatus, to: BookingStatus): boolean {
  return from === to || TRANSITIONS[from].includes(to);
}

/** The traveler may cancel until the trip has started (BR-011 decides the refund). */
export const canTravelerCancel = (status: BookingStatus) =>
  status === 'pending_carrier' || status === 'confirmed' || status === 'assigned';

export type CancellationPolicy = PlatformSettings['cancellation_policy'];

export interface TravelerCancellation {
  /** Refund rate of the tier reached (BR-011), whatever the payment status. */
  refundBps: BasisPoints;
  /** Amount to give back: only when the traveler had paid (offline payment, ADR-016). */
  refundCents: Cents;
  /** Amount kept, shared between the platform and the carrier at the booking's rate. */
  retainedCents: Cents;
  commissionCents: Cents;
  carrierCents: Cents;
}

/**
 * BR-011: refund by tier of hours before pickup; the retained amount is split at the frozen
 * commission rate. Nothing is retained when nothing was paid (cash to the driver, unpaid
 * transfer): the booking is simply cancelled.
 */
export function computeTravelerCancellation(input: {
  policy: CancellationPolicy;
  pickupAt: Date;
  now: Date;
  totalCents: Cents;
  commissionRateBps: BasisPoints;
  paid: boolean;
}): TravelerCancellation {
  const hoursBefore = (input.pickupAt.getTime() - input.now.getTime()) / 3_600_000;
  const tier =
    input.policy.tiers.find((candidate) => hoursBefore >= candidate.min_hours_before) ??
    input.policy.tiers.at(-1)!;
  if (!input.paid) {
    return {
      refundBps: tier.refund_bps,
      refundCents: 0,
      retainedCents: 0,
      commissionCents: 0,
      carrierCents: 0,
    };
  }
  const refundCents = applyRate(input.totalCents, tier.refund_bps);
  const retainedCents = input.totalCents - refundCents;
  const split = computeCommission(retainedCents, input.commissionRateBps);
  return {
    refundBps: tier.refund_bps,
    refundCents,
    retainedCents,
    commissionCents: split.commissionCents,
    carrierCents: split.carrierCents,
  };
}

/** Minutes left to accept before the deadline (BR-010), never negative. */
export const minutesToAccept = (deadline: Date, now: Date) =>
  Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 60_000));

/** Public reference format (BR-013): MTR- followed by 6 unambiguous characters. */
export const PUBLIC_REF_PATTERN = /^MTR-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

export const bookingSchema = z.object({
  travelerName: z.string().trim().min(2, { error: 'nameTooShort' }).max(120, { error: 'tooLong' }),
  travelerEmail: z.email({ error: 'email' }),
  travelerPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ]{8,20}$/, { error: 'phone' }),
  luggage: z
    .number({ error: 'required' })
    .int({ error: 'required' })
    .min(0, { error: 'luggage' })
    .max(200, { error: 'luggage' }),
  pickupAddress: z.string().trim().min(2, { error: 'required' }).max(300, { error: 'tooLong' }),
  dropoffAddress: z.string().trim().min(2, { error: 'required' }).max(300, { error: 'tooLong' }),
  flightNumber: z
    .string()
    .trim()
    .max(12, { error: 'tooLong' })
    .regex(/^[A-Za-z0-9 ]*$/, { error: 'flight' }),
  notes: z.string().trim().max(500, { error: 'tooLong' }),
  paymentMethod: z.enum(OFFLINE_PAYMENT_METHODS),
  acceptTerms: z.literal(true, { error: 'acceptTerms' }),
});
export type BookingInput = z.input<typeof bookingSchema>;
