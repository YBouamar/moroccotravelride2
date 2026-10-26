import { casablancaDate, isDocumentValidOn } from '@mtr/shared';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { DataTable, type Column } from '@/components/list/data-table';
import { ListToolbar } from '@/components/list/list-toolbar';
import { hrefWith, Pagination } from '@/components/list/pagination';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { getListAccess, readListParams, type ListSearchParams } from '@/features/fleet/access';
import { DRIVER_STATUSES, SORTS } from '@/features/fleet/constants';
import { listDrivers } from '@/features/fleet/queries';
import { FeatureGate } from '@/features/subscriptions/feature-gate';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';

export async function generateMetadata() {
  const t = await getTranslations('drivers');
  return { title: t('title') };
}

interface DriversPageProps {
  params: Promise<{ locale: string }>;
  searchParams: ListSearchParams;
}

export default async function DriversPage({ params, searchParams }: DriversPageProps) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const [t, format, access, query] = await Promise.all([
    getTranslations(),
    getFormatter(),
    getListAccess('drivers.read', 'drivers.manage'),
    readListParams(searchParams),
  ]);
  if (!access) return <Alert>{t('lists.forbidden')}</Alert>;

  const { rows, total } = await listDrivers(access.companyId, query);
  const today = casablancaDate();
  const filters = { q: query.q, status: query.status, sort: query.sort };

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: 'name',
      header: t('driverForm.fullName'),
      cell: (row) => (
        <Link href={`/app/drivers/${row.id}`} className="font-medium text-secondary underline">
          {row.full_name}
        </Link>
      ),
    },
    {
      key: 'phone',
      header: t('driverForm.phone'),
      cell: (row) => <span dir="ltr">{row.phone}</span>,
    },
    {
      key: 'license',
      header: t('drivers.license'),
      cell: (row) => (
        <span className="flex flex-wrap items-center gap-2">
          {/* Dates without time: format at noon UTC so no timezone can shift the day. */}
          {format.dateTime(new Date(`${row.license_expires_on}T12:00:00Z`), {
            dateStyle: 'medium',
          })}
          {!isDocumentValidOn(row.license_expires_on, today) ? (
            <Badge>{t('driverForm.licenseExpired')}</Badge>
          ) : null}
        </span>
      ),
    },
    {
      key: 'languages',
      header: t('driverForm.languages'),
      cell: (row) =>
        row.languages.map((code) => t(`languages.${code}` as 'languages.fr')).join(', '),
    },
    {
      key: 'status',
      header: t('lists.status'),
      cell: (row) => (
        <Badge variant={row.status === 'active' ? 'verified' : 'neutral'}>
          {t(`driverStatus.${row.status}`)}
        </Badge>
      ),
    },
  ];

  return (
    <FeatureGate feature="drivers">
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold">{t('drivers.title')}</h1>
        <ListToolbar
          basePath="/app/drivers"
          {...filters}
          statuses={DRIVER_STATUSES.map((value) => ({ value, label: t(`driverStatus.${value}`) }))}
          sorts={Object.keys(SORTS.drivers).map((value) => ({
            value,
            label: t(`lists.sorts.${value as keyof typeof SORTS.drivers}`),
          }))}
          exportHref={hrefWith('/api/export/drivers', { ...filters, locale })}
          newHref={access.canManage ? '/app/drivers/new' : undefined}
          newLabel={t('drivers.new')}
        />
        <DataTable
          columns={columns}
          rows={rows}
          empty={t('lists.empty')}
          caption={t('drivers.title')}
        />
        <Pagination basePath="/app/drivers" params={filters} page={query.page} total={total} />
      </div>
    </FeatureGate>
  );
}
