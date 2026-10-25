/**
 * Validity of dated documents (tourism license, driving license, professional card).
 * Q24 (2026-10-26): an expired date is accepted at entry and only warned about, but a driver
 * cannot perform a trip without a valid driving license on the day of the trip.
 */

const CASABLANCA_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Casablanca',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Calendar date (yyyy-mm-dd) in Morocco, including the Ramadan time change. */
export function casablancaDate(at: Date = new Date()): string {
  return CASABLANCA_DATE.format(at);
}

/** A document is valid up to and including its expiry day. Missing date = not valid. */
export function isDocumentValidOn(expiresOn: string | null | undefined, day: string): boolean {
  return !!expiresOn && expiresOn >= day;
}

export interface DriverEligibility {
  licenseExpiresOn: string | null;
  status: 'active' | 'inactive';
}

/** Whether a driver may be assigned to a trip taking place on `day` (yyyy-mm-dd). */
export function canDriverPerformTrip(driver: DriverEligibility, day: string): boolean {
  return driver.status === 'active' && isDocumentValidOn(driver.licenseExpiresOn, day);
}

const OFFSET_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Africa/Casablanca',
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
});

/** Offset of Casablanca from UTC at a given instant, in milliseconds (from the tz database). */
function casablancaOffsetMs(at: Date): number {
  const parts = Object.fromEntries(
    OFFSET_PARTS.formatToParts(at).map((part) => [part.type, Number(part.value)]),
  ) as Record<string, number>;
  const asUtc = Date.UTC(
    parts.year!,
    parts.month! - 1,
    parts.day!,
    parts.hour!,
    parts.minute!,
    parts.second!,
  );
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/**
 * Last second (23:59:59) of a calendar day in Morocco, as a UTC instant. Never hard-code the
 * offset: Morocco switches between UTC+0 and UTC+1 (tz database Africa/Casablanca).
 */
export function casablancaEndOfDay(day: string): Date {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  const guess = Date.UTC(year, month - 1, date, 23, 59, 59);
  return new Date(guess - casablancaOffsetMs(new Date(guess)));
}
