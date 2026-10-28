import { formatMoney } from '@mtr/shared';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { SERVICE_PHOTOS } from '../photos';

const SERVICES = [
  { key: 'transfer', href: '/search' },
  { key: 'hourly', href: '/quote?type=hourly' },
  { key: 'tour', href: '/quote?type=tour' },
] as const;

const zoom =
  'object-cover transition-transform duration-400 ease-out motion-safe:group-hover:scale-105 motion-safe:group-focus-visible:scale-105';

/**
 * The three offers (ADR-040). Size carries the hierarchy: transfers, the only offer bookable
 * online, take the large tile with their real starting price; the two offers on quote sit beside.
 */
export async function ServicesSection({
  locale,
  transferMinPrice,
}: {
  locale: Locale;
  transferMinPrice?: number;
}) {
  const t = await getTranslations('home.services');
  return (
    <section aria-labelledby="services-title" className="mx-auto max-w-6xl px-4 py-20">
      <h2 id="services-title" className="max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
        {t('title')}
      </h2>
      <ul className="mt-10 grid gap-5 lg:grid-cols-12">
        {SERVICES.map(({ key, href }) => {
          const featured = key === 'transfer';
          return (
            <li key={key} className={featured ? 'lg:col-span-7 lg:row-span-2' : 'lg:col-span-5'}>
              <Link
                href={href}
                className={cn(
                  'group flex h-full overflow-hidden rounded-card border border-border bg-surface transition-colors duration-150 hover:border-secondary',
                  featured ? 'flex-col' : 'flex-col sm:flex-row',
                )}
              >
                <div
                  className={cn(
                    'relative shrink-0 overflow-hidden',
                    featured
                      ? 'aspect-[16/10] lg:aspect-auto lg:flex-1'
                      : 'aspect-[16/10] sm:aspect-auto sm:w-2/5',
                  )}
                >
                  <Image
                    src={SERVICE_PHOTOS[key]}
                    alt={t(`${key}.alt`)}
                    fill
                    sizes={
                      featured
                        ? '(min-width: 1024px) 58vw, 100vw'
                        : '(min-width: 1024px) 17vw, (min-width: 640px) 40vw, 100vw'
                    }
                    placeholder="blur"
                    className={zoom}
                  />
                </div>
                <div className={cn('flex flex-1 flex-col gap-2', featured ? 'p-6 md:p-8' : 'p-5')}>
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      featured ? 'text-secondary' : 'text-muted',
                    )}
                  >
                    {featured ? t('badgeOnline') : t('badgeQuote')}
                  </p>
                  <h3 className={cn('font-bold', featured ? 'text-2xl md:text-3xl' : 'text-lg')}>
                    {t(`${key}.title`)}
                  </h3>
                  <p className={cn('text-muted', featured ? 'max-w-md' : 'text-sm')}>
                    {t(`${key}.text`)}
                  </p>
                  <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
                    {featured && transferMinPrice !== undefined ? (
                      <p className="text-2xl font-bold text-primary tabular-nums">
                        {t('fromPrice', { price: formatMoney(transferMinPrice, locale) })}
                      </p>
                    ) : null}
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary">
                      {t(`${key}.cta`)}
                      <ArrowRight
                        aria-hidden="true"
                        className="size-4 transition-transform duration-150 rtl:rotate-180 motion-safe:group-hover:translate-x-1 motion-safe:rtl:group-hover:-translate-x-1"
                      />
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
