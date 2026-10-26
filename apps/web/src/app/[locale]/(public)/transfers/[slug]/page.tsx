import { earliestBookableDay, formatMoney } from '@mtr/shared';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { SearchForm } from '@/features/search/components/search-form';
import { getPublicPlaces } from '@/features/search/queries';
import { getPlatformSettings } from '@/features/settings/queries';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';
import { localeAlternates } from '@/lib/seo';
import { createClient } from '@/lib/supabase/server';

interface TransferCityProps {
  params: Promise<{ locale: string; slug: string }>;
}

async function getCity(locale: string, slug: string) {
  const places = await getPublicPlaces(asLocale(locale));
  return { places, city: places.find((place) => place.slug === slug && !place.isAirport) ?? null };
}

export async function generateMetadata({ params }: TransferCityProps) {
  const { locale, slug } = await params;
  const [{ city }, t] = await Promise.all([
    getCity(locale, slug),
    getTranslations({ locale: asLocale(locale), namespace: 'transfers' }),
  ]);
  if (!city) return {};
  return {
    title: t('metaTitle', { city: city.name }),
    description: t('metaDescription', { city: city.name }),
    alternates: localeAlternates(locale, `/transfers/${slug}`),
  };
}

/** SEO landing page of a departure city (Phase 7): search form and "from" prices of its routes. */
export default async function TransferCityPage({ params }: TransferCityProps) {
  const { locale: rawLocale, slug } = await params;
  const locale = asLocale(rawLocale);
  setRequestLocale(locale);
  const [{ city, places }, t, settings] = await Promise.all([
    getCity(locale, slug),
    getTranslations('transfers'),
    getPlatformSettings(),
  ]);
  if (!city) notFound();

  const supabase = await createClient();
  const { data: routes } = await supabase.rpc('route_prices', { p_from: city.id });
  const placeName = (id: string) => places.find((place) => place.id === id)?.name ?? '';

  return (
    <div className="flex flex-col">
      <section className="bg-navy text-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h1 className="text-3xl font-bold text-white md:text-4xl">
            {t('title', { city: city.name })}
          </h1>
          <p className="mt-3 max-w-2xl text-white/90">{t('intro', { city: city.name })}</p>
          <div className="mt-8">
            <SearchForm
              places={places}
              minDay={earliestBookableDay(new Date(), settings.min_booking_lead_hours)}
              defaults={{ from: city.id }}
              tone="dark"
              action={`/${locale}/search`}
            />
          </div>
        </div>
      </section>
      <section aria-labelledby="routes-title" className="mx-auto w-full max-w-6xl px-4 py-12">
        <h2 id="routes-title" className="text-2xl font-bold">
          {t('routesTitle', { city: city.name })}
        </h2>
        {routes && routes.length > 0 ? (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {routes.map((route) => (
              <li key={route.to_city_id}>
                <Card className="flex flex-col gap-1">
                  <p className="font-semibold">
                    {city.name} / {placeName(route.to_city_id)}
                  </p>
                  <p className="text-sm text-muted">
                    {t('from', { price: formatMoney(route.min_price_cents, locale) })} ·{' '}
                    {t('carriers', { count: route.carriers })}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted">{t('noRoute')}</p>
        )}
        <Link href="/" className="mt-8 inline-block text-sm font-medium text-secondary underline">
          {t('allCities')}
        </Link>
      </section>
    </div>
  );
}
