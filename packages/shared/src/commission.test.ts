import { describe, expect, it } from 'vitest';
import { computeCommission } from './commission';
import { applyRate } from './money';

describe('computeCommission', () => {
  it('splits the reference booking: 800 MAD at 20 % gives 160 / 640 MAD', () => {
    expect(computeCommission(80_000, 2_000)).toEqual({
      totalCents: 80_000,
      rateBps: 2_000,
      commissionCents: 16_000,
      carrierCents: 64_000,
    });
  });

  it('handles 0 % and 100 % rates', () => {
    expect(computeCommission(12_345, 0)).toMatchObject({
      commissionCents: 0,
      carrierCents: 12_345,
    });
    expect(computeCommission(12_345, 10_000)).toMatchObject({
      commissionCents: 12_345,
      carrierCents: 0,
    });
  });

  it('always sums exactly to the total', () => {
    for (const total of [0, 1, 99, 101, 33_333, 80_050, 1_234_567]) {
      for (const rate of [1, 1_250, 1_999, 2_000, 2_501, 3_333]) {
        const { commissionCents, carrierCents } = computeCommission(total, rate);
        expect(commissionCents + carrierCents).toBe(total);
        expect(Number.isInteger(commissionCents)).toBe(true);
      }
    }
  });

  it('rejects non-integer, negative or unsafe amounts', () => {
    expect(() => computeCommission(800.5, 2_000)).toThrow(RangeError);
    expect(() => computeCommission(-1, 2_000)).toThrow(RangeError);
    expect(() => computeCommission(Number.MAX_SAFE_INTEGER + 1, 2_000)).toThrow(RangeError);
  });

  it('rejects rates outside 0..10000 bps', () => {
    expect(() => computeCommission(80_000, -1)).toThrow(RangeError);
    expect(() => computeCommission(80_000, 10_001)).toThrow(RangeError);
    expect(() => computeCommission(80_000, 20.5)).toThrow(RangeError);
  });
});

describe('applyRate', () => {
  it('rounds half up to the nearest cent', () => {
    expect(applyRate(5, 1_000)).toBe(1); // 0.5 cent -> 1
    expect(applyRate(4, 1_000)).toBe(0); // 0.4 cent -> 0
    expect(applyRate(15, 1_000)).toBe(2); // 1.5 cents -> 2
  });

  it('stays exact for very large amounts', () => {
    expect(applyRate(Number.MAX_SAFE_INTEGER, 10_000)).toBe(Number.MAX_SAFE_INTEGER);
  });
});
