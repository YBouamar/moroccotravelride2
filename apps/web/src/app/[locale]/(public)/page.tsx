import { earliestBookableDay } from '@mtr/shared';
import { BadgeCheck, Banknote, CalendarX2, Tag } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { SearchForm } from '@/features/search/components/search-form';
import { getPublicPlaces } from '@/features/search/queries';
import { getPlatformSettings } from '@/features/settings/queries';
import { asLocale } from '@/i18n/as-locale';

const REASSURANCE = [
  { key: 'licensed', icon: BadgeCheck },
  { key: 'fixedPrice', icon: Tag },
  { key: 'cancellation', icon: CalendarX2 },
  { key: 'payment', icon: Banknote },
] as const;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const [t, places, settings] = await Promise.all([
    getTranslations('home'),
    getPublicPlaces(locale),
    getPlatformSettings(),
  ]);

  return (
    <>
      {/* Navy background: navy text on the teal gradient only reaches 3.05:1 (ADR-010). */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 end-0 w-1/3 bg-linear-to-br from-teal-deep to-teal opacity-25 [clip-path:polygon(30%_0,100%_0,100%_100%,0_100%)]"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-12 md:py-20">
          <h1 className="max-w-3xl text-3xl leading-tight font-bold text-white md:text-5xl">
            {t('hero.title')}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/90">{t('hero.subtitle')}</p>
          <div className="mt-8">
            {settings.marketplace_open ? (
              <SearchForm
                places={places}
                minDay={earliestBookableDay(new Date(), settings.min_booking_lead_hours)}
                tone="dark"
                action={`/${locale}/search`}
              />
            ) : (
              <p className="text-teal">{t('hero.closed')}</p>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="reassurance-title" className="mx-auto max-w-6xl px-4 py-16">
        <h2 id="reassurance-title" className="text-2xl font-bold">
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
    </>
  );
}
