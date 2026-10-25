import { rateToBps, type PlanCode } from '@mtr/shared';
import { ArrowLeft } from 'lucide-react';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { Card, CardTitle } from '@/components/ui/card';
import { AuditList } from '@/features/admin/components/audit-list';
import { CommissionForm } from '@/features/admin/components/commission-form';
import { CompanyStatusActions } from '@/features/admin/components/company-status-actions';
import { MarketplaceSuspension } from '@/features/admin/components/marketplace-suspension';
import { CompanyStatusBadge } from '@/features/admin/components/status-badge';
import { SubscriptionForm } from '@/features/admin/components/subscription-form';
import { getCompanyDetail } from '@/features/admin/queries';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';

interface CompanyPageProps {
  params: Promise<{ locale: string; id: string }>;
}

const toDateInput = (value: string | null) => (value ? value.slice(0, 10) : '');
const percent = (bps: number) => String(bps / 100).replace('.', ',');

export default async function AdminCompanyPage({ params }: CompanyPageProps) {
  const { locale: rawLocale, id } = await params;
  const locale = asLocale(rawLocale);
  setRequestLocale(locale);
  if (!z.uuid().safeParse(id).success) notFound();

  const detail = await getCompanyDetail(id);
  if (!detail) notFound();
  const [t, format] = await Promise.all([getTranslations(), getFormatter()]);
  const { company, members, documents, audit, defaultCommissionBps } = detail;
  const subscription = company.subscriptions;
  const date = (value: string | null) =>
    value
      ? format.dateTime(new Date(value), { dateStyle: 'medium' })
      : t('admin.companies.fields.notProvided');

  const fields: [string, string][] = [
    [t('admin.companies.fields.legalName'), company.legal_name],
    [t('admin.companies.fields.ice'), company.ice ?? t('admin.companies.fields.notProvided')],
    [
      t('admin.companies.fields.license'),
      company.license_number ?? t('admin.companies.fields.notProvided'),
    ],
    [t('admin.companies.fields.licenseExpires'), date(company.license_expires_on)],
    [
      t('admin.companies.fields.city'),
      company.cities?.[`name_${locale}`] ?? t('admin.companies.fields.notProvided'),
    ],
    [t('admin.companies.fields.createdAt'), date(company.created_at)],
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/companies"
        className="inline-flex min-h-11 items-center gap-2 self-start text-sm text-secondary"
      >
        <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
        {t('admin.companies.back')}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{company.legal_name}</h1>
        <CompanyStatusBadge status={company.status} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardTitle>{t('admin.companies.details')}</CardTitle>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {fields.map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="mt-0.5 font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          <h3 className="mt-6 font-semibold">{t('admin.companies.members')}</h3>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {members.map((member) => (
              <li key={member.user_id}>
                {member.name || member.user_id} · {t(`roles.${member.role}`)}
                {member.is_active ? '' : ` (${t('admin.companies.memberInactive')})`}
              </li>
            ))}
          </ul>
          <h3 className="mt-6 font-semibold">{t('admin.companies.documents')}</h3>
          {documents.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{t('admin.companies.noDocuments')}</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {documents.map((document) => (
                <li key={document.id}>
                  {t(`documentType.${document.type}`)} ·{' '}
                  {t(`verificationStatus.${document.verification_status}`)}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardTitle>{t('admin.companies.statusTitle')}</CardTitle>
            <div className="mt-4">
              <CompanyStatusActions companyId={company.id} status={company.status} />
            </div>
          </Card>
          <Card>
            <CardTitle>{t('admin.companies.marketplaceTitle')}</CardTitle>
            <p className="mt-2 text-sm">
              {company.marketplace_enabled
                ? t('admin.companies.marketplaceEnabled')
                : t('admin.companies.marketplaceDisabled')}
            </p>
            {company.marketplace_suspended_at ? (
              <p className="mt-2 text-sm text-danger">
                {t('admin.companies.suspended', {
                  date: date(company.marketplace_suspended_at),
                  reason: company.marketplace_suspension_reason ?? '',
                })}
              </p>
            ) : null}
            <div className="mt-4">
              <MarketplaceSuspension
                companyId={company.id}
                suspended={!!company.marketplace_suspended_at}
              />
            </div>
          </Card>
          <Card>
            <CardTitle>{t('admin.companies.commissionTitle')}</CardTitle>
            <div className="mt-4">
              <CommissionForm
                companyId={company.id}
                initialPercent={
                  company.commission_rate === null
                    ? ''
                    : percent(rateToBps(company.commission_rate))
                }
                defaultPercent={defaultCommissionBps === null ? '' : percent(defaultCommissionBps)}
              />
            </div>
          </Card>
          {subscription ? (
            <Card>
              <CardTitle>{t('admin.companies.subscriptionTitle')}</CardTitle>
              <div className="mt-4">
                <SubscriptionForm
                  companyId={company.id}
                  initial={{
                    planCode: subscription.plan_code as PlanCode,
                    status: subscription.status,
                    trialEndsAt: toDateInput(subscription.trial_ends_at),
                    periodStart: toDateInput(subscription.current_period_start),
                    periodEnd: toDateInput(subscription.current_period_end),
                  }}
                />
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      <Card>
        <CardTitle>{t('admin.companies.auditTitle')}</CardTitle>
        <div className="mt-4">
          <AuditList entries={audit} />
        </div>
      </Card>
    </div>
  );
}
