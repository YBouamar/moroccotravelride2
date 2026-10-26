import { describe, expect, it } from 'vitest';
import {
  bookingSchema,
  canBookingTransition,
  canTravelerCancel,
  computeTravelerCancellation,
  minutesToAccept,
  PUBLIC_REF_PATTERN,
} from './bookings';
import { computeCommission } from './commission';

const policy = {
  tiers: [
    { min_hours_before: 48, refund_bps: 10_000 },
    { min_hours_before: 24, refund_bps: 5000 },
    { min_hours_before: 0, refund_bps: 0 },
  ],
};
const pickupAt = new Date('2026-11-10T10:00:00Z');
const hoursBefore = (hours: number) => new Date(pickupAt.getTime() - hours * 3_600_000);

describe('Phase 3 acceptance criterion', () => {
  it('splits an 800 MAD booking into 160 MAD commission and 640 MAD for the carrier', () => {
    expect(computeCommission(80_000, 2000)).toMatchObject({
      commissionCents: 16_000,
      carrierCents: 64_000,
    });
  });
});

describe('traveler cancellation (BR-011)', () => {
  const base = { policy, pickupAt, totalCents: 80_000, commissionRateBps: 2000, paid: true };

  it('refunds 100 % more than 48 h before', () => {
    expect(computeTravelerCancellation({ ...base, now: hoursBefore(72) })).toEqual({
      refundBps: 10_000,
      refundCents: 80_000,
      retainedCents: 0,
      commissionCents: 0,
      carrierCents: 0,
    });
  });

  it('refunds 50 % between 48 h and 24 h and shares the rest at the frozen rate', () => {
    expect(computeTravelerCancellation({ ...base, now: hoursBefore(30) })).toEqual({
      refundBps: 5000,
      refundCents: 40_000,
      retainedCents: 40_000,
      commissionCents: 8000,
      carrierCents: 32_000,
    });
  });

  it('refunds nothing less than 24 h before', () => {
    expect(computeTravelerCancellation({ ...base, now: hoursBefore(2) }).retainedCents).toBe(
      80_000,
    );
  });

  it('retains nothing when nothing was paid', () => {
    expect(
      computeTravelerCancellation({ ...base, paid: false, now: hoursBefore(2) }),
    ).toMatchObject({
      refundCents: 0,
      retainedCents: 0,
      commissionCents: 0,
    });
  });
});

describe('booking states', () => {
  it('follows the documented machine', () => {
    expect(canBookingTransition('pending_carrier', 'confirmed')).toBe(true);
    expect(canBookingTransition('pending_carrier', 'completed')).toBe(false);
    expect(canBookingTransition('cancelled_by_traveler', 'confirmed')).toBe(false);
    expect(canTravelerCancel('assigned')).toBe(true);
    expect(canTravelerCancel('completed')).toBe(false);
  });

  it('counts the minutes left to accept and validates references', () => {
    expect(
      minutesToAccept(new Date('2026-10-26T12:00:00Z'), new Date('2026-10-26T10:30:30Z')),
    ).toBe(89);
    expect(
      minutesToAccept(new Date('2026-10-26T10:00:00Z'), new Date('2026-10-26T11:00:00Z')),
    ).toBe(0);
    expect(PUBLIC_REF_PATTERN.test('MTR-K7P2QX')).toBe(true);
    expect(PUBLIC_REF_PATTERN.test('MTR-K7P2Q0')).toBe(false);
  });
});

describe('bookingSchema', () => {
  const input = {
    travelerName: 'Emma Martin',
    travelerEmail: 'emma@example.test',
    travelerPhone: '+33 6 00 00 00 01',
    luggage: 2,
    pickupAddress: 'Terminal 1',
    dropoffAddress: 'Hôtel Hyatt',
    flightNumber: 'AT 201',
    notes: '',
    paymentMethod: 'cash_to_driver' as const,
    acceptTerms: true as const,
  };
  it('requires the terms and an offline payment method', () => {
    expect(bookingSchema.safeParse(input).success).toBe(true);
    expect(bookingSchema.safeParse({ ...input, acceptTerms: false }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...input, paymentMethod: 'online_card' }).success).toBe(false);
  });
});
