import { earliestBookableDay, formatMoney, isBookableAt, searchPickupAt } from '@mtr/shared';
import { BadgeCheck, CarFront, SearchX, Star, Users } from 'lucide-react';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchForm } from '@/features/search/components/search-form';
import {
  getPublicPlaces,
  parseSearch,
  searchOffers,
  type SearchParams,
} from '@/features/search/queries';
import { getPlatformSettings } from '@/features/settings/queries';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';

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
  const offers =
    search && !tooSoon && settings.marketplace_open ? await searchOffers(search, locale) : [];
  const placeName = (id: string) => places.find((place) => place.id === id)?.name ?? '';

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
          defaults={search ?? undefined}
          action={`/${locale}/search`}
        />
      </Card>

      {!settings.marketplace_open ? <Alert tone="danger">{t('closed')}</Alert> : null}
      {tooSoon ? <Alert tone="danger">{t('tooSoon', { hours: lead })}</Alert> : null}

      {search && !tooSoon ? (
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
            <ul className="flex flex-col gap-3">
              {offers.map((offer) => (
                <li key={offer.offerId}>
                  <Card className="flex flex-wrap items-center gap-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-background">
                      <CarFront aria-hidden="true" className="size-6 text-secondary" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-semibold">{offer.vehicleType}</p>
                      <p className="flex flex-wrap items-center gap-3 text-sm text-muted">
                        <span className="flex items-center gap-1">
                          <BadgeCheck aria-hidden="true" className="size-4 text-secondary" />
                          {t('carrier', { name: offer.carrierName })}
                        </span>
                        {offer.rating ? (
                          <span className="flex items-center gap-1">
                            <Star
                              aria-hidden="true"
                              className="size-4 fill-accent text-secondary"
                            />
                            {t('rating', {
                              average: offer.rating.average,
                              count: offer.rating.reviews,
                            })}
                          </span>
                        ) : null}
                        <span className="flex items-center gap-1">
                          <Users aria-hidden="true" className="size-4" />
                          {t('seatsUpTo', { seats: offer.maxSeats })}
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-2xl font-bold">{formatMoney(offer.priceCents, locale)}</p>
                      <p className="text-xs text-muted">{t('allInclusive')}</p>
                      <Link href={bookHref(offer.offerId)} className={buttonVariants()}>
                        {t('book')}
                      </Link>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
