import { BadgeCheck, Banknote, CalendarX2, Tag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { asLocale } from '@/i18n/as-locale';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';

const REASSURANCE = [
  { key: 'licensed', icon: BadgeCheck },
  { key: 'fixedPrice', icon: Tag },
  { key: 'cancellation', icon: CalendarX2 },
  { key: 'payment', icon: Banknote },
] as const;

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(asLocale(use(params).locale));
  const t = useTranslations('home');

  return (
    <>
      {/* Navy background: navy text on the teal gradient only reaches 3.05:1 (ADR-010). */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 end-0 w-1/3 bg-linear-to-br from-teal-deep to-teal opacity-25 [clip-path:polygon(30%_0,100%_0,100%_100%,0_100%)]"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-24">
          <h1 className="max-w-3xl text-3xl leading-tight font-bold text-white md:text-5xl">
            {t('hero.title')}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/90">{t('hero.subtitle')}</p>
          <div className="mt-8 flex flex-col items-start gap-2">
            <Button size="lg" disabled aria-describedby="search-soon">
              {t('hero.cta')}
            </Button>
            <p id="search-soon" className="text-sm text-teal">
              {t('hero.comingSoon')}
            </p>
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
