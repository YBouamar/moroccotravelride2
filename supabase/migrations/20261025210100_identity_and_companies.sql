-- Identity and multi-tenant core: profiles, companies, members, company documents.
-- Tenant isolation is enforced here by RLS (docs/SECURITY.md section 1); the UI is never the guard.

-- Security helpers live in a schema that PostgREST does not expose (not callable as RPC).
create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

create type public.company_status as enum ('pending', 'verified', 'suspended');
create type public.member_role as enum ('owner', 'manager', 'dispatcher', 'accountant', 'driver');
create type public.document_type as enum ('tourism_license', 'insurance', 'trade_register', 'other');
create type public.verification_status as enum ('pending', 'approved', 'rejected');

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  phone text check (char_length(phone) <= 32),
  locale text not null default 'fr' check (locale in ('fr', 'en', 'ar')),
  -- Only settable with direct database access (never through the API, see guard trigger).
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null check (char_length(legal_name) between 2 and 200),
  trade_name text check (char_length(trade_name) <= 200),
  -- ICE: Identifiant Commun de l'Entreprise, 15 digits.
  ice text check (ice ~ '^[0-9]{15}$'),
  if_number text check (char_length(if_number) <= 32),
  rc_number text check (char_length(rc_number) <= 32),
  tp_number text check (char_length(tp_number) <= 32),
  license_number text check (char_length(license_number) <= 64),
  license_expires_on date,
  city_id uuid references public.cities (id),
  address text check (char_length(address) <= 300),
  logo_path text,
  -- Admin-only columns (guard trigger): status, marketplace_enabled, commission_rate.
  status public.company_status not null default 'pending',
  marketplace_enabled boolean not null default false,
  -- Null = platform default (platform_settings.default_commission_bps). 0.2000 = 20 %.
  commission_rate numeric(5, 4) check (commission_rate between 0 and 1),
  default_vat_rate numeric(5, 4) check (default_vat_rate between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index companies_city_id_idx on public.companies (city_id);

create table public.company_members (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create index company_members_user_id_idx on public.company_members (user_id);

create table public.company_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  type public.document_type not null,
  -- Private storage path, always prefixed by the company id (docs/SECURITY.md 2.4).
  storage_path text not null check (storage_path like company_id::text || '/%'),
  expires_on date,
  verification_status public.verification_status not null default 'pending',
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  rejection_reason text check (char_length(rejection_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index company_documents_company_id_idx on public.company_documents (company_id);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger companies_updated_at before update on public.companies
  for each row execute function private.set_updated_at();
create trigger company_members_updated_at before update on public.company_members
  for each row execute function private.set_updated_at();
create trigger company_documents_updated_at before update on public.company_documents
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Security helpers (security definer: they read memberships without recursing into RLS)
-- ---------------------------------------------------------------------------

-- Platform admins must have completed MFA in the current session (aal2).
create function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_platform_admin
    );
$$;

create function private.is_member(target_company uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = target_company and m.user_id = auth.uid() and m.is_active
  );
$$;

create function private.has_role(target_company uuid, roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = target_company
      and m.user_id = auth.uid()
      and m.is_active
      and m.role = any (roles)
  );
$$;

create function private.shares_company(other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_members mine
    join public.company_members theirs on theirs.company_id = mine.company_id
    where mine.user_id = auth.uid() and mine.is_active
      and theirs.user_id = other_user and theirs.is_active
  );
$$;

revoke all on all functions in schema private from public;
grant execute on all functions in schema private to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Guard triggers: column-level rules that RLS cannot express
-- ---------------------------------------------------------------------------

-- Triggers are not security definer: current_user is the API role of the caller.
create function private.guard_profile_admin_flag()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated')
     and new.is_platform_admin is distinct from old.is_platform_admin then
    raise exception 'is_platform_admin cannot be changed through the API'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_admin_flag before update on public.profiles
  for each row execute function private.guard_profile_admin_flag();

create function private.guard_company_admin_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated')
     and not private.is_platform_admin()
     and (new.status is distinct from old.status
       or new.marketplace_enabled is distinct from old.marketplace_enabled
       or new.commission_rate is distinct from old.commission_rate) then
    raise exception 'only a platform admin can change status, marketplace visibility or commission'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger companies_guard_admin_columns before update on public.companies
  for each row execute function private.guard_company_admin_columns();

create function private.guard_document_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated')
     and not private.is_platform_admin()
     and (new.verification_status is distinct from old.verification_status
       or new.reviewed_by is distinct from old.reviewed_by
       or new.reviewed_at is distinct from old.reviewed_at
       or new.rejection_reason is distinct from old.rejection_reason) then
    raise exception 'only a platform admin can review company documents'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger company_documents_guard_review before update on public.company_documents
  for each row execute function private.guard_document_review();

-- A company always keeps at least one active owner.
create function private.keep_one_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.role = 'owner' and old.is_active
     and (tg_op = 'DELETE' or new.role <> 'owner' or not new.is_active)
     and not exists (
       select 1 from public.company_members m
       where m.company_id = old.company_id
         and m.user_id <> old.user_id
         and m.role = 'owner'
         and m.is_active
     )
     -- Deleting the company itself cascades to its members.
     and exists (select 1 from public.companies c where c.id = old.company_id) then
    raise exception 'a company must keep at least one active owner' using errcode = '23514';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger company_members_keep_one_owner before update or delete on public.company_members
  for each row execute function private.keep_one_owner();

-- Every new auth user gets a profile (name and locale from sign-up metadata).
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, locale)
  values (
    new.id,
    left(new.raw_user_meta_data ->> 'full_name', 120),
    case when new.raw_user_meta_data ->> 'locale' in ('fr', 'en', 'ar')
      then new.raw_user_meta_data ->> 'locale' else 'fr' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Company creation: the only way to insert a company, atomically with its owner
-- ---------------------------------------------------------------------------

create function public.create_company(
  p_legal_name text,
  p_trade_name text default null,
  p_city_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_company uuid;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  insert into public.companies (legal_name, trade_name, city_id)
  values (p_legal_name, p_trade_name, p_city_id)
  returning id into v_company;

  insert into public.company_members (company_id, user_id, role)
  values (v_company, v_user, 'owner');

  return v_company;
end;
$$;

revoke execute on function public.create_company(text, text, uuid) from public, anon;
grant execute on function public.create_company(text, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.company_documents enable row level security;

-- Tenant tables are never readable anonymously.
revoke all on public.profiles, public.companies, public.company_members, public.company_documents from anon;

-- profiles
create policy "profiles: read own, colleagues, or as admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.shares_company(id) or private.is_platform_admin());

create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- companies (insert only through create_company, no delete through the API)
create policy "companies: members and admins read" on public.companies
  for select to authenticated
  using (private.is_member(id) or private.is_platform_admin());

create policy "companies: owners, managers and admins update" on public.companies
  for update to authenticated
  using (private.has_role(id, '{owner,manager}') or private.is_platform_admin())
  with check (private.has_role(id, '{owner,manager}') or private.is_platform_admin());

-- company_members: owners manage everyone, managers manage everyone except owners
create policy "members: colleagues and admins read" on public.company_members
  for select to authenticated
  using (private.is_member(company_id) or private.is_platform_admin());

create policy "members: owners and managers add" on public.company_members
  for insert to authenticated
  with check (
    private.has_role(company_id, '{owner}')
    or (private.has_role(company_id, '{manager}') and role <> 'owner')
    or private.is_platform_admin()
  );

create policy "members: owners and managers update" on public.company_members
  for update to authenticated
  using (
    private.has_role(company_id, '{owner}')
    or (private.has_role(company_id, '{manager}') and role <> 'owner')
    or private.is_platform_admin()
  )
  with check (
    private.has_role(company_id, '{owner}')
    or (private.has_role(company_id, '{manager}') and role <> 'owner')
    or private.is_platform_admin()
  );

create policy "members: owners and managers remove" on public.company_members
  for delete to authenticated
  using (
    private.has_role(company_id, '{owner}')
    or (private.has_role(company_id, '{manager}') and role <> 'owner')
    or private.is_platform_admin()
  );

-- company_documents: owners and managers handle them, admins review them
create policy "documents: owners, managers and admins read" on public.company_documents
  for select to authenticated
  using (private.has_role(company_id, '{owner,manager}') or private.is_platform_admin());

create policy "documents: owners and managers upload" on public.company_documents
  for insert to authenticated
  with check (
    private.has_role(company_id, '{owner,manager}')
    and verification_status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
  );

create policy "documents: owners, managers and admins update" on public.company_documents
  for update to authenticated
  using (private.has_role(company_id, '{owner,manager}') or private.is_platform_admin())
  with check (private.has_role(company_id, '{owner,manager}') or private.is_platform_admin());

create policy "documents: owners and managers delete pending ones" on public.company_documents
  for delete to authenticated
  using (private.has_role(company_id, '{owner,manager}') and verification_status = 'pending');

-- Reference data: platform admins maintain it
create policy "cities: admins write" on public.cities
  for all to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

create policy "vehicle types: admins write" on public.vehicle_types
  for all to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());
