import { BadgeCheck, Star, Users } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import type { Offer } from '../queries';
import { vehiclePhoto } from '../vehicle-photos';

interface OfferCardProps {
  offer: Offer;
  /** Already formatted price. */
  price: string;
  href: string;
  /** First result of several (they come sorted by price). */
  cheapest: boolean;
}

/** One search result: vehicle type photo, carrier, capacity, price and the booking link. */
export function OfferCard({ offer, price, href, cheapest }: OfferCardProps) {
  const t = useTranslations('search');

  return (
    <Card className="grid overflow-hidden p-0 sm:grid-cols-[13rem_1fr] md:grid-cols-[15rem_1fr_12rem]">
      <div className="relative aspect-[2/1] sm:aspect-auto sm:min-h-40">
        <Image
          src={vehiclePhoto(offer.vehicleTypeCode)}
          alt=""
          fill
          sizes="(min-width: 768px) 15rem, (min-width: 640px) 13rem, 100vw"
          placeholder="blur"
          className="object-cover"
        />
        {cheapest ? (
          <span className="absolute start-3 top-3 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white">
            {t('cheapest')}
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-2 p-5">
        <h2 className="text-xl font-semibold text-primary">{offer.vehicleType}</h2>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <BadgeCheck aria-hidden="true" className="size-4 shrink-0 text-secondary" />
          {t('carrier', { name: offer.carrierName })}
        </p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <Users aria-hidden="true" className="size-4 shrink-0 text-secondary" />
            {t('seatsUpTo', { seats: offer.maxSeats })}
          </span>
          {offer.rating ? (
            <span className="flex items-center gap-1.5">
              <Star aria-hidden="true" className="size-4 shrink-0 fill-accent text-secondary" />
              {t('rating', { average: offer.rating.average, count: offer.rating.reviews })}
            </span>
          ) : null}
        </p>
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-border p-5 sm:col-span-2 md:col-span-1 md:flex-col md:items-end md:justify-center md:border-s md:border-t-0">
        <div className="md:text-end">
          <p className="text-2xl font-bold text-primary">{price}</p>
          <p className="text-xs text-muted">{t('allInclusive')}</p>
        </div>
        <Link href={href} className={buttonVariants()}>
          {t('book')}
        </Link>
      </div>
    </Card>
  );
}
