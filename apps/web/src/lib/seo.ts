import type { Metadata } from 'next';
import { routing } from '@/i18n/routing';

/** Public site URL (canonical links, sitemap); localhost until the domain exists. */
export const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * Canonical URL and language alternates (hreflang) of a public page, `path` without locale
 * (e.g. "" or "/transfers/casablanca"). French is the default (x-default).
 */
export function localeAlternates(locale: string, path: string): Metadata['alternates'] {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      ...Object.fromEntries(
        routing.locales.map((candidate) => [candidate, `/${candidate}${path}`]),
      ),
      'x-default': `/${routing.defaultLocale}${path}`,
    },
  };
}
