import { BadgeCheck } from 'lucide-react';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { SearchForm } from '@/features/search/components/search-form';
import { HeroParallax } from './hero-parallax';
import { HERO_PHOTO } from '../photos';

interface HeroSectionProps {
  locale: string;
  places: { id: string; name: string; isAirport: boolean }[];
  minDay: string;
  marketplaceOpen: boolean;
}

/** Full-bleed Sahara photo, text on the shaded start side, search as a single white bar. */
export async function HeroSection({ locale, places, minDay, marketplaceOpen }: HeroSectionProps) {
  const t = await getTranslations('home');

  return (
    <section className="relative isolate overflow-hidden bg-navy text-white">
      <HeroParallax>
        <Image
          src={HERO_PHOTO}
          alt=""
          fill
          priority
          sizes="100vw"
          placeholder="blur"
          className="object-cover"
        />
      </HeroParallax>
      {/* Shade only the text side so the dunes stay visible; mirrored in RTL. Full shade on mobile. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-navy/60 md:bg-transparent md:bg-linear-to-r md:from-navy/95 md:via-navy/65 md:to-navy/10 md:rtl:bg-linear-to-l"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-linear-to-t from-navy/80 to-transparent"
      />

      <div className="mx-auto max-w-6xl px-4 pt-10 pb-10 md:pt-32 md:pb-16">
        <h1 className="max-w-4xl text-4xl leading-[1.05] font-bold tracking-tight text-balance text-white motion-safe:animate-rise md:text-6xl">
          {t('hero.title')}
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/85 motion-safe:animate-rise motion-safe:[animation-delay:80ms]">
          {t('hero.subtitle')}
        </p>

        <div className="mt-10 rounded-card bg-surface p-4 text-foreground shadow-2xl shadow-navy/50 motion-safe:animate-rise motion-safe:[animation-delay:160ms] md:mt-14 md:p-5">
          {marketplaceOpen ? (
            <SearchForm places={places} minDay={minDay} layout="bar" action={`/${locale}/search`} />
          ) : (
            <p className="text-secondary">{t('hero.closed')}</p>
          )}
        </div>

        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/85 motion-safe:animate-rise motion-safe:[animation-delay:240ms]">
          {(['licensed', 'fixedPrice', 'cancellation'] as const).map((key) => (
            <li key={key} className="flex items-center gap-2">
              <BadgeCheck aria-hidden="true" className="size-4 text-teal" />
              {t(`reassurance.${key}.title`)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
