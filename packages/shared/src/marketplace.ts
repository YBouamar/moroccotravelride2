import { z } from 'zod';
import { parseMoneyInput } from './trips';
import { casablancaDate, casablancaLocalToUtc, isIsoDay } from './validity';

/**
 * Marketplace search and grids (steps 12-13). The database (public.search_offers and the booking
 * function) is the authority; these helpers validate inputs and explain the result to the user.
 */

const HOUR_MS = 60 * 60 * 1000;

/** BR-006: a pickup must be at least `leadHours` after now. */
export function isBookableAt(pickupAt: Date, now: Date, leadHours: number): boolean {
  return pickupAt.getTime() - now.getTime() >= leadHours * HOUR_MS;
}

/** Earliest bookable Morocco day for the date picker (the server still checks the hour). */
export function earliestBookableDay(now: Date, leadHours: number): string {
  return casablancaDate(new Date(now.getTime() + leadHours * HOUR_MS));
}

export interface CompanyEligibility {
  status: 'pending' | 'verified' | 'suspended';
  marketplaceEnabled: boolean;
  suspended: boolean;
  licenseExpiresOn: string | null;
  activeGrids: number;
}

export const ELIGIBILITY_CHECKS = [
  'verified',
  'license',
  'notSuspended',
  'grid',
  'enabled',
] as const;
export type EligibilityCheck = (typeof ELIGIBILITY_CHECKS)[number];

/** BR-016 checklist shown to the carrier: each failed check explains why it is not visible. */
export function marketplaceChecklist(
  company: CompanyEligibility,
  today: string,
): Record<EligibilityCheck, boolean> {
  return {
    verified: company.status === 'verified',
    license: !!company.licenseExpiresOn && company.licenseExpiresOn >= today,
    notSuspended: !company.suspended,
    grid: company.activeGrids > 0,
    enabled: company.marketplaceEnabled,
  };
}

export const isMarketplaceVisible = (checks: Record<EligibilityCheck, boolean>) =>
  ELIGIBILITY_CHECKS.every((check) => checks[check]);

// Same departure and arrival city is a valid intra-city transfer (BR-007).
export const searchSchema = z.object({
  from: z.uuid({ error: 'required' }),
  to: z.uuid({ error: 'required' }),
  date: z.string().refine(isIsoDay, { error: 'date' }),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'time' }),
  passengers: z.coerce
    .number({ error: 'required' })
    .int()
    .min(1, { error: 'passengers' })
    .max(80, { error: 'passengers' }),
});

export type SearchInput = z.output<typeof searchSchema>;

/** Pickup instant of a search (Morocco wall-clock time to UTC). */
export const searchPickupAt = (search: { date: string; time: string }) =>
  casablancaLocalToUtc(`${search.date}T${search.time}`);

export const priceGridSchema = z.object({
  fromCityId: z.uuid({ error: 'required' }),
  toCityId: z.uuid({ error: 'required' }),
  vehicleTypeCode: z.string().min(1, { error: 'required' }),
  price: z.string().refine(
    (value) => {
      const cents = parseMoneyInput(value);
      return typeof cents === 'number' && cents >= 1000 && cents <= 10_000_000;
    },
    { error: 'gridPrice' },
  ),
  /** Also create the opposite direction with the same price. */
  withReturn: z.boolean(),
});
export type PriceGridInput = z.input<typeof priceGridSchema>;
