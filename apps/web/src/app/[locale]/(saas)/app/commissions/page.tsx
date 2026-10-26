import { can, formatMoney } from '@mtr/shared';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { DataTable, type Column } from '@/components/list/data-table';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { getCarrierCommissions } from '@/features/commissions/queries';
import { getCompanyContext } from '@/features/companies/context';
import { getPlatformSettings } from '@/features/settings/queries';
import { PaymentDetails } from '@/features/subscriptions/payment-details';
import { asLocale } from '@/i18n/as-locale';

export async function generateMetadata() {
  const t = await getTranslations('commissions');
  return { title: t('title') };
}

/** Carrier view of the commissions owed to the platform (ADR-016). */
export default async function CarrierCommissionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const [t, format, context, settings] = await Promise.all([
    getTranslations(),
    getFormatter(),
    getCompanyContext(),
    getPlatformSettings(),
  ]);
  if (!context || !can(context.membership.role, 'invoices.read'))
    return <Alert>{t('lists.forbidden')}</Alert>;
  const { statements, currentMonthCents } = await getCarrierCommissions(
    context.membership.companyId,
  );
  const day = (value: string) =>
    format.dateTime(new Date(`${value}T12:00:00Z`), { dateStyle: 'medium', timeZone: 'UTC' });

  const columns: Column<(typeof statements)[number]>[] = [
    {
      key: 'month',
      header: t('commissions.month'),
      cell: (row) =>
        format.dateTime(new Date(`${row.month}T12:00:00Z`), {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }),
    },
    {
      key: 'total',
      header: t('commissions.total'),
      cell: (row) => formatMoney(row.total_cents, locale),
    },
    {
      key: 'paid',
      header: t('commissions.paid'),
      cell: (row) => formatMoney(row.paid_cents, locale),
    },
    { key: 'due', header: t('commissions.dueDate'), cell: (row) => day(row.due_date) },
    {
      key: 'status',
      header: t('lists.status'),
      cell: (row) => (
        <Badge variant={row.status === 'paid' ? 'verified' : 'neutral'}>
          {t(`commissions.status.${row.status}`)}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t('commissions.title')}</h1>
      {statements.some((statement) => statement.status === 'overdue') ? (
        <Alert tone="danger">
          {t('commissions.overdueWarning', { days: settings.statement_suspension_days })}
        </Alert>
      ) : null}
      <Card className="flex flex-col gap-2">
        <CardTitle>{t('commissions.currentMonth')}</CardTitle>
        <p className="text-2xl font-bold">{formatMoney(currentMonthCents, locale)}</p>
        <CardDescription>{t('commissions.currentMonthHelp')}</CardDescription>
      </Card>
      <DataTable
        columns={columns}
        rows={statements}
        empty={t('commissions.none')}
        caption={t('commissions.title')}
      />
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t('commissions.howToPay')}</h2>
        <p className="text-sm text-muted">{t('commissions.howToPayText')}</p>
        <PaymentDetails info={settings.subscription_payment_info} />
      </div>
    </div>
  );
}
