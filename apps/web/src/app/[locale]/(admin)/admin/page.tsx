import { COMPANY_STATUSES, SUBSCRIPTION_STATUSES } from '@mtr/shared';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardTitle } from '@/components/ui/card';
import { KpiCards } from '@/features/admin/components/kpi-cards';
import { getOverviewStats } from '@/features/admin/queries';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';

export default async function AdminOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  setRequestLocale(asLocale((await params).locale));
  const requestedMonth = (await searchParams).month;
  const month = requestedMonth && /^\d{4}-\d{2}$/.test(requestedMonth) ? requestedMonth : undefined;
  const [t, format, stats] = await Promise.all([
    getTranslations(),
    getFormatter(),
    getOverviewStats(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t('admin.overview.title')}</h1>
      <KpiCards month={month} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>{t('admin.overview.companiesTitle')}</CardTitle>
          <dl className="mt-4 grid grid-cols-3 gap-4">
            {COMPANY_STATUSES.map((status) => (
              <div key={status}>
                <dt className="text-sm text-muted">{t(`companyStatus.${status}`)}</dt>
                <dd className="mt-1 text-2xl font-bold text-primary">
                  <Link href={`/admin/companies?status=${status}`} className="hover:underline">
                    {stats.companies[status] ?? 0}
                  </Link>
                </dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card>
          <CardTitle>{t('admin.overview.subscriptionsTitle')}</CardTitle>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {SUBSCRIPTION_STATUSES.map((status) => (
              <div key={status}>
                <dt className="text-sm text-muted">{t(`subscriptionStatus.${status}`)}</dt>
                <dd className="mt-1 text-2xl font-bold text-primary">
                  {stats.subscriptions[status] ?? 0}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <Card>
        <CardTitle>{t('admin.overview.toVerifyTitle')}</CardTitle>
        {stats.toVerify.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t('admin.overview.noneToVerify')}</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {stats.toVerify.map((company) => (
              <li
                key={company.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <Link
                  href={`/admin/companies/${company.id}`}
                  className="font-medium text-secondary underline"
                >
                  {company.legal_name}
                </Link>
                <span className="text-sm text-muted">
                  {format.dateTime(new Date(company.created_at), { dateStyle: 'medium' })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
