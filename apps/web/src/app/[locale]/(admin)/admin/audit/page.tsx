import { pageRange, parsePage } from '@mtr/shared';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Pagination } from '@/components/list/pagination';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AuditList } from '@/features/admin/components/audit-list';
import { asLocale } from '@/i18n/as-locale';
import { createClient } from '@/lib/supabase/server';

export async function generateMetadata() {
  const t = await getTranslations('admin.audit');
  return { title: t('title') };
}

/** Platform-wide audit trail (step 27), filterable by action prefix (company, trip, invoice...). */
export default async function AdminAuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ action?: string; page?: string }>;
}) {
  setRequestLocale(asLocale((await params).locale));
  const query = await searchParams;
  const page = parsePage(query.page);
  const action = /^[a-z_]{2,30}$/.test(query.action ?? '') ? query.action : undefined;
  const t = await getTranslations();
  const supabase = await createClient();
  const { from, to } = pageRange(page);
  let request = supabase
    .from('audit_logs')
    .select('id, occurred_at, actor_id, action, before, after, company:companies(legal_name)', {
      count: 'exact',
    })
    .order('occurred_at', { ascending: false })
    .range(from, to);
  if (action) request = request.like('action', `${action}.%`);
  const { data, count } = await request;

  const actorIds = [
    ...new Set((data ?? []).map((entry) => entry.actor_id).filter((id): id is string => !!id)),
  ];
  const { data: profiles } = actorIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', actorIds)
    : { data: [] };
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));
  const entries = (data ?? []).map((entry) => ({
    id: entry.id,
    occurred_at: entry.occurred_at,
    action: entry.action,
    before: entry.before,
    after: entry.after,
    actorName:
      [entry.actor_id ? names.get(entry.actor_id) : null, entry.company?.legal_name]
        .filter(Boolean)
        .join(' · ') || null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t('admin.audit.title')}</h1>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t('admin.audit.filter')}
          <Input name="action" defaultValue={action} placeholder={t('admin.audit.placeholder')} />
        </label>
        <Button type="submit" variant="secondary">
          {t('lists.apply')}
        </Button>
      </form>
      <Card>
        <AuditList entries={entries} />
      </Card>
      <Pagination basePath="/admin/audit" params={{ action }} page={page} total={count ?? 0} />
    </div>
  );
}
