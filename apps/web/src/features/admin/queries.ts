import 'server-only';
import { COMPANY_STATUSES, type CompanyStatus } from '@mtr/shared';
import { createClient } from '@/lib/supabase/server';

// Platform admin reads. RLS only returns everything to admins with MFA (aal2).

export const isCompanyStatus = (value: unknown): value is CompanyStatus =>
  typeof value === 'string' && (COMPANY_STATUSES as readonly string[]).includes(value);

export async function getOverviewStats() {
  const supabase = await createClient();
  const [{ data: companies }, { data: subscriptions }, { data: toVerify }] = await Promise.all([
    supabase.from('companies').select('status'),
    supabase.from('subscriptions').select('status'),
    supabase
      .from('companies')
      .select('id, legal_name, created_at')
      .eq('status', 'pending')
      .order('created_at')
      .limit(5),
  ]);
  const count = <T extends string>(rows: { status: T }[] | null) =>
    (rows ?? []).reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1;
      return acc;
    }, {});
  return {
    companies: count(companies),
    subscriptions: count(subscriptions),
    toVerify: toVerify ?? [],
  };
}

export async function listCompanies(status?: CompanyStatus) {
  const supabase = await createClient();
  let query = supabase
    .from('companies')
    .select(
      'id, legal_name, status, created_at, cities (name_fr, name_en, name_ar), subscriptions (plan_code, status)',
    )
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getCompanyDetail(companyId: string) {
  const supabase = await createClient();
  const { data: company, error } = await supabase
    .from('companies')
    .select(
      'id, legal_name, trade_name, ice, license_number, license_expires_on, status, marketplace_enabled, marketplace_suspended_at, marketplace_suspension_reason, commission_rate, created_at, cities (name_fr, name_en, name_ar), subscriptions (plan_code, status, trial_ends_at, current_period_start, current_period_end)',
    )
    .eq('id', companyId)
    .maybeSingle();
  if (error) throw error;
  if (!company) return null;

  const [{ data: members }, { data: documents }, { data: audit }, { data: setting }] =
    await Promise.all([
      supabase
        .from('company_members')
        .select('user_id, role, is_active')
        .eq('company_id', companyId),
      supabase
        .from('company_documents')
        .select('id, type, verification_status, expires_on, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false }),
      supabase
        .from('audit_logs')
        .select('id, occurred_at, actor_id, action, before, after')
        .eq('company_id', companyId)
        .order('occurred_at', { ascending: false })
        .limit(20),
      supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'default_commission_bps')
        .single(),
    ]);

  // Names of members and audit actors (profiles are readable by admins).
  const userIds = [
    ...new Set([
      ...(members ?? []).map((member) => member.user_id),
      ...(audit ?? []).flatMap((entry) => (entry.actor_id ? [entry.actor_id] : [])),
    ]),
  ];
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
    : { data: [] };
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name ?? '']));

  return {
    company,
    members: (members ?? []).map((member) => ({
      ...member,
      name: names.get(member.user_id) ?? '',
    })),
    documents: documents ?? [],
    audit: (audit ?? []).map((entry) => ({
      ...entry,
      actorName: entry.actor_id ? (names.get(entry.actor_id) ?? '') : null,
    })),
    defaultCommissionBps: typeof setting?.value === 'number' ? setting.value : null,
  };
}
