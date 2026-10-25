import { describe, expect, it } from 'vitest';
import {
  companyProfileSchema,
  driverSchema,
  normalizeRegistration,
  vehicleSchema,
} from './company-schemas';
import { detectDocumentType } from './documents';
import { isCompanyProfileComplete, onboardingProgress } from './onboarding';
import {
  canDriverPerformTrip,
  casablancaDate,
  casablancaEndOfDay,
  isDocumentValidOn,
} from './validity';

const firstError = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message;

describe('companyProfileSchema', () => {
  const valid = {
    legalName: 'Atlas Transport SARL',
    tradeName: '',
    ice: '001234567000089',
    ifNumber: '12345678',
    rcNumber: 'RC 123456',
    tpNumber: '',
    address: '12 boulevard Zerktouni, Casablanca',
    cityId: '6f1c2d3e-4a5b-4c6d-8e9f-0a1b2c3d4e5f',
    licenseNumber: 'TT-2026-001',
    licenseExpiresOn: '2099-12-31',
  };

  it('accepts a complete profile', () => {
    expect(companyProfileSchema.safeParse(valid).success).toBe(true);
  });

  it('requires a 15-digit ICE', () => {
    expect(firstError(companyProfileSchema.safeParse({ ...valid, ice: '12345' }))).toBe('ice');
  });

  it('accepts an expired tourism license (warned, not refused: Q24)', () => {
    expect(
      companyProfileSchema.safeParse({ ...valid, licenseExpiresOn: '2020-01-01' }).success,
    ).toBe(true);
    expect(
      firstError(companyProfileSchema.safeParse({ ...valid, licenseExpiresOn: '31/12/2030' })),
    ).toBe('date');
  });
});

describe('vehicleSchema', () => {
  const valid = {
    registration: ' 12345 - a - 6 ',
    brand: 'Mercedes',
    model: 'Vito',
    vehicleTypeCode: 'van',
    seats: 7,
    luggageCapacity: 6,
    year: 2022,
  };

  it('normalizes the registration', () => {
    expect(normalizeRegistration(' 12345   -  a - 6 ')).toBe('12345 - A - 6');
    expect(vehicleSchema.parse(valid).registration).toBe('12345 - A - 6');
  });

  it('accepts Arabic letters in a Moroccan plate', () => {
    expect(vehicleSchema.safeParse({ ...valid, registration: '12345-أ-6' }).success).toBe(true);
  });

  it('rejects invalid seats and registrations', () => {
    expect(firstError(vehicleSchema.safeParse({ ...valid, seats: 0 }))).toBe('seats');
    expect(firstError(vehicleSchema.safeParse({ ...valid, registration: 'ab@#' }))).toBe(
      'registration',
    );
  });
});

describe('driverSchema', () => {
  const valid = {
    fullName: 'Youssef El Amrani',
    phone: '+212 6 12 34 56 78',
    licenseNumber: 'D-123456',
    licenseExpiresOn: '2099-01-01',
    professionalCardNumber: '',
    professionalCardExpiresOn: '',
    languages: ['fr', 'ar'],
  };

  it('accepts a driver without professional card', () => {
    expect(driverSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts an expired driving license but refuses unknown languages', () => {
    expect(driverSchema.safeParse({ ...valid, licenseExpiresOn: '2001-01-01' }).success).toBe(true);
    expect(driverSchema.safeParse({ ...valid, languages: ['xx'] }).success).toBe(false);
  });
});

describe('isDocumentValidOn', () => {
  it('is valid up to and including the expiry day (Casablanca date)', () => {
    expect(isDocumentValidOn('2026-10-26', '2026-10-26')).toBe(true);
    expect(isDocumentValidOn('2026-10-25', '2026-10-26')).toBe(false);
    expect(isDocumentValidOn(null, '2026-10-26')).toBe(false);
  });

  it('tells whether a driver may perform a trip on a given day (Q24)', () => {
    expect(
      canDriverPerformTrip({ licenseExpiresOn: '2027-01-01', status: 'active' }, '2026-12-31'),
    ).toBe(true);
    expect(
      canDriverPerformTrip({ licenseExpiresOn: '2026-12-30', status: 'active' }, '2026-12-31'),
    ).toBe(false);
    expect(
      canDriverPerformTrip({ licenseExpiresOn: '2027-01-01', status: 'inactive' }, '2026-12-31'),
    ).toBe(false);
  });

  it('gives the calendar date in Morocco, not in UTC', () => {
    // Summer: Morocco is ahead of UTC (tz database), so 23:30 UTC is already the next day.
    expect(casablancaDate(new Date('2026-07-01T23:30:00Z'))).toBe('2026-07-02');
    expect(casablancaDate(new Date('2026-07-01T10:00:00Z'))).toBe('2026-07-01');
  });

  it('computes the end of a Moroccan day whatever the current offset', () => {
    for (const day of ['2026-03-01', '2026-07-01', '2026-10-26']) {
      const end = casablancaEndOfDay(day);
      expect(casablancaDate(end)).toBe(day);
      expect(casablancaDate(new Date(end.getTime() + 1000))).not.toBe(day);
    }
  });
});

describe('detectDocumentType', () => {
  const bytes = (...values: number[]) => new Uint8Array([...values, 0, 0, 0, 0, 0, 0, 0, 0]);

  it.each([
    ['PDF', bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31), 'application/pdf'],
    ['JPEG', bytes(0xff, 0xd8, 0xff, 0xe0), 'image/jpeg'],
    ['PNG', bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), 'image/png'],
    ['WEBP', bytes(0x52, 0x49, 0x46, 0x46, 0x10, 0, 0, 0, 0x57, 0x45, 0x42, 0x50), 'image/webp'],
  ])('detects %s from its signature', (_name, data, mime) => {
    expect(detectDocumentType(data)).toBe(mime);
  });

  it('refuses other files, even renamed ones', () => {
    // "MZ": a Windows executable renamed to .pdf
    expect(detectDocumentType(bytes(0x4d, 0x5a, 0x90))).toBeNull();
    expect(detectDocumentType(new Uint8Array())).toBeNull();
  });
});

describe('onboardingProgress', () => {
  it('points to the first missing step', () => {
    const progress = onboardingProgress({
      profileComplete: true,
      hasLicenseDocument: false,
      vehicleCount: 1,
      driverCount: 0,
    });
    expect(progress.doneCount).toBe(2);
    expect(progress.completed).toBe(false);
    expect(progress.nextStep).toBe('documents');
  });

  it('is completed when every step is done', () => {
    const progress = onboardingProgress({
      profileComplete: true,
      hasLicenseDocument: true,
      vehicleCount: 2,
      driverCount: 3,
    });
    expect(progress.completed).toBe(true);
    expect(progress.nextStep).toBeUndefined();
  });

  it('requires every mandatory company field', () => {
    const company = {
      legal_name: 'Atlas',
      ice: '001234567000089',
      if_number: '1',
      rc_number: '2',
      address: 'Casablanca',
      city_id: 'x',
      license_number: 'TT',
      license_expires_on: '2099-01-01',
    };
    expect(isCompanyProfileComplete(company)).toBe(true);
    expect(isCompanyProfileComplete({ ...company, ice: null })).toBe(false);
    expect(isCompanyProfileComplete({ ...company, address: '  ' })).toBe(false);
  });
});
