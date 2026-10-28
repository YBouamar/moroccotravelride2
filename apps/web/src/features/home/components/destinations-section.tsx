import { formatMoney } from '@mtr/shared';
import Image from 'next/image';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { cityPhoto, hasCityPhoto } from '../photos';

interface DestinationsSectionProps {
  locale: Locale;
  cities: { id: string; slug: string; name: string }[];
  cityMinPrice: (cityId: string) => number | undefined;
}

/** Destination cards with photos and the real lowest transfer price of each city. */
export async function DestinationsSection({
  locale,
  cities,
  cityMinPrice,
}: DestinationsSectionProps) {
  const t = await getTranslations('home.destinations');
  // Cities with transfers on sale first (cheapest first, the first one is featured), then cities
  // with a photo, then the others (new cities added by the admin).
  const rank = (city: { id: string; slug: string }) => [
    cityMinPrice(city.id) ?? Number.MAX_SAFE_INTEGER,
    hasCityPhoto(city.slug) ? 0 : 1,
  ];
  const ordered = [...cities].sort((a, b) => {
    const [priceA = 0, photoA = 0] = rank(a);
    const [priceB = 0, photoB = 0] = rank(b);
    return priceA - priceB || photoA - photoB;
  });

  return (
    <section aria-labelledby="destinations-title" className="bg-surface py-16">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-sm font-semibold tracking-wide text-secondary uppercase">
          {t('eyebrow')}
        </p>
        <h2 id="destinations-title" className="mt-2 text-2xl font-bold md:text-3xl">
          {t('title')}
        </h2>
        <p className="mt-2 max-w-2xl text-muted">{t('subtitle')}</p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ordered.map((city, index) => {
            const price = cityMinPrice(city.id);
            return (
              <li key={city.id} className={index === 0 ? 'sm:col-span-2 lg:row-span-2' : ''}>
                <Link
                  href={`/transfers/${city.slug}`}
                  className="group relative flex h-full min-h-56 overflow-hidden rounded-card"
                >
                  <Image
                    src={cityPhoto(city.slug)}
                    alt=""
                    fill
                    sizes={
                      index === 0
                        ? '(min-width: 1024px) 66vw, 100vw'
                        : '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'
                    }
                    placeholder="blur"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Navy gradient: white text keeps its contrast whatever the photo. */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-linear-to-t from-navy/90 via-navy/30 to-transparent"
                  />
                  <div className="relative mt-auto flex flex-col gap-1 p-5 text-white">
                    <h3 className="text-xl font-bold text-white">{city.name}</h3>
                    <p className="text-sm text-white/90">
                      {price !== undefined
                        ? t('fromPrice', { price: formatMoney(price, locale) })
                        : t('noPrice')}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
