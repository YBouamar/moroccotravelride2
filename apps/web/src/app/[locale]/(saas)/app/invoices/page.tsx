import { can, formatMoney, INVOICE_STATUSES, parsePage } from '@mtr/shared';
import { Search } from 'lucide-react';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { DataTable, type Column } from '@/components/list/data-table';
import { Pagination } from '@/components/list/pagination';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { getListAccess, type ListSearchParams } from '@/features/fleet/access';
import { DefaultVatForm, NewInvoiceForm } from '@/features/invoices/components/invoice-forms';
import { InvoiceStatusBadge } from '@/features/invoices/components/invoice-sections';
import {
  getCompanyInvoiceSettings,
  getInvoiceClients,
  listInvoices,
} from '@/features/invoices/queries';
import { vatInput } from '@/features/invoices/format';
import { FeatureGate } from '@/features/subscriptions/feature-gate';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';

export async function generateMetadata() {
  const t = await getTranslations('invoices');
  return { title: t('title') };
}

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) || undefined;

export default async function InvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: ListSearchParams;
}) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const raw = await searchParams;
  const filters = { q: first(raw.q), status: first(raw.status) };
  const page = parsePage(first(raw.page));
  const [t, format, access] = await Promise.all([
    getTranslations(),
    getFormatter(),
    getListAccess('invoices.read', 'invoices.manage'),
  ]);
  if (!access) return <Alert>{t('lists.forbidden')}</Alert>;
  const [{ rows, total }, clients, settings] = await Promise.all([
    listInvoices(access.companyId, { ...filters, page }),
    access.canManage ? getInvoiceClients(access.companyId) : Promise.resolve([]),
    getCompanyInvoiceSettings(access.companyId),
  ]);
  const canSetVat =
    can(access.context.membership.role, 'company.update') && access.context.canWrite;

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: 'number',
      header: t('invoices.columns.number'),
      cell: (row) => (
        <Link href={`/app/invoices/${row.id}`} className="font-medium text-secondary underline">
          {row.number ?? t('invoices.draftLabel')}
        </Link>
      ),
    },
    { key: 'client', header: t('invoices.client'), cell: (row) => row.client?.name ?? '' },
    {
      key: 'date',
      header: t('invoices.columns.issueDate'),
      cell: (row) =>
        row.issue_date
          ? format.dateTime(new Date(`${row.issue_date}T12:00:00Z`), {
              dateStyle: 'medium',
              timeZone: 'UTC',
            })
          : '',
    },
    {
      key: 'total',
      header: t('invoices.totals.total'),
      cell: (row) => formatMoney(row.total_cents, locale),
    },
    {
      key: 'paid',
      header: t('invoices.columns.paid'),
      cell: (row) => formatMoney(row.paid_cents, locale),
    },
    {
      key: 'status',
      header: t('lists.status'),
      cell: (row) => <InvoiceStatusBadge status={row.status} />,
    },
  ];

  return (
    <FeatureGate feature="invoicing">
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold">{t('invoices.title')}</h1>
        {access.canManage ? (
          <Card className="flex flex-col gap-4">
            <CardTitle>{t('invoices.newTitle')}</CardTitle>
            {clients.length ? (
              <NewInvoiceForm clients={clients} />
            ) : (
              <p className="text-sm text-muted">{t('invoices.noClient')}</p>
            )}
            {settings &&
            (!settings.ice || !settings.if_number || !settings.rc_number || !settings.address) ? (
              <Alert tone="danger">{t('onboarding.errors.sellerIncomplete')}</Alert>
            ) : null}
            {canSetVat ? (
              <DefaultVatForm initial={vatInput(settings?.default_vat_rate ?? null)} />
            ) : null}
          </Card>
        ) : null}
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t('lists.search')}
            <Input type="search" name="q" defaultValue={filters.q} className="sm:w-56" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t('lists.status')}
            <Select name="status" defaultValue={filters.status ?? ''} className="sm:w-48">
              <option value="">{t('lists.all')}</option>
              {INVOICE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`invoiceStatus.${status}`)}
                </option>
              ))}
            </Select>
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
          caption={t('invoices.title')}
        />
        <Pagination basePath="/app/invoices" params={filters} page={page} total={total} />
      </div>
    </FeatureGate>
  );
}
