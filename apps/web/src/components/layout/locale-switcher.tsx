'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { cn } from '@/lib/utils';

export function LocaleSwitcher() {
  const t = useTranslations('locale');
  const current = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t('label')}>
      <ul className="flex items-center gap-1">
        {routing.locales.map((locale) => {
          const active = locale === current;
          return (
            <li key={locale}>
              <Link
                href={pathname}
                locale={locale}
                hrefLang={locale}
                lang={locale}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'inline-flex min-h-11 items-center rounded-control px-2.5 text-sm font-medium',
                  active ? 'bg-background text-primary' : 'text-muted hover:text-primary',
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
