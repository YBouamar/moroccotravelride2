/** Result of a SaaS form Server Action: errors are i18n keys under `onboarding.errors.*`. */
export type FormError =
  | 'invalid'
  | 'forbidden'
  | 'readOnly'
  | 'duplicate'
  | 'inUse'
  | 'conflict'
  | 'capacity'
  | 'driverIneligible'
  | 'vehicleUnavailable'
  | 'invalidTransition'
  | 'locked'
  | 'paymentRefused'
  | 'sellerIncomplete'
  | 'clientIce'
  | 'emptyInvoice'
  | 'fileMissing'
  | 'fileType'
  | 'fileSize'
  | 'rateLimited'
  | 'unknown';

export type FormResult = { ok: true; id?: string } | { ok: false; error: FormError };

export const fail = (error: FormError): FormResult => ({ ok: false, error });

/** Business rule errors raised by database triggers (custom SQLSTATEs, see the trips migration). */
const BUSINESS_CODES: Record<string, FormError> = {
  MT001: 'driverIneligible',
  MT002: 'conflict',
  MT003: 'capacity',
  MT004: 'vehicleUnavailable',
  MT005: 'invalidTransition',
  MT006: 'locked',
  MT007: 'locked',
  MT008: 'paymentRefused',
  MT009: 'sellerIncomplete',
  MT010: 'clientIce',
  MT011: 'emptyInvoice',
};

/** Maps a Postgres error to a form error (unique violation, RLS, foreign key, business rule...). */
export function fromDbError(error: { code?: string }): FormResult {
  const business = error.code ? BUSINESS_CODES[error.code] : undefined;
  if (business) return fail(business);
  if (error.code === '23505') return fail('duplicate');
  if (error.code === '23503') return fail('inUse');
  if (error.code === '42501') return fail('forbidden');
  if (error.code === '23P01') return fail('conflict');
  console.error('database write failed', error.code);
  return fail('unknown');
}
