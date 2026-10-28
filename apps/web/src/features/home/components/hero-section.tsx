import { BadgeCheck } from 'lucide-react';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { SearchForm } from '@/features/search/components/search-form';
import { HeroBackdrop } from './hero-backdrop';
import { HERO_POSTER } from '../photos';

interface HeroSectionProps {
  locale: string;
  places: { id: string; name: string; isAirport: boolean }[];
  minDay: string;
  marketplaceOpen: boolean;
}

/**
 * Full-bleed video of travelers riding through Tangier, text on the shaded start side, the
 * search as a single white bar anchored at the bottom of the frame.
 */
export async function HeroSection({ locale, places, minDay, marketplaceOpen }: HeroSectionProps) {
  const t = await getTranslations('home');

  return (
    <>
      <section className="relative isolate flex flex-col justify-end overflow-hidden bg-navy text-white md:min-h-[min(80svh,50rem)]">
        <HeroBackdrop pauseLabel={t('hero.pauseVideo')} playLabel={t('hero.playVideo')}>
          <Image
            src={HERO_POSTER}
            alt=""
            fill
            priority
            sizes="100vw"
            placeholder="blur"
            className="object-cover object-bottom"
          />
        </HeroBackdrop>
        {/* Shade the text side so the street stays visible; mirrored in RTL. Full shade on mobile. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-navy/65 md:bg-transparent md:bg-linear-to-r md:from-navy/95 md:from-25% md:via-navy/70 md:via-50% md:to-transparent md:rtl:bg-linear-to-l"
        />

        <div className="mx-auto w-full max-w-6xl px-4 pt-12 pb-24 md:pt-28 md:pb-36">
          <h1 className="max-w-3xl text-4xl leading-[1.04] font-bold tracking-tight text-balance text-white motion-safe:animate-rise md:text-6xl lg:text-7xl">
            {t('hero.title')}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85 motion-safe:animate-rise motion-safe:[animation-delay:80ms]">
            {t('hero.subtitle')}
          </p>
        </div>
      </section>

      {/* The search bar straddles the bottom edge of the video, leaving the bus deck in view. */}
      <div className="relative z-10 mx-auto -mt-16 w-full max-w-6xl px-4 md:-mt-20">
        <div className="rounded-card bg-surface p-4 text-foreground shadow-2xl shadow-navy/30 motion-safe:animate-rise motion-safe:[animation-delay:160ms] md:p-5">
          {marketplaceOpen ? (
            <SearchForm places={places} minDay={minDay} layout="bar" action={`/${locale}/search`} />
          ) : (
            <p className="text-secondary">{t('hero.closed')}</p>
          )}
        </div>
        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-muted">
          {(['licensed', 'fixedPrice', 'cancellation'] as const).map((key) => (
            <li key={key} className="flex items-center gap-2">
              <BadgeCheck aria-hidden="true" className="size-4 text-secondary" />
              {t(`reassurance.${key}.title`)}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
