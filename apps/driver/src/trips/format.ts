import type { Locale } from '@/i18n/locales';

/** Dates of trips in Morocco time, Latin digits everywhere (same rule as the web, ADR-024). */
const tag = (locale: Locale) => (locale === 'ar' ? 'ar-MA-u-nu-latn' : `${locale}-MA`);

export const formatTime = (iso: string, locale: Locale) =>
  new Intl.DateTimeFormat(tag(locale), {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Africa/Casablanca',
  }).format(new Date(iso));

export const formatDay = (iso: string, locale: Locale) =>
  new Intl.DateTimeFormat(tag(locale), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Africa/Casablanca',
  }).format(new Date(iso));

export const placeName = (
  place: { name_fr: string; name_en: string; name_ar: string } | null,
  locale: Locale,
) => (place ? place[`name_${locale}`] : '');
