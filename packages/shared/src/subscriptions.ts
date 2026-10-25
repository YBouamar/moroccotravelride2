import { BPS_PER_UNIT, type BasisPoints } from './money';

/** SaaS offers (BR-101 to BR-103). Each offer includes the previous one. */
export const PLAN_CODES = ['standard', 'v2', 'v3'] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export const SUBSCRIPTION_STATUSES = ['trial', 'active', 'past_due', 'cancelled'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Feature keys stored in plan_features (migration 20261026100000). */
export const FEATURES = [
  'trips',
  'vehicles',
  'drivers',
  'clients',
  'invoicing',
  'payments',
  'expenses',
  'driver_app',
  'expense_receipts',
  'live_tracking',
  'fleet_maintenance',
  'vehicle_deadlines',
  'fuel_tracking',
] as const;
export type Feature = (typeof FEATURES)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Same rule as private.has_feature(): a trial only counts until its end date. */
export function isSubscriptionUsable(
  subscription: { status: SubscriptionStatus; trialEndsAt: Date | null },
  now: Date,
): boolean {
  if (subscription.status === 'active' || subscription.status === 'past_due') return true;
  return (
    subscription.status === 'trial' && !!subscription.trialEndsAt && subscription.trialEndsAt > now
  );
}

/** Whole days left in a trial, rounded up (a trial ending in 3 h shows "1 day"). */
export function trialDaysLeft(trialEndsAt: Date, now: Date): number {
  return Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / DAY_MS));
}

/**
 * Admin input "12,5" or "12.5" (percent) to basis points. Returns null when invalid:
 * not a number, negative, above 100 % or more than 2 decimals.
 */
export function percentToBps(input: string): BasisPoints | null {
  const normalized = input.trim().replace(',', '.');
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(normalized)) return null;
  const [units = '0', decimals = ''] = normalized.split('.');
  const bps = Number(units) * 100 + Number(decimals.padEnd(2, '0'));
  return bps <= BPS_PER_UNIT ? bps : null;
}

/** numeric(5,4) rate as stored in companies.commission_rate (0.2000) to basis points. */
export function rateToBps(rate: number): BasisPoints {
  return Math.round(rate * BPS_PER_UNIT);
}

/** Basis points to the numeric(5,4) rate written to the database. */
export function bpsToRate(bps: BasisPoints): number {
  return bps / BPS_PER_UNIT;
}
