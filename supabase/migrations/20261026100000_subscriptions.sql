-- SaaS offers and feature gating (BR-101 to BR-106, docs/DATA_MODEL.md "Abonnements").
-- Payment of subscriptions: invoice + bank transfer, activated manually by an admin (ADR-005).

create type public.subscription_status as enum ('trial', 'active', 'past_due', 'cancelled');

create table public.plans (
  code text primary key check (code in ('standard', 'v2', 'v3')),
  -- Null = "sur devis" (V3, BR-103).
  monthly_price_cents bigint check (monthly_price_cents >= 0),
  sort_order integer not null default 0
);

create table public.plan_features (
  plan_code text not null references public.plans (code) on delete cascade,
  feature_key text not null check (feature_key ~ '^[a-z_]+$'),
  primary key (plan_code, feature_key)
);

create table public.subscriptions (
  company_id uuid primary key references public.companies (id) on delete cascade,
  plan_code text not null references public.plans (code),
  status public.subscription_status not null,
  trial_ends_at timestamptz,
  current_period_start date,
  current_period_end date,
  payment_method text not null default 'bank_transfer' check (payment_method in ('bank_transfer')),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'trial' or trial_ends_at is not null),
  check (current_period_end is null or current_period_start is null or current_period_end >= current_period_start)
);

create index subscriptions_plan_code_idx on public.subscriptions (plan_code);

create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function private.set_updated_at();

insert into public.plans (code, monthly_price_cents, sort_order) values
  ('standard', 15000, 10),
  ('v2', 40000, 20),
  ('v3', null, 30);

-- Each offer includes the previous one (BR-101 to BR-103).
insert into public.plan_features (plan_code, feature_key)
select p.code, f.feature_key
from public.plans p
join (values
  ('trips', 10), ('vehicles', 10), ('drivers', 10), ('clients', 10), ('invoicing', 10), ('payments', 10),
  ('expenses', 20), ('driver_app', 20), ('expense_receipts', 20), ('live_tracking', 20),
  ('fleet_maintenance', 30), ('vehicle_deadlines', 30), ('fuel_tracking', 30)
) as f (feature_key, min_order) on p.sort_order >= f.min_order;

-- ---------------------------------------------------------------------------
-- Feature check used by RLS policies (V2 / V3 tables) and by the server.
-- A trial counts only until trial_ends_at. past_due keeps access (grace, see ADR-021).
-- ---------------------------------------------------------------------------
create function private.has_feature(target_company uuid, feature text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.subscriptions s
    join public.plan_features pf on pf.plan_code = s.plan_code
    where s.company_id = target_company
      and pf.feature_key = feature
      and (
        s.status in ('active', 'past_due')
        or (s.status = 'trial' and s.trial_ends_at > now())
      )
  );
$$;

revoke all on function private.has_feature(uuid, text) from public;
grant execute on function private.has_feature(uuid, text) to anon, authenticated, service_role;

-- Every new company starts with the trial defined in platform_settings.saas_trial (BR-106).
create function private.start_trial()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trial jsonb := coalesce(
    (select value from public.platform_settings where key = 'saas_trial'),
    '{"days": 14, "plan": "v2"}'
  );
begin
  insert into public.subscriptions (company_id, plan_code, status, trial_ends_at)
  values (
    new.id,
    v_trial ->> 'plan',
    'trial',
    now() + make_interval(days => (v_trial ->> 'days')::integer)
  );
  return new;
end;
$$;

create trigger companies_start_trial after insert on public.companies
  for each row execute function private.start_trial();

-- Existing companies (created before this migration) get the same trial.
insert into public.subscriptions (company_id, plan_code, status, trial_ends_at)
select c.id, 'v2', 'trial', now() + interval '14 days'
from public.companies c
where not exists (select 1 from public.subscriptions s where s.company_id = c.id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.plans enable row level security;
alter table public.plan_features enable row level security;
alter table public.subscriptions enable row level security;

-- Offers are public (pricing page).
create policy "plans are public" on public.plans for select to anon, authenticated using (true);
create policy "plan features are public" on public.plan_features
  for select to anon, authenticated using (true);
create policy "plans: admins write" on public.plans for all to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());
create policy "plan features: admins write" on public.plan_features for all to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());

revoke all on public.subscriptions from anon;

-- Members see their company's subscription (to know which features they have).
create policy "subscriptions: members and admins read" on public.subscriptions
  for select to authenticated
  using (private.is_member(company_id) or private.is_platform_admin());

-- Only admins change subscriptions (activation after bank transfer, ADR-005). No insert or
-- delete through the API: the trial is created by trigger, companies are never deleted.
create policy "subscriptions: admins update" on public.subscriptions
  for update to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());
