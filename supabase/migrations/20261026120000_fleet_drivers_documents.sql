-- Step 7: vehicles and drivers (needed by the onboarding), private storage of company documents.
-- RLS convention (ADR-022): SELECT = membership; writes = role + private.has_feature (subscription).

create type public.vehicle_status as enum ('active', 'maintenance', 'inactive');
create type public.driver_status as enum ('active', 'inactive');

-- ---------------------------------------------------------------------------
-- Vehicles
-- ---------------------------------------------------------------------------
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  -- Stored normalized (upper case, single spaces) to detect duplicates.
  registration text not null check (char_length(registration) between 2 and 20),
  brand text not null check (char_length(brand) between 1 and 60),
  model text not null check (char_length(model) between 1 and 60),
  vehicle_type_code text not null references public.vehicle_types (code),
  seats integer not null check (seats between 1 and 80),
  luggage_capacity integer check (luggage_capacity between 0 and 200),
  year integer check (year between 1980 and 2100),
  status public.vehicle_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, registration)
);

create index vehicles_company_id_idx on public.vehicles (company_id);
create trigger vehicles_updated_at before update on public.vehicles
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Drivers (the person; an app account can be linked later through user_id)
-- ---------------------------------------------------------------------------
create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  full_name text not null check (char_length(full_name) between 2 and 120),
  phone text not null check (char_length(phone) between 8 and 32),
  license_number text not null check (char_length(license_number) between 2 and 40),
  license_expires_on date not null,
  professional_card_number text check (char_length(professional_card_number) <= 40),
  professional_card_expires_on date,
  languages text[] not null default '{}' check (languages <@ array['fr', 'en', 'ar', 'es', 'de', 'it', 'zgh']),
  status public.driver_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create index drivers_company_id_idx on public.drivers (company_id);
create index drivers_user_id_idx on public.drivers (user_id);
create trigger drivers_updated_at before update on public.drivers
  for each row execute function private.set_updated_at();

alter table public.vehicles enable row level security;
alter table public.drivers enable row level security;
revoke all on public.vehicles, public.drivers from anon;

create policy "vehicles: members and admins read" on public.vehicles
  for select to authenticated
  using (private.is_member(company_id) or private.is_platform_admin());

create policy "vehicles: owners and managers write with an active offer" on public.vehicles
  for all to authenticated
  using (private.has_role(company_id, '{owner,manager}') and private.has_feature(company_id, 'vehicles'))
  with check (private.has_role(company_id, '{owner,manager}') and private.has_feature(company_id, 'vehicles'));

-- Drivers: office roles read all drivers of their company; a driver reads their own record.
create policy "drivers: office roles, the driver and admins read" on public.drivers
  for select to authenticated
  using (
    private.has_role(company_id, '{owner,manager,dispatcher,accountant}')
    or user_id = (select auth.uid())
    or private.is_platform_admin()
  );

create policy "drivers: owners and managers write with an active offer" on public.drivers
  for all to authenticated
  using (private.has_role(company_id, '{owner,manager}') and private.has_feature(company_id, 'drivers'))
  with check (
    private.has_role(company_id, '{owner,manager}')
    and private.has_feature(company_id, 'drivers')
    -- A linked account must belong to the same company.
    and (user_id is null or exists (
      select 1 from public.company_members m
      where m.company_id = drivers.company_id and m.user_id = drivers.user_id
    ))
  );

-- ---------------------------------------------------------------------------
-- Company documents: private bucket, one folder per company (docs/SECURITY.md 2.4)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-documents', 'company-documents', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
);

/** First folder of a storage path as a company id, or null when it is not a uuid. */
create function private.storage_company_id(object_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return (storage.foldername(object_name))[1]::uuid;
exception when others then
  return null;
end;
$$;

grant execute on function private.storage_company_id(text) to authenticated, service_role;

create policy "company documents: owners, managers and admins read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'company-documents'
    and (
      private.has_role(private.storage_company_id(name), '{owner,manager}')
      or private.is_platform_admin()
    )
  );

create policy "company documents: owners and managers upload to their folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'company-documents'
    and private.has_role(private.storage_company_id(name), '{owner,manager}')
  );

create policy "company documents: owners and managers delete their files" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'company-documents'
    and private.has_role(private.storage_company_id(name), '{owner,manager}')
  );

-- Uploads are audited too (only reviews were until now).
drop trigger company_documents_audit on public.company_documents;
create trigger company_documents_audit after insert or update on public.company_documents
  for each row execute function private.audit_changes(
    'document', 'type', 'verification_status', 'rejection_reason'
  );
