import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DataTable, type Column } from '@/components/list/data-table';
import { ListToolbar } from '@/components/list/list-toolbar';
import { hrefWith, Pagination } from '@/components/list/pagination';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { getListAccess, readListParams, type ListSearchParams } from '@/features/fleet/access';
import { CLIENT_FILTERS, SORTS } from '@/features/fleet/constants';
import { listClients } from '@/features/fleet/queries';
import { FeatureGate } from '@/features/subscriptions/feature-gate';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';

export async function generateMetadata() {
  const t = await getTranslations('clients');
  return { title: t('title') };
}

interface ClientsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: ListSearchParams;
}

export default async function ClientsPage({ params, searchParams }: ClientsPageProps) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const [t, access, query] = await Promise.all([
    getTranslations(),
    getListAccess('clients.read', 'clients.manage'),
    readListParams(searchParams),
  ]);
  if (!access) return <Alert>{t('lists.forbidden')}</Alert>;

  const { rows, total } = await listClients(access.companyId, query);
  const filters = { q: query.q, status: query.status, sort: query.sort };

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: 'name',
      header: t('clientForm.name'),
      cell: (row) => (
        <Link href={`/app/clients/${row.id}`} className="font-medium text-secondary underline">
          {row.name}
        </Link>
      ),
    },
    { key: 'type', header: t('clientForm.type'), cell: (row) => t(`clientType.${row.type}`) },
    { key: 'ice', header: t('clientForm.ice'), cell: (row) => <span dir="ltr">{row.ice}</span> },
    {
      key: 'contact',
      header: t('clients.contact'),
      cell: (row) => <span dir="ltr">{[row.email, row.phone].filter(Boolean).join(' · ')}</span>,
    },
    {
      key: 'status',
      header: t('lists.status'),
      cell: (row) => (
        <Badge variant={row.is_active ? 'verified' : 'neutral'}>
          {t(`clientStatus.${row.is_active ? 'active' : 'inactive'}`)}
        </Badge>
      ),
    },
  ];

  return (
    <FeatureGate feature="clients">
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold">{t('clients.title')}</h1>
        <ListToolbar
          basePath="/app/clients"
          {...filters}
          statuses={CLIENT_FILTERS.map((value) => ({ value, label: t(`clientStatus.${value}`) }))}
          sorts={Object.keys(SORTS.clients).map((value) => ({
            value,
            label: t(`lists.sorts.${value as keyof typeof SORTS.clients}`),
          }))}
          exportHref={hrefWith('/api/export/clients', { ...filters, locale })}
          newHref={access.canManage ? '/app/clients/new' : undefined}
          newLabel={t('clients.new')}
        />
        <DataTable
          columns={columns}
          rows={rows}
          empty={t('lists.empty')}
          caption={t('clients.title')}
        />
        <Pagination basePath="/app/clients" params={filters} page={query.page} total={total} />
      </div>
    </FeatureGate>
  );
}
