import { earliestBookableDay } from '@mtr/shared';
import { BadgeCheck, Banknote, CalendarX2, Tag } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { DestinationsSection } from '@/features/home/components/destinations-section';
import { HeroSection } from '@/features/home/components/hero-section';
import { RoutesSection } from '@/features/home/components/routes-section';
import { ServicesSection } from '@/features/home/components/services-section';
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

const STEPS = ['search', 'book', 'ride'] as const;

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
      <DestinationsSection locale={locale} cities={cities} cityMinPrice={prices.cityMinPrice} />
      <RoutesSection locale={locale} routes={prices.popularRoutes} />
      <ToursSection />

      <section aria-labelledby="steps-title" className="mx-auto max-w-6xl px-4 py-16">
        <h2 id="steps-title" className="text-2xl font-bold md:text-3xl">
          {t('steps.title')}
        </h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-4">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary font-bold text-secondary-foreground"
              >
                {index + 1}
              </span>
              <span>
                <span className="block font-semibold text-primary">{t(`steps.${step}.title`)}</span>
                <span className="mt-1 block text-sm text-muted">{t(`steps.${step}.text`)}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="reassurance-title" className="mx-auto max-w-6xl px-4 pb-16">
        <h2 id="reassurance-title" className="text-2xl font-bold md:text-3xl">
          {t('reassurance.title')}
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {REASSURANCE.map(({ key, icon: Icon }) => (
            <li key={key}>
              <Card className="h-full">
                <Icon aria-hidden="true" className="size-8 text-secondary" />
                <CardTitle className="mt-4">{t(`reassurance.${key}.title`)}</CardTitle>
                <CardDescription>{t(`reassurance.${key}.text`)}</CardDescription>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="carriers-title" className="mx-auto max-w-6xl px-4 pb-16">
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
