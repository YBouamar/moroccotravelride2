import type { TripStatus } from '@mtr/shared';
import { ArrowRight } from 'lucide-react';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { TripRow } from '../queries';

const STATUS_STYLE: Record<TripStatus, string> = {
  planned: 'border-s-border',
  assigned: 'border-s-secondary',
  in_progress: 'border-s-accent',
  completed: 'border-s-navy',
  cancelled: 'border-s-danger opacity-70',
};

export async function TripStatusBadge({ status }: { status: TripStatus }) {
  const t = await getTranslations('tripStatus');
  return (
    <Badge variant={status === 'assigned' || status === 'in_progress' ? 'verified' : 'neutral'}>
      {t(status)}
    </Badge>
  );
}

/** Compact trip summary for the planning views and the dashboard (Morocco time). */
export async function TripCard({ trip, compact = false }: { trip: TripRow; compact?: boolean }) {
  const [t, format, locale] = await Promise.all([getTranslations(), getFormatter(), getLocale()]);
  const name = (city: { name_fr: string; name_en: string; name_ar: string } | null) =>
    city ? city[`name_${locale as 'fr' | 'en' | 'ar'}`] : '';
  // 24-hour clock: no AM/PM marker to mix with Latin digits in Arabic.
  const time = (value: string) =>
    format.dateTime(new Date(value), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

  return (
    <Link
      href={`/app/trips/${trip.id}`}
      className={cn(
        'block min-w-0 rounded-control border border-border border-s-4 bg-surface p-3 text-sm break-words hover:bg-background',
        STATUS_STYLE[trip.status],
      )}
    >
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span dir="ltr" className="font-semibold">
          {time(trip.starts_at)} - {time(trip.ends_at)}
        </span>
        {compact ? null : <TripStatusBadge status={trip.status} />}
      </span>
      <span className="mt-1 block">
        {name(trip.pickup)}{' '}
        <ArrowRight aria-hidden="true" className="inline size-3 rtl:rotate-180" />
        <span className="sr-only">{t('tripForm.to')}</span> {name(trip.dropoff)}
      </span>
      <span className="mt-1 block text-muted">
        {trip.passenger_name} · {t('tripForm.seats', { seats: trip.passengers })}
      </span>
      {compact ? null : (
        <span className="mt-1 block text-muted">
          {trip.driver?.full_name ?? t('tripForm.unassigned')}
          {trip.vehicle ? (
            <>
              {' · '}
              <span dir="ltr">{trip.vehicle.registration}</span>
            </>
          ) : null}
        </span>
      )}
    </Link>
  );
}
