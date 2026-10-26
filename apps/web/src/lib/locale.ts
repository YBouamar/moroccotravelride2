const RTL_LOCALES = new Set(['ar']);

export type Direction = 'ltr' | 'rtl';

export function getDirection(locale: string): Direction {
  return RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
}

export const APP_LOCALES = ['fr', 'en', 'ar'] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

/** Locale stored with a booking or an e-mail, French when unknown. */
export const asAppLocale = (value: string | null | undefined): AppLocale =>
  (APP_LOCALES as readonly string[]).includes(value ?? '') ? (value as AppLocale) : 'fr';
