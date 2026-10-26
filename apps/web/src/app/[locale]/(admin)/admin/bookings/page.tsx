import { BOOKING_STATUSES, formatMoney, parsePage } from '@mtr/shared';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { DataTable, type Column } from '@/components/list/data-table';
import { Pagination } from '@/components/list/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { listAllBookings } from '@/features/commissions/queries';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';

export async function generateMetadata() {
  const t = await getTranslations('admin.bookings');
  return { title: t('title') };
}

/**
 * Supervision of marketplace bookings (step 17): refused or expired bookings show the traveler's
 * contact so that the platform can offer another carrier (manual reassignment, BACKLOG).
 */
export default async function AdminBookingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const query = await searchParams;
  const status = (BOOKING_STATUSES as readonly string[]).includes(query.status ?? '')
    ? query.status
    : undefined;
  const page = parsePage(query.page);
  const [t, format, { rows, total }] = await Promise.all([
    getTranslations(),
    getFormatter(),
    listAllBookings({ status, page }),
  ]);

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: 'ref',
      header: t('admin.bookings.ref'),
      cell: (row) => <span dir="ltr">{row.public_ref}</span>,
    },
    {
      key: 'pickup',
      header: t('admin.bookings.pickup'),
      cell: (row) =>
        format.dateTime(new Date(row.pickup_at), { dateStyle: 'medium', timeStyle: 'short' }),
    },
    {
      key: 'carrier',
      header: t('admin.bookings.carrier'),
      cell: (row) => (
        <Link href={`/admin/companies/${row.company?.id}`} className="underline">
          {row.company?.trade_name ?? row.company?.legal_name}
        </Link>
      ),
    },
    {
      key: 'traveler',
      header: t('admin.bookings.traveler'),
      cell: (row) => (
        <span className="flex flex-col">
          <span>{row.traveler_name}</span>
          <span dir="ltr" className="text-xs text-muted">
            {row.traveler_email} · {row.traveler_phone}
          </span>
        </span>
      ),
    },
    {
      key: 'amounts',
      header: t('admin.bookings.amounts'),
      cell: (row) =>
        `${formatMoney(row.total_cents, locale)} / ${formatMoney(row.commission_cents, locale)}`,
    },
    {
      key: 'status',
      header: t('lists.status'),
      cell: (row) => (
        <span className="flex flex-col gap-1">
          <Badge>{t(`booking.status.${row.status}`)}</Badge>
          {row.cancel_reason ? (
            <span className="text-xs text-muted">
              {row.cancel_reason === 'expired' ? t('bookings.expired') : row.cancel_reason}
            </span>
          ) : null}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t('admin.bookings.title')}</h1>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t('lists.status')}
          <Select name="status" defaultValue={status ?? ''} className="w-56">
            <option value="">{t('lists.all')}</option>
            {BOOKING_STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`booking.status.${value}`)}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" variant="secondary">
          {t('lists.apply')}
        </Button>
      </form>
      <DataTable
        columns={columns}
        rows={rows}
        empty={t('lists.empty')}
        caption={t('admin.bookings.title')}
      />
      <Pagination basePath="/admin/bookings" params={{ status }} page={page} total={total} />
    </div>
  );
}
