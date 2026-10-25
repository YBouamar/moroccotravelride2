import { applyRate, type BasisPoints, type Cents } from './money';

export interface CommissionSplit {
  totalCents: Cents;
  rateBps: BasisPoints;
  commissionCents: Cents;
  carrierCents: Cents;
}

/**
 * Splits a booking price between the platform commission and the carrier share (BR-004, BR-005).
 * The commission is taken from the displayed price, never added to it, and the carrier share is
 * always `total - commission` so the two parts sum exactly to the total.
 * The rate comes from platform settings or the carrier override and is frozen on the booking.
 */
export function computeCommission(totalCents: Cents, rateBps: BasisPoints): CommissionSplit {
  const commissionCents = applyRate(totalCents, rateBps);
  return {
    totalCents,
    rateBps,
    commissionCents,
    carrierCents: totalCents - commissionCents,
  };
}
