import {
  addDays,
  casablancaStartOfDay,
  formatMoney,
  isIsoDay,
  parsePage,
  TRIP_STATUSES,
} from '@mtr/shared';
import { Plus, Search } from 'lucide-react';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { DataTable, type Column } from '@/components/list/data-table';
import { Pagination } from '@/components/list/pagination';
import { Alert } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { getListAccess, type ListSearchParams } from '@/features/fleet/access';
import { FeatureGate } from '@/features/subscriptions/feature-gate';
import { TripStatusBadge } from '@/features/trips/components/trip-card';
import { listTrips } from '@/features/trips/queries';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';

export async function generateMetadata() {
  const t = await getTranslations('trips');
  return { title: t('title') };
}

interface TripsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: ListSearchParams;
}

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) || undefined;

export default async function TripsPage({ params, searchParams }: TripsPageProps) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const raw = await searchParams;
  const filters = {
    q: first(raw.q),
    status: first(raw.status),
    from: isIsoDay(first(raw.from)) ? first(raw.from) : undefined,
    to: isIsoDay(first(raw.to)) ? first(raw.to) : undefined,
  };
  const page = parsePage(first(raw.page));
  const [t, format, access] = await Promise.all([
    getTranslations(),
    getFormatter(),
    getListAccess('trips.read', 'trips.manage'),
  ]);
  if (!access) return <Alert>{t('lists.forbidden')}</Alert>;

  // Morocco days to UTC bounds: from the start of `from` to the end of `to`.
  const { rows, total } = await listTrips(access.companyId, {
    q: filters.q,
    status: filters.status,
    from: filters.from ? casablancaStartOfDay(filters.from) : undefined,
    to: filters.to ? casablancaStartOfDay(addDays(filters.to, 1)) : undefined,
    page,
  });

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: 'date',
      header: t('trips.columns.date'),
      cell: (row) => (
        <Link href={`/app/trips/${row.id}`} className="font-medium text-secondary underline">
          {format.dateTime(new Date(row.starts_at), { dateStyle: 'medium', timeStyle: 'short' })}
        </Link>
      ),
    },
    { key: 'passenger', header: t('tripForm.passengerName'), cell: (row) => row.passenger_name },
    {
      key: 'route',
      header: t('trips.columns.route'),
      cell: (row) =>
        `${row.pickup?.[`name_${locale}`] ?? ''} / ${row.dropoff?.[`name_${locale}`] ?? ''}`,
    },
    {
      key: 'driver',
      header: t('tripForm.driver'),
      cell: (row) => row.driver?.full_name ?? t('tripForm.unassigned'),
    },
    {
      key: 'price',
      header: t('tripForm.price'),
      cell: (row) => (row.price_cents === null ? '' : formatMoney(row.price_cents, locale)),
    },
    {
      key: 'status',
      header: t('lists.status'),
      cell: (row) => <TripStatusBadge status={row.status} />,
    },
  ];

  return (
    <FeatureGate feature="trips">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{t('trips.title')}</h1>
          {access.canManage ? (
            <Link href="/app/trips/new" className={buttonVariants()}>
              <Plus aria-hidden="true" />
              {t('trips.new')}
            </Link>
          ) : null}
        </div>
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t('lists.search')}
            <Input type="search" name="q" defaultValue={filters.q} className="sm:w-56" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t('lists.status')}
            <Select name="status" defaultValue={filters.status ?? ''} className="sm:w-44">
              <option value="">{t('lists.all')}</option>
              {TRIP_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`tripStatus.${status}`)}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t('trips.from')}
            <Input type="date" name="from" defaultValue={filters.from} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t('trips.to')}
            <Input type="date" name="to" defaultValue={filters.to} />
          </label>
          <Button type="submit" variant="secondary">
            <Search aria-hidden="true" />
            {t('lists.apply')}
          </Button>
        </form>
        <DataTable
          columns={columns}
          rows={rows}
          empty={t('lists.empty')}
          caption={t('trips.title')}
        />
        <Pagination basePath="/app/trips" params={filters} page={page} total={total} />
      </div>
    </FeatureGate>
  );
}
