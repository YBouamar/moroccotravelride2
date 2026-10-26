import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DataTable, type Column } from '@/components/list/data-table';
import { ListToolbar } from '@/components/list/list-toolbar';
import { hrefWith, Pagination } from '@/components/list/pagination';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { getListAccess, readListParams, type ListSearchParams } from '@/features/fleet/access';
import { SORTS, VEHICLE_STATUSES } from '@/features/fleet/constants';
import { listVehicles } from '@/features/fleet/queries';
import { getVehicleTypeOptions } from '@/features/reference/queries';
import { FeatureGate } from '@/features/subscriptions/feature-gate';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';

export async function generateMetadata() {
  const t = await getTranslations('fleet');
  return { title: t('title') };
}

interface FleetPageProps {
  params: Promise<{ locale: string }>;
  searchParams: ListSearchParams;
}

export default async function FleetPage({ params, searchParams }: FleetPageProps) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const [t, access, query] = await Promise.all([
    getTranslations(),
    getListAccess('vehicles.read', 'vehicles.manage'),
    readListParams(searchParams),
  ]);
  if (!access) return <Alert>{t('lists.forbidden')}</Alert>;

  const [{ rows, total }, types] = await Promise.all([
    listVehicles(access.companyId, query),
    getVehicleTypeOptions(locale),
  ]);
  const typeName = new Map(types.map((type) => [type.id, type.name]));
  const filters = { q: query.q, status: query.status, sort: query.sort };

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: 'registration',
      header: t('vehicleForm.registration'),
      cell: (row) => (
        <Link href={`/app/fleet/${row.id}`} className="font-medium text-secondary underline">
          <span dir="ltr">{row.registration}</span>
        </Link>
      ),
    },
    { key: 'model', header: t('fleet.vehicle'), cell: (row) => `${row.brand} ${row.model}` },
    {
      key: 'type',
      header: t('vehicleForm.type'),
      cell: (row) => typeName.get(row.vehicle_type_code) ?? row.vehicle_type_code,
    },
    { key: 'seats', header: t('vehicleForm.seats'), cell: (row) => row.seats },
    {
      key: 'status',
      header: t('lists.status'),
      cell: (row) => (
        <Badge variant={row.status === 'active' ? 'verified' : 'neutral'}>
          {t(`vehicleStatus.${row.status}`)}
        </Badge>
      ),
    },
  ];

  return (
    <FeatureGate feature="vehicles">
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold">{t('fleet.title')}</h1>
        <ListToolbar
          basePath="/app/fleet"
          {...filters}
          statuses={VEHICLE_STATUSES.map((value) => ({
            value,
            label: t(`vehicleStatus.${value}`),
          }))}
          sorts={Object.keys(SORTS.vehicles).map((value) => ({
            value,
            label: t(`lists.sorts.${value as keyof typeof SORTS.vehicles}`),
          }))}
          exportHref={hrefWith('/api/export/vehicles', { ...filters, locale })}
          newHref={access.canManage ? '/app/fleet/new' : undefined}
          newLabel={t('fleet.new')}
        />
        <DataTable
          columns={columns}
          rows={rows}
          empty={t('lists.empty')}
          caption={t('fleet.title')}
        />
        <Pagination basePath="/app/fleet" params={filters} page={query.page} total={total} />
      </div>
    </FeatureGate>
  );
}
