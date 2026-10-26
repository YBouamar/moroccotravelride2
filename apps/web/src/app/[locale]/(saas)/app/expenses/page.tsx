import {
  can,
  casablancaDate,
  EXPENSE_STATUSES,
  formatMoney,
  parsePage,
  type ExpenseStatus,
} from '@mtr/shared';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { DataTable, type Column } from '@/components/list/data-table';
import { Pagination } from '@/components/list/pagination';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { getCompanyContext } from '@/features/companies/context';
import { ExpenseForm } from '@/features/expenses/components/expense-form';
import { ExpenseReview } from '@/features/expenses/components/expense-review';
import { listExpenses } from '@/features/expenses/queries';
import { FeatureGate } from '@/features/subscriptions/feature-gate';
import { getAssignmentOptions } from '@/features/trips/queries';
import { asLocale } from '@/i18n/as-locale';

export async function generateMetadata() {
  const t = await getTranslations('expenses');
  return { title: t('title') };
}

export default async function ExpensesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const query = await searchParams;
  const page = parsePage(query.page);
  const [t, format, context] = await Promise.all([
    getTranslations(),
    getFormatter(),
    getCompanyContext(),
  ]);
  if (!context || !can(context.membership.role, 'expenses.read'))
    return <Alert>{t('lists.forbidden')}</Alert>;
  const companyId = context.membership.companyId;
  const [{ rows, total }, options] = await Promise.all([
    listExpenses(companyId, { status: query.status, page }),
    getAssignmentOptions(companyId),
  ]);
  const canReview = can(context.membership.role, 'expenses.review') && context.canWrite;

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: 'date',
      header: t('expenses.date'),
      cell: (row) =>
        format.dateTime(new Date(`${row.spent_on}T12:00:00Z`), {
          dateStyle: 'medium',
          timeZone: 'UTC',
        }),
    },
    {
      key: 'category',
      header: t('expenses.category'),
      cell: (row) => t(`expenseCategory.${row.category}`),
    },
    {
      key: 'amount',
      header: t('expenses.amount'),
      cell: (row) => formatMoney(row.amount_cents, locale),
    },
    {
      key: 'who',
      header: t('expenses.who'),
      cell: (row) => [row.driver?.full_name, row.vehicle?.registration].filter(Boolean).join(' · '),
    },
    {
      key: 'status',
      header: t('lists.status'),
      cell: (row) => (
        <span className="flex flex-col gap-1">
          <Badge variant={row.status === 'approved' ? 'verified' : 'neutral'}>
            {t(`expenseStatus.${row.status}`)}
          </Badge>
          {row.rejection_reason ? (
            <span className="text-xs text-muted">{row.rejection_reason}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('expenses.actions'),
      cell: (row) => (
        <ExpenseReview
          expenseId={row.id}
          canReview={canReview && (row.status as ExpenseStatus) === 'submitted'}
          hasReceipt={!!row.receipt_path}
        />
      ),
    },
  ];

  return (
    <FeatureGate feature="expenses">
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold">{t('expenses.title')}</h1>
        {context.canWrite ? (
          <Card className="flex flex-col gap-4">
            <CardTitle>{t('expenses.new')}</CardTitle>
            <ExpenseForm
              today={casablancaDate()}
              vehicles={options.vehicles}
              drivers={options.drivers}
            />
          </Card>
        ) : null}
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t('lists.status')}
            <Select name="status" defaultValue={query.status ?? ''} className="w-48">
              <option value="">{t('lists.all')}</option>
              {EXPENSE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`expenseStatus.${status}`)}
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
          caption={t('expenses.title')}
        />
        <Pagination
          basePath="/app/expenses"
          params={{ status: query.status }}
          page={page}
          total={total}
        />
      </div>
    </FeatureGate>
  );
}
