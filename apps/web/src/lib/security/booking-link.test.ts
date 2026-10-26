import { describe, expect, it } from 'vitest';
import { createBookingToken, verifyBookingToken } from './booking-link';

// Obviously fake key: the HMAC only needs a stable value in tests.
const secret = 'k'.repeat(48);
const base = { secret, ref: 'MTR-K7P2QX', email: 'Emma@Example.test' };
const token = createBookingToken({ ...base, expiresAt: new Date('2030-01-01T00:00:00Z') });

describe('booking magic link', () => {
  it('accepts the token of the booking, whatever the e-mail case', () => {
    expect(
      verifyBookingToken({
        ...base,
        email: 'emma@example.test',
        token,
        now: new Date('2029-12-31T00:00:00Z'),
      }),
    ).toBe(true);
  });

  it('rejects another booking, another e-mail, another secret or a tampered token', () => {
    const now = new Date('2029-12-31T00:00:00Z');
    expect(verifyBookingToken({ ...base, ref: 'MTR-AAAAAA', token, now })).toBe(false);
    expect(verifyBookingToken({ ...base, email: 'other@example.test', token, now })).toBe(false);
    expect(verifyBookingToken({ ...base, secret: `${secret}x`, token, now })).toBe(false);
    expect(verifyBookingToken({ ...base, token: `${token}x`, now })).toBe(false);
    expect(verifyBookingToken({ ...base, token: 'garbage', now })).toBe(false);
  });

  it('rejects an expired token', () => {
    expect(verifyBookingToken({ ...base, token, now: new Date('2030-01-02T00:00:00Z') })).toBe(
      false,
    );
  });
});
