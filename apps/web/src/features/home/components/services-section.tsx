import { formatMoney } from '@mtr/shared';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { SERVICE_PHOTOS } from '../photos';

const SERVICES = [
  { key: 'transfer', href: '/search' },
  { key: 'hourly', href: '/quote?type=hourly' },
  { key: 'tour', href: '/quote?type=tour' },
] as const;

/** The three offers: transfers (bookable online), chauffeur hire and tours (on quote, ADR-040). */
export async function ServicesSection({
  locale,
  transferMinPrice,
}: {
  locale: Locale;
  transferMinPrice?: number;
}) {
  const t = await getTranslations('home.services');
  return (
    <section aria-labelledby="services-title" className="mx-auto max-w-6xl px-4 py-16">
      <p className="text-sm font-semibold tracking-wide text-secondary uppercase">{t('eyebrow')}</p>
      <h2 id="services-title" className="mt-2 text-2xl font-bold md:text-3xl">
        {t('title')}
      </h2>
      <ul className="mt-8 grid gap-6 md:grid-cols-3">
        {SERVICES.map(({ key, href }) => (
          <li key={key}>
            <Link
              href={href}
              className="group flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={SERVICE_PHOTOS[key]}
                  alt={t(`${key}.alt`)}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  placeholder="blur"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute start-3 top-3 rounded-full bg-navy/85 px-3 py-1 text-xs font-semibold text-white">
                  {key === 'transfer' ? t('badgeOnline') : t('badgeQuote')}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-5">
                <h3 className="text-lg font-bold">{t(`${key}.title`)}</h3>
                <p className="text-sm text-muted">{t(`${key}.text`)}</p>
                <p className="mt-auto pt-3 font-semibold text-primary">
                  {key === 'transfer' && transferMinPrice !== undefined
                    ? t('fromPrice', { price: formatMoney(transferMinPrice, locale) })
                    : t('onQuote')}
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-secondary">
                  {t(`${key}.cta`)}
                  <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
