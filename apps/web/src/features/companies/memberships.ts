import 'server-only';
import type { CompanyStatus, MemberRole } from '@mtr/shared';
import { z } from 'zod';
import type { createClient } from '@/lib/supabase/server';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface Membership {
  companyId: string;
  role: MemberRole;
  legalName: string;
  status: CompanyStatus;
}

/** Active memberships of the signed-in user (RLS only returns their own companies). */
export async function getMemberships(supabase: SupabaseServerClient, userId: string) {
  const { data, error } = await supabase
    .from('company_members')
    .select('company_id, role, companies (legal_name, status)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at');

  if (error) throw error;
  return (data ?? []).flatMap<Membership>((row) =>
    row.companies
      ? [
          {
            companyId: row.company_id,
            role: row.role,
            legalName: row.companies.legal_name,
            status: row.companies.status,
          },
        ]
      : [],
  );
}

const pendingCompanySchema = z.object({
  legal_name: z.string().min(2).max(200),
  city_id: z.uuid(),
});

/**
 * Sign-up stores the company in the user metadata because the account has no session until the
 * e-mail is confirmed. On the first signed-in request we create it through create_company
 * (RLS-safe RPC: the caller becomes owner, status pending) and clear the metadata.
 */
export async function finalizePendingCompany(supabase: SupabaseServerClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const parsed = pendingCompanySchema.safeParse(user?.user_metadata?.pending_company);
  if (!user || !parsed.success) return;

  const memberships = await getMemberships(supabase, user.id);
  if (memberships.length === 0) {
    const { error } = await supabase.rpc('create_company', {
      p_legal_name: parsed.data.legal_name,
      p_city_id: parsed.data.city_id,
    });
    if (error) throw error;
  }
  await supabase.auth.updateUser({ data: { pending_company: null } });
}
