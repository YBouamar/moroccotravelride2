import {
  amountDue,
  centsToInput,
  formatMoney,
  vatBreakdown,
  type InvoiceStatus,
} from '@mtr/shared';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { StatusAction } from '@/components/list/status-action';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { deleteInvoiceLineAction, deletePaymentAction } from '../actions';
import type { InvoiceDetail } from '../queries';

export async function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const t = await getTranslations('invoiceStatus');
  return <Badge variant={status === 'paid' ? 'verified' : 'neutral'}>{t(status)}</Badge>;
}

const bpsLabel = (bps: number, locale: string) =>
  `${(bps / 100).toLocaleString(locale === 'ar' ? 'ar-MA-u-nu-latn' : `${locale}-MA`)} %`;

/** Lines with their per-line amounts, VAT breakdown and totals (BR-111). */
export async function InvoiceLinesCard({
  invoice,
  editable,
}: {
  invoice: InvoiceDetail;
  editable: boolean;
}) {
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);
  const money = (cents: number) => formatMoney(cents, locale);
  const breakdown = vatBreakdown(
    invoice.lines.map((line) => ({
      subtotal: line.subtotal_cents,
      vat: line.vat_cents,
      total: line.total_cents,
      vatRate: line.vat_rate_bps,
    })),
  );

  return (
    <Card className="overflow-x-auto p-0">
      {invoice.lines.length === 0 ? (
        <p className="p-6 text-sm text-muted">{t('invoices.noLine')}</p>
      ) : (
        <table className="w-full text-sm">
          <caption className="sr-only">{t('invoices.linesTitle')}</caption>
          <thead className="border-b border-border bg-background text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 text-start font-medium">
                {t('invoices.line.description')}
              </th>
              <th scope="col" className="px-4 py-3 text-end font-medium">
                {t('invoices.line.quantity')}
              </th>
              <th scope="col" className="px-4 py-3 text-end font-medium">
                {t('invoices.line.unitPrice')}
              </th>
              <th scope="col" className="px-4 py-3 text-end font-medium">
                {t('invoices.line.vatRate')}
              </th>
              <th scope="col" className="px-4 py-3 text-end font-medium">
                {t('invoices.line.totalExclTax')}
              </th>
              {editable ? (
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">{t('invoices.line.remove')}</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoice.lines.map((line) => (
              <tr key={line.id}>
                <td className="px-4 py-3">{line.description}</td>
                <td className="px-4 py-3 text-end">{line.quantity}</td>
                <td className="px-4 py-3 text-end whitespace-nowrap">
                  {money(line.unit_price_cents)}
                </td>
                <td className="px-4 py-3 text-end whitespace-nowrap">
                  {bpsLabel(line.vat_rate_bps, locale)}
                </td>
                <td className="px-4 py-3 text-end whitespace-nowrap">
                  {money(line.subtotal_cents)}
                </td>
                {editable ? (
                  <td className="px-4 py-2 text-end">
                    <StatusAction
                      label={t('invoices.line.remove')}
                      description={t('invoices.line.removeHelp')}
                      action={deleteInvoiceLineAction.bind(null, invoice.id, line.id)}
                    />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <dl className="ms-auto grid max-w-sm grid-cols-2 gap-x-6 gap-y-1 border-t border-border p-4 text-sm">
        <dt className="text-muted">{t('invoices.totals.subtotal')}</dt>
        <dd className="text-end">{money(invoice.subtotal_cents)}</dd>
        {breakdown.map((rate) => (
          <div key={rate.vatRate} className="contents">
            <dt className="text-muted">
              {t('invoices.totals.vat', { rate: bpsLabel(rate.vatRate, locale) })}
            </dt>
            <dd className="text-end">{money(rate.vat)}</dd>
          </div>
        ))}
        <dt className="font-semibold">{t('invoices.totals.total')}</dt>
        <dd className="text-end font-semibold">{money(invoice.total_cents)}</dd>
      </dl>
    </Card>
  );
}

/** Payments received and remaining amount of an issued invoice. */
export async function PaymentsCard({
  invoice,
  canManage,
}: {
  invoice: InvoiceDetail;
  canManage: boolean;
}) {
  const [t, format, locale] = await Promise.all([getTranslations(), getFormatter(), getLocale()]);
  const due = amountDue(invoice.total_cents, invoice.paid_cents);
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{t('invoices.payment.title')}</h2>
      {invoice.payments.length === 0 ? (
        <p className="text-sm text-muted">{t('invoices.payment.none')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border text-sm">
          {invoice.payments.map((payment) => (
            <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                {format.dateTime(new Date(`${payment.paid_on}T12:00:00Z`), {
                  dateStyle: 'medium',
                  timeZone: 'UTC',
                })}
                {' · '}
                {t(`invoicePaymentMethod.${payment.method}`)}
                {payment.reference ? ` · ${payment.reference}` : null}
              </span>
              <span className="flex items-center gap-3">
                <span className="font-semibold">{formatMoney(payment.amount_cents, locale)}</span>
                {canManage && invoice.status !== 'cancelled' ? (
                  <StatusAction
                    label={t('invoices.payment.remove')}
                    description={t('invoices.payment.removeHelp')}
                    action={deletePaymentAction.bind(null, invoice.id, payment.id)}
                  />
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm">{t('invoices.payment.due', { amount: formatMoney(due, locale) })}</p>
    </Card>
  );
}

export const dueInput = (invoice: InvoiceDetail) =>
  centsToInput(amountDue(invoice.total_cents, invoice.paid_cents));
