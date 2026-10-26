import { formatMoney, vatBreakdown } from '@mtr/shared';
import { renderToBuffer } from '@react-pdf/renderer';
import { NextResponse, type NextRequest } from 'next/server';
import { getFormatter, getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { getListAccess } from '@/features/fleet/access';
import { InvoiceDocument, type InvoicePdfData } from '@/features/invoices/pdf/invoice-document';
import { getInvoice } from '@/features/invoices/queries';
import { createClient } from '@/lib/supabase/server';

// Built-in PDF fonts only cover Latin scripts: the Arabic interface gets a French PDF (BACKLOG).
const PDF_LOCALES = ['fr', 'en'] as const;

// Helvetica has no narrow no-break space (French number grouping): use plain spaces.
const plain = (text: string) => text.replace(/\s/g, ' ');

/**
 * Invoice PDF. Issued invoices print the legal details frozen at issue (BR-109); drafts print
 * the current details with a watermark. The user's RLS client runs every query.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new NextResponse(null, { status: 404 });
  const access = await getListAccess('invoices.read', 'invoices.manage');
  if (!access || !access.context.features.has('invoicing')) {
    return new NextResponse(null, { status: 403 });
  }
  const invoice = await getInvoice(access.companyId, id);
  if (!invoice) return new NextResponse(null, { status: 404 });

  const requested = request.nextUrl.searchParams.get('locale');
  const locale = PDF_LOCALES.find((candidate) => candidate === requested) ?? 'fr';
  const [t, format] = await Promise.all([
    getTranslations({ locale, namespace: 'invoicePdf' }),
    getFormatter({ locale }),
  ]);
  const money = (cents: number) => plain(formatMoney(cents, locale));
  const percent = (bps: number) => `${(bps / 100).toLocaleString(`${locale}-MA`)} %`;
  const day = (value: string) =>
    format.dateTime(new Date(`${value}T12:00:00Z`), { dateStyle: 'long', timeZone: 'UTC' });

  // Frozen snapshots for issued invoices, live details for a draft preview.
  let seller = invoice.seller as Record<string, string | null> | null;
  let buyer = invoice.buyer as Record<string, string | null> | null;
  if (!seller || !buyer) {
    const supabase = await createClient();
    const { data: company } = await supabase
      .from('companies')
      .select(
        'legal_name, trade_name, ice, if_number, rc_number, tp_number, address, license_number',
      )
      .eq('id', access.companyId)
      .single();
    seller = company;
    buyer = invoice.client ? { ...invoice.client } : null;
  }

  const sellerLines = [
    seller?.trade_name && seller.trade_name !== seller.legal_name ? seller.trade_name : null,
    seller?.address,
    seller?.ice ? `${t('ice')} ${seller.ice}` : null,
    seller?.if_number ? `${t('if')} ${seller.if_number}` : null,
    seller?.rc_number ? `${t('rc')} ${seller.rc_number}` : null,
    seller?.tp_number ? `${t('tp')} ${seller.tp_number}` : null,
    seller?.license_number ? `${t('license')} ${seller.license_number}` : null,
  ].filter((line): line is string => !!line);
  const buyerLines = [
    buyer?.address,
    buyer?.ice ? `${t('ice')} ${buyer.ice}` : null,
    buyer?.email,
  ].filter((line): line is string => !!line);

  const breakdown = vatBreakdown(
    invoice.lines.map((line) => ({
      subtotal: line.subtotal_cents,
      vat: line.vat_cents,
      total: line.total_cents,
      vatRate: line.vat_rate_bps,
    })),
  );
  const isDraft = invoice.status === 'draft';

  const data: InvoicePdfData = {
    title: isDraft ? t('draftTitle') : t('title', { number: invoice.number ?? '' }),
    draftWatermark: isDraft ? t('watermark') : undefined,
    meta: [
      ...(invoice.issue_date ? [{ label: t('issueDate'), value: day(invoice.issue_date) }] : []),
      ...(invoice.due_date ? [{ label: t('dueDate'), value: day(invoice.due_date) }] : []),
      ...(invoice.creditNote
        ? [
            {
              label: t('creditNote'),
              value: `${invoice.creditNote.number} (${invoice.creditNote.reason})`,
            },
          ]
        : []),
    ],
    sellerLabel: t('seller'),
    buyerLabel: t('buyer'),
    seller: { name: seller?.legal_name ?? '', lines: sellerLines },
    buyer: { name: buyer?.name ?? '', lines: buyerLines },
    columns: {
      description: t('columns.description'),
      quantity: t('columns.quantity'),
      unitPrice: t('columns.unitPrice'),
      vatRate: t('columns.vatRate'),
      subtotal: t('columns.subtotal'),
    },
    lines: invoice.lines.map((line) => ({
      description: line.description,
      quantity: String(line.quantity),
      unitPrice: money(line.unit_price_cents),
      vatRate: percent(line.vat_rate_bps),
      subtotal: money(line.subtotal_cents),
    })),
    totals: [
      { label: t('subtotal'), value: money(invoice.subtotal_cents) },
      ...breakdown.map((rate) => ({
        label: t('vat', { rate: percent(rate.vatRate) }),
        value: money(rate.vat),
      })),
      { label: t('total'), value: money(invoice.total_cents), strong: true },
      ...(invoice.paid_cents > 0
        ? [
            { label: t('paid'), value: money(invoice.paid_cents) },
            {
              label: t('due'),
              value: money(Math.max(0, invoice.total_cents - invoice.paid_cents)),
            },
          ]
        : []),
    ],
    notes: invoice.notes ?? undefined,
    footer: t('footer'),
  };

  // The component returns the <Document> element itself, which is what renderToBuffer expects.
  const pdf = await renderToBuffer(InvoiceDocument({ data }));
  const filename = isDraft ? 'brouillon' : (invoice.number ?? 'facture');
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="facture-${filename}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
