import { describe, expect, it } from 'vitest';
import {
  canTransition,
  centsToInput,
  parseMoneyInput,
  rangesOverlap,
  tripSchema,
  type TripInput,
} from './trips';
import {
  addDays,
  casablancaLocalToUtc,
  casablancaStartOfDay,
  isIsoDay,
  startOfWeek,
  toCasablancaLocalInput,
} from './validity';

describe('trip status machine (BR-113)', () => {
  it('follows planned, assigned, in progress, completed', () => {
    expect(canTransition('planned', 'assigned')).toBe(true);
    expect(canTransition('assigned', 'in_progress')).toBe(true);
    expect(canTransition('in_progress', 'completed')).toBe(true);
    expect(canTransition('assigned', 'completed')).toBe(false);
    expect(canTransition('planned', 'in_progress')).toBe(false);
  });

  it('cancels any open trip and locks finished ones', () => {
    expect(canTransition('in_progress', 'cancelled')).toBe(true);
    expect(canTransition('completed', 'cancelled')).toBe(false);
    expect(canTransition('cancelled', 'planned')).toBe(false);
  });
});

describe('rangesOverlap', () => {
  const at = (hour: number) => new Date(Date.UTC(2030, 4, 10, hour));
  it('treats slots as half-open intervals', () => {
    expect(
      rangesOverlap({ startsAt: at(8), endsAt: at(10) }, { startsAt: at(9), endsAt: at(11) }),
    ).toBe(true);
    expect(
      rangesOverlap({ startsAt: at(8), endsAt: at(10) }, { startsAt: at(10), endsAt: at(11) }),
    ).toBe(false);
  });
});

describe('money input', () => {
  it('parses MAD amounts into cents without floats', () => {
    expect(parseMoneyInput('800')).toBe(80_000);
    expect(parseMoneyInput('800,5')).toBe(80_050);
    expect(parseMoneyInput('1 250.75')).toBe(125_075);
    expect(parseMoneyInput('')).toBeNull();
    expect(parseMoneyInput('12,345')).toBeUndefined();
    expect(parseMoneyInput('-5')).toBeUndefined();
  });

  it('formats cents back for edit forms', () => {
    expect(centsToInput(80_000)).toBe('800');
    expect(centsToInput(80_050)).toBe('800,50');
    expect(centsToInput(null)).toBe('');
  });
});

describe('Morocco local time', () => {
  it('converts wall-clock times with the offset of the date (UTC+1 in July, UTC+0 in late October)', () => {
    expect(casablancaLocalToUtc('2026-07-15T09:30').toISOString()).toBe('2026-07-15T08:30:00.000Z');
    expect(casablancaLocalToUtc('2026-10-27T09:30').toISOString()).toBe('2026-10-27T09:30:00.000Z');
    expect(casablancaStartOfDay('2026-07-15').toISOString()).toBe('2026-07-14T23:00:00.000Z');
    expect(toCasablancaLocalInput(new Date('2026-07-15T08:30:00Z'))).toBe('2026-07-15T09:30');
  });

  it('does calendar arithmetic on days', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(startOfWeek('2026-10-29')).toBe('2026-10-26');
    expect(startOfWeek('2026-10-26')).toBe('2026-10-26');
    expect(isIsoDay('2026-10-26')).toBe(true);
    expect(isIsoDay('2026-13-01')).toBe(false);
  });
});

describe('tripSchema', () => {
  const base: TripInput = {
    clientId: '',
    passengerName: 'John Smith',
    passengerPhone: '',
    passengers: 2,
    luggage: 2,
    pickupCityId: '00000000-0000-4000-8000-000000000001',
    pickupAddress: 'Aéroport Mohammed V',
    dropoffCityId: '00000000-0000-4000-8000-000000000002',
    dropoffAddress: 'Riad Atlas',
    startsAt: '2030-05-10T08:00',
    endsAt: '2030-05-10T12:00',
    price: '800',
    vehicleId: '',
    driverId: '',
    notes: '',
    conflictOverride: false,
    overrideReason: '',
  };

  it('accepts a valid trip and checks the end time and the override reason', () => {
    expect(tripSchema.safeParse(base).success).toBe(true);
    expect(tripSchema.safeParse({ ...base, endsAt: '2030-05-10T07:00' }).success).toBe(false);
    expect(tripSchema.safeParse({ ...base, conflictOverride: true }).success).toBe(false);
    expect(tripSchema.safeParse({ ...base, price: '8,000' }).success).toBe(false);
  });
});

describe('expiry alerts', () => {
  it('flags expired and soon-to-expire documents', async () => {
    const { daysBetween, expiryAlert } = await import('./validity');
    expect(daysBetween('2026-10-26', '2026-11-25')).toBe(30);
    expect(expiryAlert('2026-10-25', '2026-10-26')).toBe('expired');
    expect(expiryAlert('2026-10-26', '2026-10-26')).toBe('soon');
    expect(expiryAlert('2026-11-25', '2026-10-26')).toBe('soon');
    expect(expiryAlert('2026-11-26', '2026-10-26')).toBeNull();
    expect(expiryAlert(null, '2026-10-26')).toBe('expired');
  });
});
