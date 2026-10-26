import { addDays, casablancaDate, casablancaStartOfDay, isIsoDay, startOfWeek } from '@mtr/shared';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getListAccess } from '@/features/fleet/access';
import { FeatureGate } from '@/features/subscriptions/feature-gate';
import { TripCard } from '@/features/trips/components/trip-card';
import { getPlanningTrips, type TripRow } from '@/features/trips/queries';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export async function generateMetadata() {
  const t = await getTranslations('planning');
  return { title: t('title') };
}

interface PlanningPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ view?: string; date?: string }>;
}

export default async function PlanningPage({ params, searchParams }: PlanningPageProps) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const query = await searchParams;
  const view = query.view === 'day' ? 'day' : 'week';
  const today = casablancaDate();
  const date = isIsoDay(query.date) ? query.date : today;
  const [t, format, access] = await Promise.all([
    getTranslations(),
    getFormatter(),
    getListAccess('trips.read', 'trips.manage'),
  ]);
  if (!access) return <Alert>{t('lists.forbidden')}</Alert>;

  const firstDay = view === 'week' ? startOfWeek(date) : date;
  const length = view === 'week' ? 7 : 1;
  const days = Array.from({ length }, (_, index) => addDays(firstDay, index));
  const trips = await getPlanningTrips(
    access.companyId,
    casablancaStartOfDay(firstDay),
    casablancaStartOfDay(addDays(firstDay, length)),
  );
  const byDay = new Map<string, TripRow[]>(days.map((day) => [day, []]));
  for (const trip of trips) byDay.get(casablancaDate(new Date(trip.starts_at)))?.push(trip);

  const href = (target: string, targetView = view) =>
    `/app/planning?view=${targetView}&date=${target}`;
  const dayLabel = (day: string, style: 'full' | 'short') =>
    format.dateTime(new Date(`${day}T12:00:00Z`), {
      weekday: style === 'full' ? 'long' : 'short',
      day: 'numeric',
      month: style === 'full' ? 'long' : 'short',
      timeZone: 'UTC',
    });

  return (
    <FeatureGate feature="trips">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{t('planning.title')}</h1>
          {access.canManage ? (
            <Link href={`/app/trips/new?date=${date}`} className={buttonVariants()}>
              <Plus aria-hidden="true" />
              {t('trips.new')}
            </Link>
          ) : null}
        </div>

        <nav aria-label={t('planning.navigation')} className="flex flex-wrap items-center gap-2">
          <Link
            href={href(addDays(firstDay, -length))}
            className={buttonVariants({ variant: 'outline', size: 'icon' })}
            aria-label={t('planning.previous')}
          >
            <ChevronLeft aria-hidden="true" className="rtl:rotate-180" />
          </Link>
          <Link href={href(today)} className={buttonVariants({ variant: 'outline' })}>
            {t('planning.today')}
          </Link>
          <Link
            href={href(addDays(firstDay, length))}
            className={buttonVariants({ variant: 'outline', size: 'icon' })}
            aria-label={t('planning.next')}
          >
            <ChevronRight aria-hidden="true" className="rtl:rotate-180" />
          </Link>
          <p className="mx-2 font-semibold">
            {view === 'day'
              ? dayLabel(date, 'full')
              : t('planning.weekOf', { day: dayLabel(firstDay, 'full') })}
          </p>
          <div className="ms-auto flex gap-1" role="group" aria-label={t('planning.view')}>
            {(['day', 'week'] as const).map((option) => (
              <Link
                key={option}
                href={href(date, option)}
                aria-current={option === view ? 'page' : undefined}
                className={cn(
                  buttonVariants({ variant: option === view ? 'secondary' : 'outline' }),
                )}
              >
                {t(`planning.views.${option}`)}
              </Link>
            ))}
          </div>
        </nav>

        {view === 'week' ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
            {days.map((day) => (
              <section
                key={day}
                aria-label={dayLabel(day, 'full')}
                className={cn(
                  'flex min-h-32 flex-col gap-2 rounded-card border border-border bg-surface p-2',
                  day === today && 'border-secondary',
                )}
              >
                <Link href={href(day, 'day')} className="text-sm font-semibold underline">
                  {dayLabel(day, 'short')}
                </Link>
                {byDay.get(day)!.length === 0 ? (
                  <p className="text-xs text-muted">{t('planning.noTrip')}</p>
                ) : (
                  byDay.get(day)!.map((trip) => <TripCard key={trip.id} trip={trip} compact />)
                )}
              </section>
            ))}
          </div>
        ) : (
          <DayByDriver
            trips={byDay.get(date)!}
            unassigned={t('tripForm.unassigned')}
            empty={t('planning.noTrip')}
          />
        )}
      </div>
    </FeatureGate>
  );
}

/** Day view: one lane per driver, unassigned trips first so they are not forgotten. */
function DayByDriver({
  trips,
  unassigned,
  empty,
}: {
  trips: TripRow[];
  unassigned: string;
  empty: string;
}) {
  if (trips.length === 0) return <Card className="text-sm text-muted">{empty}</Card>;
  const lanes = new Map<string, { name: string; trips: TripRow[] }>();
  for (const trip of trips) {
    const key = trip.driver_id ?? '';
    const lane = lanes.get(key) ?? { name: trip.driver?.full_name ?? unassigned, trips: [] };
    lane.trips.push(trip);
    lanes.set(key, lane);
  }
  const ordered = [...lanes.entries()].sort(([a, laneA], [b, laneB]) =>
    a === '' ? -1 : b === '' ? 1 : laneA.name.localeCompare(laneB.name),
  );
  return (
    <div className="flex flex-col gap-4">
      {ordered.map(([key, lane]) => (
        <section key={key || 'unassigned'} className="flex flex-col gap-2">
          <h2 className="font-semibold">{lane.name}</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {lane.trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
