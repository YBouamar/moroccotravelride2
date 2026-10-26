import { formatMoney } from '@mtr/shared';
import { Download } from 'lucide-react';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/server';

interface Kpis {
  month: string;
  mrr_cents: number;
  gmv_cents: number;
  commission_cents: number;
  open_statements_cents: number;
  overdue_statements: number;
  bookings: Record<string, number> | null;
}

/** Platform KPIs of a month (step 25), computed by public.admin_kpis (admin with MFA). */
export async function KpiCards({ month }: { month?: string }) {
  const [t, format, locale] = await Promise.all([
    getTranslations('admin.kpis'),
    getFormatter(),
    getLocale(),
  ]);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_kpis', {
    p_month: month ? `${month}-01` : undefined,
  });
  if (error || !data) return null;
  const kpis = data as unknown as Kpis;
  const bookings = kpis.bookings ?? {};
  const totalBookings = Object.values(bookings).reduce((sum, count) => sum + count, 0);
  const completed = bookings.completed ?? 0;
  const money = (cents: number) => formatMoney(cents, locale);
  const monthValue = kpis.month.slice(0, 7);

  const tiles = [
    { key: 'mrr', value: money(kpis.mrr_cents) },
    { key: 'gmv', value: money(kpis.gmv_cents) },
    { key: 'commission', value: money(kpis.commission_cents) },
    { key: 'bookings', value: format.number(totalBookings) },
    { key: 'completed', value: format.number(completed) },
    { key: 'openStatements', value: money(kpis.open_statements_cents) },
    { key: 'overdue', value: format.number(kpis.overdue_statements) },
  ] as const;

  return (
    <section aria-labelledby="kpis-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="kpis-title" className="text-lg font-semibold">
          {t('title', {
            month: format.dateTime(new Date(`${kpis.month}T12:00:00Z`), {
              month: 'long',
              year: 'numeric',
              timeZone: 'UTC',
            }),
          })}
        </h2>
        <form method="get" className="flex items-end gap-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t('month')}
            <Input type="month" name="month" defaultValue={monthValue} />
          </label>
          <button type="submit" className={buttonVariants({ variant: 'secondary' })}>
            {t('show')}
          </button>
        </form>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.key} className="p-4">
            <dt className="text-sm text-muted">{t(`tiles.${tile.key}`)}</dt>
            <dd className="mt-1 text-2xl font-bold" dir="ltr">
              {tile.value}
            </dd>
          </Card>
        ))}
      </dl>
      <div className="flex flex-wrap gap-2">
        {(['bookings', 'ledger', 'statements'] as const).map((entity) => (
          <a
            key={entity}
            href={`/api/admin/export/${entity}?month=${monthValue}`}
            className={buttonVariants({ variant: 'outline' })}
          >
            <Download aria-hidden="true" />
            {t(`exports.${entity}`)}
          </a>
        ))}
      </div>
    </section>
  );
}
