import { notFound } from 'next/navigation';
import { hasLocale, type Locale } from 'next-intl';
import { routing } from './routing';

/** Narrows a route param to a supported locale, or renders the 404 page. */
export function asLocale(value: string): Locale {
  if (!hasLocale(routing.locales, value)) notFound();
  return value;
}
