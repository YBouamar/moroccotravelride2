import { describe, expect, it } from 'vitest';
import { formatMoney } from './money';

// Intl inserts (narrow) no-break spaces: compare with normal spaces.
const NO_BREAK_SPACES = new RegExp('[\\u00a0\\u202f]', 'g');
const plain = (value: string) => value.replace(NO_BREAK_SPACES, ' ');

describe('formatMoney', () => {
  it('formats whole dirhams without decimals', () => {
    expect(plain(formatMoney(15_000, 'fr'))).toBe('150 MAD');
    expect(plain(formatMoney(40_000, 'en'))).toMatch(/400/);
  });

  it('keeps centimes when present', () => {
    expect(plain(formatMoney(80_050, 'fr'))).toBe('800,50 MAD');
  });

  it('uses Latin digits in Arabic', () => {
    expect(formatMoney(15_000, 'ar')).toMatch(/150/);
  });

  it('rejects non-integer amounts', () => {
    expect(() => formatMoney(10.5, 'fr')).toThrow(RangeError);
  });
});
