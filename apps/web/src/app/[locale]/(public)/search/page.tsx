import { earliestBookableDay, formatMoney, isBookableAt, searchPickupAt } from '@mtr/shared';
import { SearchX } from 'lucide-react';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { OfferCard } from '@/features/search/components/offer-card';
import { SearchForm } from '@/features/search/components/search-form';
import {
  getPublicPlaces,
  parseSearch,
  searchOffers,
  type SearchParams,
} from '@/features/search/queries';
import { getPlatformSettings } from '@/features/settings/queries';
import { asLocale } from '@/i18n/as-locale';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { getClientIp } from '@/lib/security/request-context';

export async function generateMetadata() {
  const t = await getTranslations('search');
  return { title: t('title') };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const [t, format, places, settings, raw] = await Promise.all([
    getTranslations('search'),
    getFormatter(),
    getPublicPlaces(locale),
    getPlatformSettings(),
    searchParams,
  ]);
  const search = parseSearch(raw);
  const lead = settings.min_booking_lead_hours;
  const tooSoon = search ? !isBookableAt(searchPickupAt(search), new Date(), lead) : false;
  // Security audit 2026-10-26 (finding 3): 60 searches per minute and per IP.
  const throttled = !!search && !(await consumeRateLimit('search-ip', await getClientIp(), 60, 60));
  const offers =
    search && !tooSoon && !throttled && settings.marketplace_open
      ? await searchOffers(search, locale)
      : [];
  const placeName = (id: string) => places.find((place) => place.id === id)?.name ?? '';
  // Links of the home page prefill the route only: keep a known place even without a full search.
  const knownPlace = (value: SearchParams[string]) =>
    typeof value === 'string' && places.some((place) => place.id === value) ? value : undefined;

  const bookHref = (offerId: string) =>
    `/book?${new URLSearchParams({
      offer: offerId,
      from: search!.from,
      to: search!.to,
      date: search!.date,
      time: search!.time,
      passengers: String(search!.passengers),
    }).toString()}`;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10">
      <Card>
        <SearchForm
          places={places}
          minDay={earliestBookableDay(new Date(), lead)}
          defaults={search ?? { from: knownPlace(raw.from), to: knownPlace(raw.to) }}
          layout="bar"
          action={`/${locale}/search`}
        />
      </Card>

      {!settings.marketplace_open ? <Alert tone="danger">{t('closed')}</Alert> : null}
      {tooSoon ? <Alert tone="danger">{t('tooSoon', { hours: lead })}</Alert> : null}
      {throttled ? <Alert tone="danger">{t('throttled')}</Alert> : null}

      {search && !tooSoon && !throttled ? (
        <section aria-labelledby="results-title" className="flex flex-col gap-4">
          <div>
            <h1 id="results-title" className="text-2xl font-bold">
              {t('resultsTitle', { from: placeName(search.from), to: placeName(search.to) })}
            </h1>
            <p className="text-sm text-muted">
              {t('resultsSummary', {
                date: format.dateTime(searchPickupAt(search), {
                  dateStyle: 'full',
                  timeStyle: 'short',
                }),
                passengers: search.passengers,
              })}
            </p>
          </div>
          {offers.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={t('noResult.title')}
              description={t('noResult.text')}
            />
          ) : (
            <>
              <ul className="flex flex-col gap-4">
                {offers.map((offer, index) => (
                  <li key={offer.offerId}>
                    <OfferCard
                      offer={offer}
                      price={formatMoney(offer.priceCents, locale)}
                      href={bookHref(offer.offerId)}
                      cheapest={index === 0 && offer.priceCents < (offers[1]?.priceCents ?? 0)}
                    />
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted">{t('photoNote')}</p>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
