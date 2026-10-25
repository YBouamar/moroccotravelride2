import { COMPANY_STATUSES, type PlanCode } from '@mtr/shared';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { CompanyStatusBadge, SubscriptionBadge } from '@/features/admin/components/status-badge';
import { isCompanyStatus, listCompanies } from '@/features/admin/queries';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

interface CompaniesPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string | string[] }>;
}

export async function generateMetadata() {
  const t = await getTranslations('admin.companies');
  return { title: t('title') };
}

export default async function CompaniesPage({ params, searchParams }: CompaniesPageProps) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const requested = (await searchParams).status;
  const status = isCompanyStatus(requested) ? requested : undefined;
  const [t, format, companies] = await Promise.all([
    getTranslations(),
    getFormatter(),
    listCompanies(status),
  ]);

  const filters = [undefined, ...COMPANY_STATUSES];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t('admin.companies.title')}</h1>
      <nav aria-label={t('admin.companies.columns.status')}>
        <ul className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <li key={filter ?? 'all'}>
              <Link
                href={filter ? `/admin/companies?status=${filter}` : '/admin/companies'}
                aria-current={filter === status ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-11 items-center rounded-control border border-border px-3 text-sm',
                  filter === status
                    ? 'bg-secondary font-semibold text-secondary-foreground'
                    : 'bg-surface',
                )}
              >
                {filter ? t(`companyStatus.${filter}`) : t('admin.companies.filterAll')}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <Card className="overflow-x-auto p-0">
        {companies.length === 0 ? (
          <p className="p-6 text-sm text-muted">{t('admin.companies.empty')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-start text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  {t('admin.companies.columns.name')}
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  {t('admin.companies.columns.city')}
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  {t('admin.companies.columns.status')}
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  {t('admin.companies.columns.plan')}
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  {t('admin.companies.columns.createdAt')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {companies.map((company) => (
                <tr key={company.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/companies/${company.id}`}
                      className="font-medium text-secondary underline"
                    >
                      {company.legal_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{company.cities?.[`name_${locale}`] ?? ''}</td>
                  <td className="px-4 py-3">
                    <CompanyStatusBadge status={company.status} />
                  </td>
                  <td className="px-4 py-3">
                    {company.subscriptions ? (
                      <SubscriptionBadge
                        planCode={company.subscriptions.plan_code as PlanCode}
                        status={company.subscriptions.status}
                      />
                    ) : null}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {format.dateTime(new Date(company.created_at), { dateStyle: 'medium' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
