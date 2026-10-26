import { z } from 'zod';
import { parseMoneyInput } from './trips';
import { daysBetween } from './validity';

/** V3 fleet management (Phase 5): maintenance, deadlines, fuel consumption. */

export const MAINTENANCE_KINDS = ['service', 'repair', 'tires', 'inspection', 'other'] as const;
export const DEADLINE_KINDS = [
  'insurance',
  'technical_inspection',
  'vignette',
  'transport_authorization',
  'other',
] as const;
export const REMINDER_DAYS = [30, 7, 1] as const;

/** Total cost of a maintenance: labour plus parts (integer cents). */
export function maintenanceTotal(
  labourCents: number,
  parts: { quantity: number; unitCostCents: number }[],
) {
  return parts.reduce((sum, part) => sum + part.quantity * part.unitCostCents, labourCents);
}

export type DeadlineState = 'overdue' | 'due_soon' | 'ok' | 'done';

/** Same thresholds as the reminders (D-30): overdue after the due day. */
export function deadlineState(dueOn: string, today: string, done: boolean): DeadlineState {
  if (done) return 'done';
  const days = daysBetween(today, dueOn);
  if (days < 0) return 'overdue';
  return days <= REMINDER_DAYS[0] ? 'due_soon' : 'ok';
}

/** Litres typed by a user ("45,3") to centilitres, undefined when invalid. */
export function litresToCentilitres(text: string): number | undefined {
  const match = /^(\d{1,4})(?:[.,](\d{1,2}))?$/.exec(text.trim());
  if (!match) return undefined;
  const value = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return value >= 100 ? value : undefined;
}

export interface FuelFill {
  odometerKm: number;
  volumeCl: number;
  fullTank: boolean;
}

/**
 * Average consumption in centilitres per 100 km between the first and the last full tank:
 * fuel added after the first full tank divided by the distance driven. Null when not enough
 * full fills. Integer arithmetic, rounded to the nearest centilitre.
 */
export function consumptionPer100Km(fills: FuelFill[]): number | null {
  const sorted = [...fills].sort((a, b) => a.odometerKm - b.odometerKm);
  const firstFull = sorted.findIndex((fill) => fill.fullTank);
  let lastFull = -1;
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    if (sorted[index]!.fullTank) {
      lastFull = index;
      break;
    }
  }
  if (firstFull < 0 || lastFull <= firstFull) return null;
  const distance = sorted[lastFull]!.odometerKm - sorted[firstFull]!.odometerKm;
  if (distance <= 0) return null;
  const volume = sorted
    .slice(firstFull + 1, lastFull + 1)
    .reduce((sum, fill) => sum + fill.volumeCl, 0);
  return Math.round((volume * 100) / distance);
}

const amount = z
  .string()
  .refine((value) => typeof parseMoneyInput(value) === 'number', { error: 'amount' });

export const deadlineSchema = z.object({
  vehicleId: z.uuid({ error: 'required' }),
  kind: z.enum(DEADLINE_KINDS),
  label: z.string().trim().max(120, { error: 'tooLong' }),
  dueOn: z.iso.date({ error: 'date' }),
});

export const maintenanceSchema = z.object({
  vehicleId: z.uuid({ error: 'required' }),
  kind: z.enum(MAINTENANCE_KINDS),
  performedOn: z.iso.date({ error: 'date' }),
  odometerKm: z.union([z.literal(''), z.string().regex(/^\d{1,7}$/, { error: 'odometer' })]),
  garage: z.string().trim().max(120, { error: 'tooLong' }),
  notes: z.string().trim().max(500, { error: 'tooLong' }),
  labour: amount,
  partName: z.string().trim().max(120, { error: 'tooLong' }),
  partQuantity: z.union([z.literal(''), z.string().regex(/^\d{1,4}$/)]),
  partCost: z.union([z.literal(''), amount]),
});

export const fuelSchema = z.object({
  vehicleId: z.uuid({ error: 'required' }),
  filledOn: z.iso.date({ error: 'date' }),
  odometerKm: z.string().regex(/^\d{1,7}$/, { error: 'odometer' }),
  volume: z
    .string()
    .refine((value) => litresToCentilitres(value) !== undefined, { error: 'volume' }),
  amount,
  fullTank: z.boolean(),
});
