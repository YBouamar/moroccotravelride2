import { describe, expect, it } from 'vitest';
import { isQuoteDateValid, quoteRequestSchema, type QuoteRequestInput } from './quotes';

const valid: QuoteRequestInput = {
  kind: 'tour',
  name: 'Emma Martin',
  email: 'emma@example.com',
  phone: '+33 6 00 00 00 01',
  fromCity: '6f1c0b52-5d1a-4c2e-9a7e-1b2c3d4e5f60',
  startDate: '2026-12-10',
  days: 3,
  passengers: 4,
  message: 'Marrakech, Merzouga, retour par Ouarzazate.',
  acceptTerms: true,
};

const errorOf = (input: Partial<QuoteRequestInput>) =>
  quoteRequestSchema.safeParse({ ...valid, ...input }).error?.issues[0]?.message;

describe('quoteRequestSchema', () => {
  it('accepts a complete request', () => {
    expect(quoteRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an unknown kind', () => {
    expect(quoteRequestSchema.safeParse({ ...valid, kind: 'transfer' }).success).toBe(false);
  });

  it('limits the duration to 1 to 30 days', () => {
    expect(errorOf({ days: 0 })).toBe('days');
    expect(errorOf({ days: 31 })).toBe('days');
    expect(errorOf({ days: 1.5 })).toBe('days');
  });

  it('validates contact details and the date', () => {
    expect(errorOf({ email: 'emma' })).toBe('email');
    expect(errorOf({ phone: 'abc' })).toBe('phone');
    expect(errorOf({ startDate: '2026-02-30x' })).toBe('date');
    expect(errorOf({ message: 'x'.repeat(2001) })).toBe('tooLong');
  });

  it('requires the terms to be accepted', () => {
    expect(errorOf({ acceptTerms: false as true })).toBe('acceptTerms');
  });
});

describe('isQuoteDateValid', () => {
  it('only accepts a start after today', () => {
    expect(isQuoteDateValid('2026-10-28', '2026-10-27')).toBe(true);
    expect(isQuoteDateValid('2026-10-27', '2026-10-27')).toBe(false);
  });
});
