import { canBeCredited, canReceivePayment, casablancaDate, formatMoney } from '@mtr/shared';
import { Download } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { StatusAction } from '@/components/list/status-action';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { getListAccess } from '@/features/fleet/access';
import { deleteDraftAction, issueInvoiceAction } from '@/features/invoices/actions';
import {
  DraftDetailsForm,
  InvoiceLineForm,
  TripLinesForm,
} from '@/features/invoices/components/invoice-forms';
import {
  dueInput,
  InvoiceLinesCard,
  InvoiceStatusBadge,
  PaymentsCard,
} from '@/features/invoices/components/invoice-sections';
import { CreditNoteButton, PaymentForm } from '@/features/invoices/components/payment-panel';
import { vatInput } from '@/features/invoices/format';
import {
  getCompanyInvoiceSettings,
  getInvoice,
  getUninvoicedTrips,
} from '@/features/invoices/queries';
import { FeatureGate } from '@/features/subscriptions/feature-gate';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  const locale = asLocale(rawLocale);
  setRequestLocale(locale);
  const [t, format, access] = await Promise.all([
    getTranslations(),
    getFormatter(),
    getListAccess('invoices.read', 'invoices.manage'),
  ]);
  if (!access) return <Alert>{t('lists.forbidden')}</Alert>;
  const invoice = await getInvoice(access.companyId, id);
  if (!invoice) notFound();

  const isDraft = invoice.status === 'draft';
  const manage = access.canManage;
  const [settings, trips] = await Promise.all([
    getCompanyInvoiceSettings(access.companyId),
    isDraft && manage ? getUninvoicedTrips(access.companyId) : Promise.resolve([]),
  ]);
  const defaultVat = vatInput(settings?.default_vat_rate ?? null);
  const day = (value: string) =>
    format.dateTime(new Date(`${value}T12:00:00Z`), { dateStyle: 'medium', timeZone: 'UTC' });
  const tripChoices = trips
    // Trips of this client first, then the others (a trip can be billed to an agency later).
    .sort(
      (a, b) =>
        Number(b.client_id === invoice.client_id) - Number(a.client_id === invoice.client_id),
    )
    .map((trip) => ({
      id: trip.id,
      label: t('invoices.tripLabel', {
        date: format.dateTime(new Date(trip.starts_at), { dateStyle: 'short' }),
        from: trip.pickup?.[`name_${locale}`] ?? '',
        to: trip.dropoff?.[`name_${locale}`] ?? '',
        passenger: trip.passenger_name,
      }),
      price:
        trip.price_cents === null ? t('invoices.noPrice') : formatMoney(trip.price_cents, locale),
    }));

  return (
    <FeatureGate feature="invoicing">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Link href="/app/invoices" className="text-sm font-medium text-secondary underline">
          {t('lists.back')}
        </Link>
        <Card className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">
              {invoice.number
                ? t('invoices.numberTitle', { number: invoice.number })
                : t('invoices.draftTitle')}
            </h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <p className="text-sm text-muted">
            {invoice.client?.name}
            {invoice.issue_date
              ? ` · ${t('invoices.issuedOn', { date: day(invoice.issue_date) })}`
              : null}
            {invoice.due_date ? ` · ${t('invoices.dueOn', { date: day(invoice.due_date) })}` : null}
          </p>
          {invoice.creditNote ? (
            <Alert tone="danger">
              {t('invoices.creditNote.done', {
                number: invoice.creditNote.number,
                reason: invoice.creditNote.reason,
              })}
            </Alert>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <a
              href={`/api/invoices/${invoice.id}/pdf?locale=${locale}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              <Download aria-hidden="true" />
              {isDraft ? t('invoices.previewPdf') : t('invoices.downloadPdf')}
            </a>
            {manage && isDraft ? (
              <>
                <StatusAction
                  variant="primary"
                  label={t('invoices.issue')}
                  description={t('invoices.issueHelp')}
                  action={issueInvoiceAction.bind(null, invoice.id)}
                />
                <StatusAction
                  label={t('invoices.deleteDraft')}
                  description={t('invoices.deleteDraftHelp')}
                  action={deleteDraftAction.bind(null, invoice.id)}
                />
              </>
            ) : null}
            {manage && canBeCredited(invoice.status) ? (
              <CreditNoteButton invoiceId={invoice.id} />
            ) : null}
          </div>
        </Card>

        <InvoiceLinesCard invoice={invoice} editable={manage && isDraft} />

        {manage && isDraft ? (
          <>
            <Card className="flex flex-col gap-4">
              <CardTitle>{t('invoices.addFromTrips')}</CardTitle>
              <TripLinesForm invoiceId={invoice.id} trips={tripChoices} defaultVat={defaultVat} />
            </Card>
            <Card className="flex flex-col gap-4">
              <CardTitle>{t('invoices.line.addTitle')}</CardTitle>
              <InvoiceLineForm invoiceId={invoice.id} defaultVat={defaultVat} />
            </Card>
            <Card className="flex flex-col gap-4">
              <CardTitle>{t('invoices.detailsTitle')}</CardTitle>
              <DraftDetailsForm
                invoiceId={invoice.id}
                dueDate={invoice.due_date ?? ''}
                notes={invoice.notes ?? ''}
              />
            </Card>
          </>
        ) : null}

        {!isDraft ? <PaymentsCard invoice={invoice} canManage={manage} /> : null}
        {manage && canReceivePayment(invoice.status) ? (
          <Card className="flex flex-col gap-4">
            <CardTitle>{t('invoices.payment.add')}</CardTitle>
            <PaymentForm
              invoiceId={invoice.id}
              amountDue={dueInput(invoice)}
              today={casablancaDate()}
            />
          </Card>
        ) : null}
      </div>
    </FeatureGate>
  );
}
