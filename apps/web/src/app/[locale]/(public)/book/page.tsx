import { formatMoney, isBookableAt, searchPickupAt } from '@mtr/shared';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { BookingForm } from '@/features/booking/components/booking-form';
import { getBookableOffer } from '@/features/booking/queries';
import { getPublicPlaces, parseSearch, type SearchParams } from '@/features/search/queries';
import { getPlatformSettings } from '@/features/settings/queries';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';
import { getPublicEnv } from '@/lib/env';
import { getNonce } from '@/lib/security/request-context';

export async function generateMetadata() {
  const t = await getTranslations('book');
  return { title: t('title'), robots: { index: false } };
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const raw = await searchParams;
  const offerId = typeof raw.offer === 'string' ? raw.offer : '';
  const [t, format, settings] = await Promise.all([
    getTranslations('book'),
    getFormatter(),
    getPlatformSettings(),
  ]);

  // The offer comes from the URL: it must be one of the results of this very search, and
  // create_booking checks it once more.
  const search = parseSearch(raw);
  const tooSoon = search
    ? !isBookableAt(searchPickupAt(search), new Date(), settings.min_booking_lead_hours)
    : false;
  const offer =
    search && !tooSoon && offerId ? await getBookableOffer(offerId, search, locale) : null;
  const places = offer ? await getPublicPlaces(locale) : [];
  const placeName = (id: string) => places.find((place) => place.id === id)?.name ?? '';

  if (!search || !offer) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-12">
        <Alert tone="danger">{t(tooSoon ? 'tooSoon' : 'unavailable')}</Alert>
        <Link href="/" className={buttonVariants({ variant: 'outline', className: 'self-start' })}>
          {t('backToSearch')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 lg:grid-cols-[1fr_20rem]">
      <Card>
        <h1 className="mb-6 text-2xl font-bold">{t('title')}</h1>
        <BookingForm
          offer={offer.offerId}
          date={search.date}
          time={search.time}
          passengers={search.passengers}
          siteKey={getPublicEnv().NEXT_PUBLIC_TURNSTILE_SITE_KEY}
          nonce={await getNonce()}
        />
      </Card>
      <aside>
        <Card className="flex flex-col gap-2 lg:sticky lg:top-6">
          <CardTitle>{t('summary')}</CardTitle>
          <p className="font-medium">
            {placeName(search.from)} / {placeName(search.to)}
          </p>
          <p className="text-sm text-muted">
            {format.dateTime(searchPickupAt(search), { dateStyle: 'full', timeStyle: 'short' })}
          </p>
          <p className="text-sm text-muted">
            {offer.vehicleType} · {t('passengers', { count: search.passengers })}
          </p>
          <p className="text-sm text-muted">{t('carrier', { name: offer.carrierName })}</p>
          <p className="mt-2 text-2xl font-bold">{formatMoney(offer.priceCents, locale)}</p>
          <p className="text-xs text-muted">{t('priceNote')}</p>
          <p className="mt-2 text-xs text-muted">
            {t('acceptNote', { hours: settings.carrier_accept_hours })}
          </p>
        </Card>
      </aside>
    </div>
  );
}
