import { addDays, casablancaDate, QUOTE_KINDS, type QuoteKind } from '@mtr/shared';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { SERVICE_PHOTOS } from '@/features/home/photos';
import { QuoteForm } from '@/features/quotes/components/quote-form';
import { getPublicPlaces } from '@/features/search/queries';
import { asLocale } from '@/i18n/as-locale';
import { getPublicEnv } from '@/lib/env';
import { localeAlternates } from '@/lib/seo';
import { getNonce } from '@/lib/security/request-context';

interface QuotePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const asKind = (value: unknown): QuoteKind =>
  QUOTE_KINDS.includes(value as QuoteKind) ? (value as QuoteKind) : 'tour';

export async function generateMetadata({ params }: QuotePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale: asLocale(locale), namespace: 'quote' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: localeAlternates(locale, '/quote'),
  };
}

/** Quote request for chauffeur hire or an organized tour (ADR-040). */
export default async function QuotePage({ params, searchParams }: QuotePageProps) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const kind = asKind((await searchParams).type);
  const [t, places] = await Promise.all([getTranslations('quote'), getPublicPlaces(locale)]);
  const cities = places.filter((place) => !place.isAirport);

  return (
    <div className="flex flex-col">
      <section className="relative isolate overflow-hidden bg-navy text-white">
        <Image
          src={SERVICE_PHOTOS[kind]}
          alt=""
          fill
          priority
          sizes="100vw"
          placeholder="blur"
          className="-z-10 object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-navy/80" />
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <h1 className="text-3xl font-bold text-white md:text-4xl">
            {t(`kinds.${kind}.heading`)}
          </h1>
          <p className="mt-3 max-w-2xl text-white/90">{t('intro')}</p>
        </div>
      </section>
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[1fr_20rem]">
        <Card>
          <QuoteForm
            kind={kind}
            cities={cities}
            minDay={addDays(casablancaDate(), 1)}
            siteKey={getPublicEnv().NEXT_PUBLIC_TURNSTILE_SITE_KEY}
            nonce={await getNonce()}
          />
        </Card>
        <aside className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">{t('how.title')}</h2>
            <ol className="flex list-decimal flex-col gap-2 ps-5 text-sm text-muted">
              <li>{t('how.step1')}</li>
              <li>{t('how.step2')}</li>
              <li>{t('how.step3')}</li>
            </ol>
          </Card>
        </aside>
      </div>
    </div>
  );
}
