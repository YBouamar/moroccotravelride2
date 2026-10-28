import { formatMoney } from '@mtr/shared';
import { ArrowLeftRight } from 'lucide-react';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

interface RoutesSectionProps {
  locale: Locale;
  routes: { from: string; to: string; fromName: string; toName: string; minPriceCents: number }[];
}

/** Popular transfers with their real lowest price; each link prefills the search form. */
export async function RoutesSection({ locale, routes }: RoutesSectionProps) {
  const t = await getTranslations('home.routes');
  if (routes.length === 0) return null;
  return (
    <section aria-labelledby="routes-title" className="mx-auto max-w-6xl px-4 py-16">
      <p className="text-sm font-semibold tracking-wide text-secondary uppercase">{t('eyebrow')}</p>
      <h2 id="routes-title" className="mt-2 text-2xl font-bold md:text-3xl">
        {t('title')}
      </h2>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {routes.map((route) => (
          <li key={`${route.from}:${route.to}`}>
            <Link
              href={`/search?${new URLSearchParams({ from: route.from, to: route.to }).toString()}`}
              className="flex h-full items-center justify-between gap-3 rounded-card border border-border bg-surface p-4 shadow-sm transition-colors hover:border-secondary"
            >
              <span className="flex flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2 font-semibold text-primary">
                  {route.fromName}
                  <ArrowLeftRight aria-hidden="true" className="size-4 text-secondary" />
                  {route.toName}
                </span>
                <span className="text-sm text-muted">{t('perVehicle')}</span>
              </span>
              <span className="shrink-0 text-end">
                <span className="block text-xs text-muted">{t('from')}</span>
                <span className="block text-lg font-bold text-primary">
                  {formatMoney(route.minPriceCents, locale)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted">{t('note')}</p>
    </section>
  );
}
