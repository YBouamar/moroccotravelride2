import { formatMoney } from '@mtr/shared';
import { ArrowLeftRight, ArrowRight } from 'lucide-react';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

interface RoutesSectionProps {
  locale: Locale;
  routes: { from: string; to: string; fromName: string; toName: string; minPriceCents: number }[];
}

/**
 * Popular transfers with their real lowest price, laid out like a departures board: one row per
 * route, prices in a column. Each row prefills the search form.
 */
export async function RoutesSection({ locale, routes }: RoutesSectionProps) {
  const t = await getTranslations('home.routes');
  if (routes.length === 0) return null;
  return (
    <section aria-labelledby="routes-title" className="mx-auto max-w-6xl px-4 pb-20">
      <div className="overflow-hidden rounded-card bg-navy text-white">
        <div className="flex flex-col gap-2 px-6 pt-8 pb-6 md:flex-row md:items-end md:justify-between md:px-10 md:pt-10">
          <h2
            id="routes-title"
            className="text-3xl font-bold tracking-tight text-white md:text-4xl"
          >
            {t('title')}
          </h2>
          <p className="text-sm text-white/70">{t('perVehicle')}</p>
        </div>
        <ul className="border-t border-white/15">
          {routes.map((route) => (
            <li
              key={`${route.from}:${route.to}`}
              className="border-b border-white/10 last:border-b-0"
            >
              <Link
                href={`/search?${new URLSearchParams({ from: route.from, to: route.to }).toString()}`}
                className="group flex items-center gap-4 px-6 py-5 transition-colors duration-150 hover:bg-white/5 focus-visible:bg-white/5 md:px-10"
              >
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-lg font-semibold text-white md:text-xl">
                  {route.fromName}
                  <ArrowLeftRight aria-hidden="true" className="size-4 shrink-0 text-teal" />
                  {route.toName}
                </span>
                <span className="shrink-0 text-end">
                  <span className="block text-xs text-white/60">{t('from')}</span>
                  <span className="block text-xl font-bold text-white tabular-nums md:text-2xl">
                    {formatMoney(route.minPriceCents, locale)}
                  </span>
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="hidden size-5 shrink-0 text-teal transition-transform duration-150 rtl:rotate-180 sm:block motion-safe:group-hover:translate-x-1 motion-safe:rtl:group-hover:-translate-x-1"
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-4 text-xs text-muted">{t('note')}</p>
    </section>
  );
}
