import { ArrowRight, CalendarDays, Car, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Card, CardTitle } from '@/components/ui/card';

interface BookingSummaryProps {
  from: string;
  to: string;
  /** Already formatted pickup date and time. */
  pickup: string;
  vehicleType: string;
  passengers: number;
  carrierName: string;
  /** Already formatted price. */
  price: string;
  acceptHours: number;
}

function Detail({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-muted">
      <span className="mt-0.5 shrink-0 text-secondary [&_svg]:size-4">{icon}</span>
      <span>{children}</span>
    </li>
  );
}

/** Booking recap: what, when, who and how much, before the traveler fills the form. */
export function BookingSummary({
  from,
  to,
  pickup,
  vehicleType,
  passengers,
  carrierName,
  price,
  acceptHours,
}: BookingSummaryProps) {
  const t = useTranslations('book');

  return (
    <Card className="flex flex-col gap-4 lg:sticky lg:top-6">
      <CardTitle>{t('summary')}</CardTitle>
      <p className="font-heading text-lg font-semibold text-primary">
        <span className="sr-only">{t('route', { from, to })}</span>
        <span aria-hidden="true" className="flex flex-wrap items-center gap-x-2">
          {from}
          <ArrowRight className="size-4 shrink-0 text-secondary rtl:rotate-180" />
          {to}
        </span>
      </p>
      <ul className="flex flex-col gap-2">
        <Detail icon={<CalendarDays aria-hidden="true" />}>{pickup}</Detail>
        <Detail icon={<Car aria-hidden="true" />}>
          {vehicleType} · {t('passengers', { count: passengers })}
        </Detail>
        <Detail icon={<ShieldCheck aria-hidden="true" />}>
          {t('carrier', { name: carrierName })}
        </Detail>
      </ul>
      <div className="border-t border-border pt-4">
        <p className="text-2xl font-bold text-primary">{price}</p>
        <p className="mt-1 text-xs text-muted">{t('priceNote')}</p>
      </div>
      <p className="rounded-control bg-background p-3 text-xs text-muted">
        {t('acceptNote', { hours: acceptHours })}
      </p>
    </Card>
  );
}
