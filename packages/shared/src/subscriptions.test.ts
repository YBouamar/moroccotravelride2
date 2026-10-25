import { describe, expect, it } from 'vitest';
import {
  bpsToRate,
  graceDaysLeft,
  hasWriteAccess,
  percentToBps,
  rateToBps,
  trialDaysLeft,
  type SubscriptionState,
} from './subscriptions';

const now = new Date('2026-10-26T10:00:00Z');
const inHours = (hours: number) => new Date(now.getTime() + hours * 3_600_000);

describe('hasWriteAccess', () => {
  const state = (status: SubscriptionState['status'], extra: Partial<SubscriptionState> = {}) => ({
    status,
    trialEndsAt: null,
    pastDueSince: null,
    ...extra,
  });

  it('grants writes to active subscriptions and running trials', () => {
    expect(hasWriteAccess(state('active'), now, 15)).toBe(true);
    expect(hasWriteAccess(state('trial', { trialEndsAt: inHours(1) }), now, 15)).toBe(true);
  });

  it('makes ended trials and cancelled subscriptions read-only (Q21)', () => {
    expect(hasWriteAccess(state('trial', { trialEndsAt: inHours(-1) }), now, 15)).toBe(false);
    expect(hasWriteAccess(state('cancelled'), now, 15)).toBe(false);
  });

  it('keeps writes for 15 days after a missed payment (Q22)', () => {
    expect(hasWriteAccess(state('past_due', { pastDueSince: inHours(-14 * 24) }), now, 15)).toBe(
      true,
    );
    expect(hasWriteAccess(state('past_due', { pastDueSince: inHours(-15 * 24) }), now, 15)).toBe(
      false,
    );
  });
});

describe('graceDaysLeft', () => {
  it('counts down the grace period', () => {
    expect(graceDaysLeft(now, 15, now)).toBe(15);
    expect(graceDaysLeft(inHours(-24 * 10 - 1), 15, now)).toBe(5);
    expect(graceDaysLeft(null, 15, now)).toBe(0);
  });
});

describe('trialDaysLeft', () => {
  it('rounds up partial days and never goes below zero', () => {
    expect(trialDaysLeft(inHours(14 * 24), now)).toBe(14);
    expect(trialDaysLeft(inHours(3), now)).toBe(1);
    expect(trialDaysLeft(inHours(-5), now)).toBe(0);
  });
});

describe('percentToBps', () => {
  it.each([
    ['20', 2000],
    ['12,5', 1250],
    ['12.75', 1275],
    ['0', 0],
    ['100', 10000],
    [' 15 ', 1500],
  ])('converts %s %% to %i bps', (input, bps) => {
    expect(percentToBps(input)).toBe(bps);
  });

  it.each(['', 'abc', '-5', '100.01', '120', '12.345', '1e2'])('rejects %s', (input) => {
    expect(percentToBps(input)).toBeNull();
  });
});

describe('rate conversions', () => {
  it('round-trips the database numeric(5,4) rate', () => {
    expect(rateToBps(0.2)).toBe(2000);
    expect(rateToBps(0.1275)).toBe(1275);
    expect(bpsToRate(1250)).toBe(0.125);
  });
});
