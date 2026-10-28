import { CalendarDays, MapPin } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

// Itinerary ideas (content only): prices are given on quote, never invented (CLAUDE.md rule 13).
const TOUR_IDEAS = ['desert', 'imperial', 'ourika', 'essaouira'] as const;
const HOURLY_IDEAS = ['halfDay', 'fullDay', 'events'] as const;

/** Ideas of organized tours and chauffeur hire, each leading to a quote request. */
export async function ToursSection() {
  const t = await getTranslations('home.tours');
  return (
    <section aria-labelledby="tours-title" className="bg-navy py-16 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-[2fr_1fr]">
        <div>
          <h2 id="tours-title" className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            {t('title')}
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {TOUR_IDEAS.map((idea) => (
              <li key={idea} className="flex flex-col gap-2 rounded-card bg-white/10 p-5">
                <h3 className="font-bold text-white">{t(`ideas.${idea}.title`)}</h3>
                <p className="flex items-center gap-2 text-sm text-white/85">
                  <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
                  {t(`ideas.${idea}.duration`)}
                </p>
                <p className="flex items-start gap-2 text-sm text-white/85">
                  <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  {t(`ideas.${idea}.stops`)}
                </p>
                <p className="mt-auto pt-2 text-sm font-semibold text-teal">{t('onQuote')}</p>
              </li>
            ))}
          </ul>
          <Link
            href="/quote?type=tour"
            className={buttonVariants({ size: 'lg', className: 'mt-8' })}
          >
            {t('tourCta')}
          </Link>
        </div>
        <div className="flex flex-col gap-4 rounded-card bg-white/10 p-6">
          <h3 className="text-xl font-bold text-white">{t('hourlyTitle')}</h3>
          <p className="text-sm text-white/85">{t('hourlyText')}</p>
          <ul className="flex flex-col gap-3">
            {HOURLY_IDEAS.map((idea) => (
              <li key={idea} className="border-s-2 border-teal ps-3 text-sm">
                <span className="block font-semibold text-white">{t(`hourly.${idea}.title`)}</span>
                <span className="block text-white/80">{t(`hourly.${idea}.text`)}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/quote?type=hourly"
            className={buttonVariants({ variant: 'outline', className: 'mt-auto self-start' })}
          >
            {t('hourlyCta')}
          </Link>
        </div>
      </div>
    </section>
  );
}
