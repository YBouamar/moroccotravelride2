import { describe, expect, it } from 'vitest';
import { parsePlatformSettings } from './platform-settings';

// Same values as the seed migration.
const rows = [
  { key: 'default_commission_bps', value: 2000 },
  { key: 'min_booking_lead_hours', value: 24 },
  { key: 'carrier_accept_hours', value: 2 },
  {
    key: 'cancellation_policy',
    value: {
      tiers: [
        { min_hours_before: 48, refund_bps: 10000 },
        { min_hours_before: 24, refund_bps: 5000 },
        { min_hours_before: 0, refund_bps: 0 },
      ],
    },
  },
  { key: 'statement_suspension_days', value: 15 },
  { key: 'location_retention_days', value: 90 },
  { key: 'saas_trial', value: { days: 14, plan: 'v2' } },
  { key: 'marketplace_open', value: true },
];

describe('parsePlatformSettings', () => {
  it('accepts the seeded settings', () => {
    const settings = parsePlatformSettings(rows);
    expect(settings.default_commission_bps).toBe(2000);
    expect(settings.saas_trial).toEqual({ days: 14, plan: 'v2' });
  });

  it('rejects a missing key', () => {
    expect(() =>
      parsePlatformSettings(rows.filter((r) => r.key !== 'carrier_accept_hours')),
    ).toThrow();
  });

  it('rejects a commission above 100 %', () => {
    const bad = rows.map((r) => (r.key === 'default_commission_bps' ? { ...r, value: 10001 } : r));
    expect(() => parsePlatformSettings(bad)).toThrow();
  });

  it('rejects cancellation tiers that do not end at 0 hours', () => {
    const bad = rows.map((r) =>
      r.key === 'cancellation_policy'
        ? { ...r, value: { tiers: [{ min_hours_before: 48, refund_bps: 10000 }] } }
        : r,
    );
    expect(() => parsePlatformSettings(bad)).toThrow();
  });
});
