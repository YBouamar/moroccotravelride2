import { describe, expect, it } from 'vitest';
import {
  earliestBookableDay,
  isBookableAt,
  isMarketplaceVisible,
  marketplaceChecklist,
  priceGridSchema,
  searchPickupAt,
  searchSchema,
} from './marketplace';

describe('booking lead time (BR-006)', () => {
  const now = new Date('2026-10-26T10:00:00Z');
  it('requires 24 hours by default', () => {
    expect(isBookableAt(new Date('2026-10-27T10:00:00Z'), now, 24)).toBe(true);
    expect(isBookableAt(new Date('2026-10-27T09:59:00Z'), now, 24)).toBe(false);
    expect(earliestBookableDay(now, 24)).toBe('2026-10-27');
  });

  it('converts the searched Morocco time to UTC', () => {
    expect(searchPickupAt({ date: '2026-07-15', time: '09:30' }).toISOString()).toBe(
      '2026-07-15T08:30:00.000Z',
    );
  });
});

describe('marketplace checklist (BR-016)', () => {
  const company = {
    status: 'verified' as const,
    marketplaceEnabled: true,
    suspended: false,
    licenseExpiresOn: '2027-12-31',
    activeGrids: 2,
  };
  it('is visible only when every check passes', () => {
    expect(isMarketplaceVisible(marketplaceChecklist(company, '2026-10-26'))).toBe(true);
    const expired = marketplaceChecklist(
      { ...company, licenseExpiresOn: '2026-10-25' },
      '2026-10-26',
    );
    expect(expired.license).toBe(false);
    expect(isMarketplaceVisible(expired)).toBe(false);
    expect(marketplaceChecklist({ ...company, activeGrids: 0 }, '2026-10-26').grid).toBe(false);
    expect(marketplaceChecklist({ ...company, suspended: true }, '2026-10-26').notSuspended).toBe(
      false,
    );
  });
});

describe('inputs', () => {
  it('validates searches, including intra-city transfers', () => {
    const id = '00000000-0000-4000-8000-000000000001';
    expect(
      searchSchema.safeParse({
        from: id,
        to: id,
        date: '2026-11-02',
        time: '09:00',
        passengers: '2',
      }).success,
    ).toBe(true);
    expect(
      searchSchema.safeParse({
        from: id,
        to: id,
        date: '2026-11-02',
        time: '25:00',
        passengers: '2',
      }).success,
    ).toBe(false);
    expect(
      searchSchema.safeParse({
        from: id,
        to: id,
        date: '2026-11-02',
        time: '09:00',
        passengers: '0',
      }).success,
    ).toBe(false);
  });

  it('bounds grid prices between 10 and 100 000 MAD', () => {
    const grid = {
      fromCityId: '00000000-0000-4000-8000-000000000001',
      toCityId: '00000000-0000-4000-8000-000000000002',
      vehicleTypeCode: 'van',
      price: '800',
      withReturn: true,
    };
    expect(priceGridSchema.safeParse(grid).success).toBe(true);
    expect(priceGridSchema.safeParse({ ...grid, price: '5' }).success).toBe(false);
  });
});
