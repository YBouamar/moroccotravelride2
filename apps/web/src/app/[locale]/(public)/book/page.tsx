import { formatMoney, isBookableAt, searchPickupAt } from '@mtr/shared';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BookingForm } from '@/features/booking/components/booking-form';
import { BookingSummary } from '@/features/booking/components/booking-summary';
import { getBookableOffer } from '@/features/booking/queries';
import { getPublicPlaces, parseSearch, type SearchParams } from '@/features/search/queries';
import { getPlatformSettings } from '@/features/settings/queries';
import { asLocale } from '@/i18n/as-locale';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { Link } from '@/i18n/navigation';
import { getPublicEnv } from '@/lib/env';
import { getClientIp, getNonce } from '@/lib/security/request-context';

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
  // Same limit as the search (security audit 2026-10-26, finding 3).
  const allowed = await consumeRateLimit('search-ip', await getClientIp(), 60, 60);
  const offer =
    allowed && search && !tooSoon && offerId
      ? await getBookableOffer(offerId, search, locale)
      : null;
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
      {/* First on mobile: the traveler sees what and how much before filling the form. */}
      <aside className="order-first lg:order-last">
        <BookingSummary
          from={placeName(search.from)}
          to={placeName(search.to)}
          pickup={format.dateTime(searchPickupAt(search), {
            dateStyle: 'full',
            timeStyle: 'short',
          })}
          vehicleTypeCode={offer.vehicleTypeCode}
          vehicleType={offer.vehicleType}
          passengers={search.passengers}
          carrierName={offer.carrierName}
          price={formatMoney(offer.priceCents, locale)}
          acceptHours={settings.carrier_accept_hours}
        />
      </aside>
    </div>
  );
}
