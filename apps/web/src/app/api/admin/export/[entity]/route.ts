import { casablancaStartOfDay, toCsv, type CsvColumn } from '@mtr/shared';
import { NextResponse, type NextRequest } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { getSessionUser } from '@/features/auth/session';
import { createClient } from '@/lib/supabase/server';

const ENTITIES = ['bookings', 'ledger', 'statements'] as const;
type Entity = (typeof ENTITIES)[number];

const cents = (value: number) => (value / 100).toFixed(2).replace('.', ',');

/**
 * Accounting exports of a month for the platform (step 26). Admin with MFA: the user's RLS
 * client runs the queries (private.is_platform_admin requires aal2), so nothing is exported
 * without the second factor.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> },
) {
  const { entity } = await params;
  const user = await getSessionUser();
  if (!user?.isPlatformAdmin || !(ENTITIES as readonly string[]).includes(entity)) {
    return new NextResponse(null, { status: 404 });
  }
  const supabase = await createClient();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== 'aal2') return new NextResponse(null, { status: 403 });

  const month = request.nextUrl.searchParams.get('month') ?? '';
  if (!/^\d{4}-\d{2}$/.test(month)) return new NextResponse(null, { status: 400 });
  const [year, monthNumber] = month.split('-').map(Number) as [number, number];
  const next =
    monthNumber === 12 ? `${year + 1}-01` : `${year}-${String(monthNumber + 1).padStart(2, '0')}`;
  const start = casablancaStartOfDay(`${month}-01`).toISOString();
  const end = casablancaStartOfDay(`${next}-01`).toISOString();

  const requestedLocale = request.nextUrl.searchParams.get('locale');
  const t = await getTranslations({
    locale: requestedLocale === 'en' || requestedLocale === 'ar' ? requestedLocale : 'fr',
    namespace: 'admin.exportColumns',
  });
  let csv = '';
  switch (entity as Entity) {
    case 'bookings': {
      const { data } = await supabase
        .from('bookings')
        .select(
          'public_ref, status, payment_status, payment_method, pickup_at, total_cents, commission_rate_bps, commission_cents, carrier_cents, company:companies(legal_name, ice)',
        )
        .gte('pickup_at', start)
        .lt('pickup_at', end)
        .order('pickup_at')
        .limit(10_000);
      const columns: CsvColumn<NonNullable<typeof data>[number]>[] = [
        { label: t('ref'), value: (row) => row.public_ref },
        { label: t('carrier'), value: (row) => row.company?.legal_name },
        { label: t('ice'), value: (row) => row.company?.ice },
        { label: t('pickup'), value: (row) => row.pickup_at },
        { label: t('status'), value: (row) => row.status },
        { label: t('payment'), value: (row) => `${row.payment_method} / ${row.payment_status}` },
        { label: t('total'), value: (row) => cents(row.total_cents) },
        {
          label: t('rate'),
          value: (row) => (row.commission_rate_bps / 100).toFixed(2).replace('.', ','),
        },
        { label: t('commission'), value: (row) => cents(row.commission_cents) },
        { label: t('carrierShare'), value: (row) => cents(row.carrier_cents) },
      ];
      csv = toCsv(columns, data ?? []);
      break;
    }
    case 'ledger': {
      const { data } = await supabase
        .from('commission_ledger')
        .select(
          'occurred_at, kind, amount_cents, statement_id, booking:bookings(public_ref), company:companies(legal_name, ice)',
        )
        .gte('occurred_at', start)
        .lt('occurred_at', end)
        .order('occurred_at')
        .limit(10_000);
      const columns: CsvColumn<NonNullable<typeof data>[number]>[] = [
        { label: t('date'), value: (row) => row.occurred_at },
        { label: t('carrier'), value: (row) => row.company?.legal_name },
        { label: t('ice'), value: (row) => row.company?.ice },
        { label: t('booking'), value: (row) => row.booking?.public_ref },
        { label: t('kind'), value: (row) => row.kind },
        { label: t('commission'), value: (row) => cents(row.amount_cents) },
        { label: t('statement'), value: (row) => row.statement_id },
      ];
      csv = toCsv(columns, data ?? []);
      break;
    }
    case 'statements': {
      const { data } = await supabase
        .from('commission_statements')
        .select(
          'month, status, total_cents, paid_cents, due_date, company:companies(legal_name, ice)',
        )
        .eq('month', `${month}-01`)
        .order('due_date')
        .limit(10_000);
      const columns: CsvColumn<NonNullable<typeof data>[number]>[] = [
        { label: t('month'), value: (row) => row.month },
        { label: t('carrier'), value: (row) => row.company?.legal_name },
        { label: t('ice'), value: (row) => row.company?.ice },
        { label: t('total'), value: (row) => cents(row.total_cents) },
        { label: t('paid'), value: (row) => cents(row.paid_cents) },
        { label: t('due'), value: (row) => row.due_date },
        { label: t('status'), value: (row) => row.status },
      ];
      csv = toCsv(columns, data ?? []);
      break;
    }
  }

  return new NextResponse(`${String.fromCharCode(0xfeff)}${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="mtr-${entity}-${month}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
