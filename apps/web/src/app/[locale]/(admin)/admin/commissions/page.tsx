import { casablancaDate, centsToInput, formatMoney, parsePage } from '@mtr/shared';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Pagination } from '@/components/list/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import {
  GenerateStatementsForm,
  StatementPaymentForm,
} from '@/features/commissions/components/statement-forms';
import { listAllStatements, STATEMENT_STATUSES } from '@/features/commissions/queries';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';

export async function generateMetadata() {
  const t = await getTranslations('commissions');
  return { title: t('adminTitle') };
}

/** Monthly commission statements of all carriers (step 16). */
export default async function AdminCommissionsPage({
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
  const [t, format, { rows, total }] = await Promise.all([
    getTranslations(),
    getFormatter(),
    listAllStatements({ status: query.status, page }),
  ]);
  const today = casablancaDate();
  const previousMonth = (() => {
    const [year, month] = today.split('-').map(Number) as [number, number];
    return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
  })();
  const monthLabel = (month: string) =>
    format.dateTime(new Date(`${month}T12:00:00Z`), {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t('commissions.adminTitle')}</h1>
      <Card className="flex flex-col gap-3">
        <CardTitle>{t('commissions.generateTitle')}</CardTitle>
        <p className="text-sm text-muted">{t('commissions.generateHelp')}</p>
        <GenerateStatementsForm defaultMonth={previousMonth} />
      </Card>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t('lists.status')}
          <Select name="status" defaultValue={query.status ?? ''} className="w-48">
            <option value="">{t('lists.all')}</option>
            {STATEMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(`commissions.status.${status}`)}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" variant="secondary">
          {t('lists.apply')}
        </Button>
      </form>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{t('commissions.none')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((statement) => (
            <li key={statement.id}>
              <Card className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    <Link href={`/admin/companies/${statement.company?.id}`} className="underline">
                      {statement.company?.trade_name ?? statement.company?.legal_name}
                    </Link>{' '}
                    · {monthLabel(statement.month)}
                  </p>
                  <Badge variant={statement.status === 'paid' ? 'verified' : 'neutral'}>
                    {t(`commissions.status.${statement.status}`)}
                  </Badge>
                </div>
                <p className="text-sm">
                  {t('commissions.line', {
                    total: formatMoney(statement.total_cents, locale),
                    paid: formatMoney(statement.paid_cents, locale),
                    due: format.dateTime(new Date(`${statement.due_date}T12:00:00Z`), {
                      dateStyle: 'medium',
                      timeZone: 'UTC',
                    }),
                  })}
                </p>
                {statement.company?.marketplace_suspended_at ? (
                  <p className="text-sm text-danger">{t('commissions.suspended')}</p>
                ) : null}
                {statement.status !== 'paid' ? (
                  <StatementPaymentForm
                    statementId={statement.id}
                    due={centsToInput(statement.total_cents - statement.paid_cents)}
                    today={today}
                  />
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
      <Pagination
        basePath="/admin/commissions"
        params={{ status: query.status }}
        page={page}
        total={total}
      />
    </div>
  );
}
