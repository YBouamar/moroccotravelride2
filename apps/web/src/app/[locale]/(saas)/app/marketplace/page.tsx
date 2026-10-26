import {
  can,
  casablancaDate,
  ELIGIBILITY_CHECKS,
  formatMoney,
  isMarketplaceVisible,
  marketplaceChecklist,
} from '@mtr/shared';
import { CheckCircle2, XCircle } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DataTable, type Column } from '@/components/list/data-table';
import { StatusAction } from '@/components/list/status-action';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { getCompanyContext } from '@/features/companies/context';
import {
  setMarketplaceVisibilityAction,
  setPriceGridActiveAction,
} from '@/features/marketplace/actions';
import { BankDetailsForm } from '@/features/marketplace/components/bank-details-form';
import { PriceGridForm } from '@/features/marketplace/components/price-grid-form';
import { getMarketplaceSettings } from '@/features/marketplace/queries';
import { getVehicleTypeOptions } from '@/features/reference/queries';
import { getPlaceOptions } from '@/features/trips/queries';
import { asLocale } from '@/i18n/as-locale';

export async function generateMetadata() {
  const t = await getTranslations('marketplace');
  return { title: t('title') };
}

export default async function MarketplaceSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const [t, context] = await Promise.all([getTranslations(), getCompanyContext()]);
  if (!context || !can(context.membership.role, 'marketplace.manage')) {
    return <Alert>{t('lists.forbidden')}</Alert>;
  }
  const [{ company, grids }, places, types] = await Promise.all([
    getMarketplaceSettings(context.membership.companyId, locale),
    getPlaceOptions(locale),
    getVehicleTypeOptions(locale),
  ]);

  const checks = marketplaceChecklist(
    {
      status: company.status,
      marketplaceEnabled: company.marketplace_enabled,
      suspended: company.marketplace_suspended_at !== null,
      licenseExpiresOn: company.license_expires_on,
      activeGrids: grids.filter((grid) => grid.isActive).length,
    },
    casablancaDate(),
  );
  const visible = isMarketplaceVisible(checks);

  const columns: Column<(typeof grids)[number]>[] = [
    { key: 'route', header: t('marketplace.grid.route'), cell: (row) => `${row.from} / ${row.to}` },
    { key: 'type', header: t('vehicleForm.type'), cell: (row) => row.vehicleType },
    {
      key: 'price',
      header: t('marketplace.grid.priceShort'),
      cell: (row) => formatMoney(row.priceCents, locale),
    },
    {
      key: 'status',
      header: t('lists.status'),
      cell: (row) => (
        <Badge variant={row.isActive ? 'verified' : 'neutral'}>
          {t(row.isActive ? 'clientStatus.active' : 'clientStatus.inactive')}
        </Badge>
      ),
    },
    {
      key: 'action',
      header: t('marketplace.grid.action'),
      cell: (row) => (
        <StatusAction
          label={t(row.isActive ? 'marketplace.grid.deactivate' : 'marketplace.grid.activate')}
          description={t('marketplace.grid.toggleHelp')}
          action={setPriceGridActiveAction.bind(null, row.id, !row.isActive)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t('marketplace.title')}</h1>
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{t(visible ? 'marketplace.visible' : 'marketplace.hidden')}</CardTitle>
          <Badge variant={visible ? 'verified' : 'neutral'}>
            {t(visible ? 'marketplace.visibleBadge' : 'marketplace.hiddenBadge')}
          </Badge>
        </div>
        <ul className="flex flex-col gap-2 text-sm">
          {ELIGIBILITY_CHECKS.map((check) => (
            <li key={check} className="flex items-center gap-2">
              {checks[check] ? (
                <CheckCircle2 aria-hidden="true" className="size-4 text-secondary" />
              ) : (
                <XCircle aria-hidden="true" className="size-4 text-danger" />
              )}
              <span>
                <span className="sr-only">
                  {t(checks[check] ? 'marketplace.ok' : 'marketplace.missing')}{' '}
                </span>
                {t(`marketplace.checks.${check}`)}
              </span>
            </li>
          ))}
        </ul>
        {company.marketplace_suspended_at ? (
          <Alert tone="danger">
            {t('marketplace.suspended', { reason: company.marketplace_suspension_reason ?? '' })}
          </Alert>
        ) : null}
        <div>
          <StatusAction
            variant={company.marketplace_enabled ? 'outline' : 'primary'}
            label={t(company.marketplace_enabled ? 'marketplace.disable' : 'marketplace.enable')}
            description={t(
              company.marketplace_enabled ? 'marketplace.disableHelp' : 'marketplace.enableHelp',
            )}
            action={setMarketplaceVisibilityAction.bind(null, !company.marketplace_enabled)}
          />
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <CardTitle>{t('marketplace.bank.title')}</CardTitle>
        <CardDescription>{t('marketplace.bank.help')}</CardDescription>
        <BankDetailsForm bankName={company.bank_name ?? ''} rib={company.bank_rib ?? ''} />
      </Card>

      <Card className="flex flex-col gap-4">
        <CardTitle>{t('marketplace.grid.title')}</CardTitle>
        <CardDescription>{t('marketplace.grid.help')}</CardDescription>
        <PriceGridForm places={places} types={types} />
      </Card>
      <DataTable
        columns={columns}
        rows={grids}
        empty={t('marketplace.grid.empty')}
        caption={t('marketplace.grid.title')}
      />
    </div>
  );
}
