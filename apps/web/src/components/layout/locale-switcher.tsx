'use client';

import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { cn } from '@/lib/utils';

export function LocaleSwitcher() {
  const t = useTranslations('locale');
  const current = useLocale();
  const pathname = usePathname();
  // Keep the query string (e.g. ?next= on the login page) when changing language.
  const query = Object.fromEntries(useSearchParams());

  return (
    <nav aria-label={t('label')}>
      <ul className="flex items-center gap-1">
        {routing.locales.map((locale) => {
          const active = locale === current;
          return (
            <li key={locale}>
              <Link
                href={{ pathname, query }}
                locale={locale}
                hrefLang={locale}
                lang={locale}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'inline-flex min-h-11 items-center rounded-control px-2.5 text-sm',
                  // Border so the active language stays visible on any background.
                  active
                    ? 'border border-border bg-surface font-semibold text-primary'
                    : 'font-medium text-muted hover:text-primary',
                )}
              >
                {t(`names.${locale}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
