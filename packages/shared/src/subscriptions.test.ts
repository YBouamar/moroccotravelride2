import { describe, expect, it } from 'vitest';
import {
  bpsToRate,
  isSubscriptionUsable,
  percentToBps,
  rateToBps,
  trialDaysLeft,
} from './subscriptions';

const now = new Date('2026-10-26T10:00:00Z');
const inHours = (hours: number) => new Date(now.getTime() + hours * 3_600_000);

describe('isSubscriptionUsable', () => {
  it('accepts active and past_due subscriptions', () => {
    expect(isSubscriptionUsable({ status: 'active', trialEndsAt: null }, now)).toBe(true);
    expect(isSubscriptionUsable({ status: 'past_due', trialEndsAt: null }, now)).toBe(true);
  });

  it('accepts a trial only before its end', () => {
    expect(isSubscriptionUsable({ status: 'trial', trialEndsAt: inHours(1) }, now)).toBe(true);
    expect(isSubscriptionUsable({ status: 'trial', trialEndsAt: inHours(-1) }, now)).toBe(false);
  });

  it('refuses cancelled subscriptions', () => {
    expect(isSubscriptionUsable({ status: 'cancelled', trialEndsAt: null }, now)).toBe(false);
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
