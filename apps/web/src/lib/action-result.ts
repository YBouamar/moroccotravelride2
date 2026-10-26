/** Result of a SaaS form Server Action: errors are i18n keys under `onboarding.errors.*`. */
export type FormError =
  | 'invalid'
  | 'forbidden'
  | 'readOnly'
  | 'duplicate'
  | 'inUse'
  | 'conflict'
  | 'driverIneligible'
  | 'fileMissing'
  | 'fileType'
  | 'fileSize'
  | 'rateLimited'
  | 'unknown';

export type FormResult = { ok: true; id?: string } | { ok: false; error: FormError };

export const fail = (error: FormError): FormResult => ({ ok: false, error });

/** Maps a Postgres error to a form error (unique violation, RLS, foreign key...). */
export function fromDbError(error: { code?: string }): FormResult {
  if (error.code === '23505') return fail('duplicate');
  if (error.code === '23503') return fail('inUse');
  if (error.code === '42501') return fail('forbidden');
  if (error.code === '23P01') return fail('conflict');
  console.error('database write failed', error.code);
  return fail('unknown');
}
