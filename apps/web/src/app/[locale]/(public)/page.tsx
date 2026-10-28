import { earliestBookableDay } from '@mtr/shared';
import { BadgeCheck, Banknote, CalendarX2, Tag } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buttonVariants } from '@/components/ui/button';
import { DestinationsSection } from '@/features/home/components/destinations-section';
import { HeroSection } from '@/features/home/components/hero-section';
import { RoutesSection } from '@/features/home/components/routes-section';
import { ServicesSection } from '@/features/home/components/services-section';
import { StepsSection } from '@/features/home/components/steps-section';
import { ToursSection } from '@/features/home/components/tours-section';
import { getHomePrices } from '@/features/home/queries';
import { getPlatformSettings } from '@/features/settings/queries';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';
import { localeAlternates } from '@/lib/seo';

const REASSURANCE = [
  { key: 'licensed', icon: BadgeCheck },
  { key: 'fixedPrice', icon: Tag },
  { key: 'cancellation', icon: CalendarX2 },
  { key: 'payment', icon: Banknote },
] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return { alternates: localeAlternates((await params).locale, '') };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const [t, prices, settings] = await Promise.all([
    getTranslations('home'),
    getHomePrices(locale),
    getPlatformSettings(),
  ]);
  const cities = prices.places.filter((place) => !place.isAirport);

  return (
    <>
      <HeroSection
        locale={locale}
        places={prices.places}
        minDay={earliestBookableDay(new Date(), settings.min_booking_lead_hours)}
        marketplaceOpen={settings.marketplace_open}
      />

      <ServicesSection locale={locale} transferMinPrice={prices.transferMinPrice} />
      <RoutesSection locale={locale} routes={prices.popularRoutes} />
      <DestinationsSection locale={locale} cities={cities} cityMinPrice={prices.cityMinPrice} />
      <ToursSection />

      <StepsSection />

      {/* Reassurance as one quiet band: four facts side by side, no card chrome. */}
      <section aria-labelledby="reassurance-title" className="border-y border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 id="reassurance-title" className="text-2xl font-bold tracking-tight md:text-3xl">
            {t('reassurance.title')}
          </h2>
          <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
            {REASSURANCE.map(({ key, icon: Icon }) => (
              <li
                key={key}
                className="flex flex-col gap-2 lg:border-s lg:border-border lg:px-6 lg:first:border-s-0 lg:first:ps-0"
              >
                <Icon aria-hidden="true" className="size-7 text-secondary" />
                <h3 className="mt-2 font-semibold text-primary">{t(`reassurance.${key}.title`)}</h3>
                <p className="text-sm text-muted">{t(`reassurance.${key}.text`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="carriers-title" className="mx-auto max-w-6xl px-4 py-20">
        <div className="flex flex-col items-start gap-4 rounded-card bg-linear-to-br from-teal-deep to-navy p-8 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="carriers-title" className="text-2xl font-bold text-white">
              {t('carriers.title')}
            </h2>
            <p className="mt-2 max-w-2xl text-white/90">{t('carriers.text')}</p>
          </div>
          <Link href="/signup" className={buttonVariants({ size: 'lg', className: 'shrink-0' })}>
            {t('carriers.cta')}
          </Link>
        </div>
      </section>
    </>
  );
}
