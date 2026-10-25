-- Audit trail of sensitive changes (BR-404, docs/SECURITY.md). Append-only: rows are written by
-- triggers only, never updated or deleted through the API. No sensitive data: only the changed
-- business columns are stored.

create table public.audit_logs (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid references auth.users (id) on delete set null,
  company_id uuid references public.companies (id) on delete cascade,
  action text not null check (action ~ '^[a-z_]+\.[a-z_]+$'),
  entity_type text not null,
  entity_id text not null,
  before jsonb,
  after jsonb
);

create index audit_logs_company_idx on public.audit_logs (company_id, occurred_at desc);
create index audit_logs_occurred_at_idx on public.audit_logs (occurred_at desc);

alter table public.audit_logs enable row level security;
revoke all on public.audit_logs from anon;
revoke insert, update, delete on public.audit_logs from authenticated;

create policy "audit: owners read their company, admins read all" on public.audit_logs
  for select to authenticated
  using (
    private.is_platform_admin()
    or (company_id is not null and private.has_role(company_id, '{owner}'))
  );

/**
 * Generic audit trigger. TG_ARGV[0] = action prefix (e.g. 'company'), TG_ARGV[1..] = audited
 * columns. Only the audited columns that actually changed are recorded.
 */
create function private.audit_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  v_new jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  v_before jsonb := '{}'::jsonb;
  v_after jsonb := '{}'::jsonb;
  v_column text;
  v_row jsonb := case when tg_op = 'DELETE' then v_old else v_new end;
begin
  for i in 1 .. tg_nargs - 1 loop
    v_column := tg_argv[i];
    if (v_old -> v_column) is distinct from (v_new -> v_column) then
      v_before := v_before || jsonb_build_object(v_column, v_old -> v_column);
      v_after := v_after || jsonb_build_object(v_column, v_new -> v_column);
    end if;
  end loop;

  if v_after = '{}'::jsonb and v_before = '{}'::jsonb then
    return coalesce(new, old);
  end if;

  insert into public.audit_logs (actor_id, company_id, action, entity_type, entity_id, before, after)
  values (
    auth.uid(),
    coalesce((v_row ->> 'company_id')::uuid, case when tg_table_name = 'companies' then (v_row ->> 'id')::uuid end),
    tg_argv[0] || '.' || lower(tg_op),
    tg_table_name,
    coalesce(v_row ->> 'id', v_row ->> 'company_id') || coalesce(':' || (v_row ->> 'user_id'), ''),
    nullif(v_before, '{}'::jsonb),
    nullif(v_after, '{}'::jsonb)
  );
  return coalesce(new, old);
end;
$$;

create trigger companies_audit after update on public.companies
  for each row execute function private.audit_changes(
    'company', 'status', 'marketplace_enabled', 'marketplace_suspended_at',
    'marketplace_suspension_reason', 'commission_rate', 'legal_name', 'ice'
  );

create trigger subscriptions_audit after insert or update on public.subscriptions
  for each row execute function private.audit_changes(
    'subscription', 'plan_code', 'status', 'trial_ends_at', 'current_period_start', 'current_period_end'
  );

create trigger company_members_audit after insert or update or delete on public.company_members
  for each row execute function private.audit_changes('member', 'role', 'is_active');

create trigger company_documents_audit after update on public.company_documents
  for each row execute function private.audit_changes(
    'document', 'verification_status', 'rejection_reason'
  );
