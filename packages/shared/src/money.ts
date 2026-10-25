/**
 * Amounts are always integer cents (MAD), never floats (ADR-006).
 * Rates are integer basis points: 1 bps = 0.01 %, so 20 % = 2000 bps.
 * The database stores rates as numeric(5,4) (0.2000), which maps exactly to bps * 10_000.
 */
export type Cents = number;
export type BasisPoints = number;

export const BPS_PER_UNIT = 10_000;

export function assertCents(value: number, name = 'amount'): asserts value is Cents {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer number of cents, got ${value}`);
  }
}

export function assertBasisPoints(value: number, name = 'rate'): asserts value is BasisPoints {
  if (!Number.isInteger(value) || value < 0 || value > BPS_PER_UNIT) {
    throw new RangeError(
      `${name} must be an integer between 0 and ${BPS_PER_UNIT} bps, got ${value}`,
    );
  }
}

/** Applies a rate to an amount with half-up rounding to the nearest cent (ADR-006). */
export function applyRate(amount: Cents, rate: BasisPoints): Cents {
  assertCents(amount);
  assertBasisPoints(rate);
  // bigint keeps the intermediate product exact for any safe-integer amount
  const scaled = BigInt(amount) * BigInt(rate) + BigInt(BPS_PER_UNIT / 2);
  return Number(scaled / BigInt(BPS_PER_UNIT));
}
