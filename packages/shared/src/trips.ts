import { z } from 'zod';
import { assertCents, type Cents } from './money';

/**
 * Trips and planning (step 9). The database is the authority (trigger private.check_trip);
 * these helpers mirror its rules for the forms and the planning views.
 */

export const TRIP_STATUSES = [
  'planned',
  'assigned',
  'in_progress',
  'completed',
  'cancelled',
] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

const TRANSITIONS: Record<TripStatus, readonly TripStatus[]> = {
  planned: ['assigned', 'cancelled'],
  assigned: ['planned', 'in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

/** BR-113: planned -> assigned -> in_progress -> completed, cancelled from any open state. */
export function canTransition(from: TripStatus, to: TripStatus): boolean {
  return from === to || TRANSITIONS[from].includes(to);
}

export const isOpenTrip = (status: TripStatus) => status !== 'completed' && status !== 'cancelled';

/** Half-open intervals [start, end): a trip ending at 10:00 does not overlap one starting at 10:00. */
export function rangesOverlap(
  a: { startsAt: Date; endsAt: Date },
  b: { startsAt: Date; endsAt: Date },
): boolean {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

/**
 * Parses an amount typed by a user in MAD ("800", "800,50", "1 250.5") into integer cents.
 * Returns null when empty, undefined when invalid. Never goes through a float.
 */
export function parseMoneyInput(text: string): Cents | null | undefined {
  // \s also matches the non-breaking spaces of French number formatting.
  const cleaned = text.replace(/\s/g, '');
  if (cleaned === '') return null;
  const match = /^(\d{1,9})(?:[.,](\d{1,2}))?$/.exec(cleaned);
  if (!match) return undefined;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  assertCents(cents);
  return cents;
}

/** Cents back to the input format ("800" or "800,50"), for edit forms. */
export function centsToInput(cents: Cents | null): string {
  if (cents === null) return '';
  const units = Math.floor(cents / 100);
  const rest = cents % 100;
  return rest === 0 ? String(units) : `${units},${String(rest).padStart(2, '0')}`;
}

const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, { error: 'dateTime' });
const optionalUuid = z.union([z.literal(''), z.uuid()]);

export const tripSchema = z
  .object({
    clientId: optionalUuid,
    passengerName: z
      .string()
      .trim()
      .min(2, { error: 'nameTooShort' })
      .max(120, { error: 'tooLong' }),
    passengerPhone: z.string().trim().max(32, { error: 'tooLong' }),
    passengers: z
      .number({ error: 'required' })
      .int({ error: 'required' })
      .min(1, { error: 'passengers' })
      .max(80, { error: 'passengers' }),
    luggage: z
      .number({ error: 'required' })
      .int({ error: 'required' })
      .min(0, { error: 'luggage' })
      .max(200, { error: 'luggage' }),
    pickupCityId: z.uuid({ error: 'required' }),
    pickupAddress: z.string().trim().min(2, { error: 'required' }).max(300, { error: 'tooLong' }),
    dropoffCityId: z.uuid({ error: 'required' }),
    dropoffAddress: z.string().trim().min(2, { error: 'required' }).max(300, { error: 'tooLong' }),
    /** Local Morocco time from a datetime-local input. */
    startsAt: localDateTime,
    endsAt: localDateTime,
    price: z.string().refine((value) => parseMoneyInput(value) !== undefined, { error: 'amount' }),
    vehicleId: optionalUuid,
    driverId: optionalUuid,
    notes: z.string().trim().max(1000, { error: 'tooLong' }),
    conflictOverride: z.boolean(),
    overrideReason: z.string().trim().max(300, { error: 'tooLong' }),
  })
  .refine((value) => value.endsAt > value.startsAt, { path: ['endsAt'], error: 'endBeforeStart' })
  .refine((value) => !value.conflictOverride || value.overrideReason.length >= 3, {
    path: ['overrideReason'],
    error: 'required',
  });

export type TripInput = z.input<typeof tripSchema>;

export const cancelTripSchema = z.object({
  reason: z.string().trim().min(3, { error: 'required' }).max(300, { error: 'tooLong' }),
});
