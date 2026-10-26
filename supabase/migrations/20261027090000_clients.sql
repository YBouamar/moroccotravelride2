-- Step 8: carrier clients (B2B agencies and hotels, B2C travelers) for trips and invoices.

create type public.client_type as enum ('b2b', 'b2c');

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  type public.client_type not null,
  name text not null check (char_length(name) between 2 and 200),
  -- Required on B2B invoices (BR-109, list À VÉRIFIER): 15 digits.
  ice text check (ice ~ '^[0-9]{15}$'),
  email text check (char_length(email) <= 200),
  phone text check (char_length(phone) <= 32),
  address text check (char_length(address) <= 300),
  notes text check (char_length(notes) <= 1000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (type = 'b2b' or ice is null)
);

create index clients_company_id_idx on public.clients (company_id);
create trigger clients_updated_at before update on public.clients
  for each row execute function private.set_updated_at();

alter table public.clients enable row level security;
revoke all on public.clients from anon;

-- Office roles read clients (drivers see the client of their trips through trips, step 9).
create policy "clients: office roles and admins read" on public.clients
  for select to authenticated
  using (
    private.has_role(company_id, '{owner,manager,dispatcher,accountant}')
    or private.is_platform_admin()
  );

create policy "clients: owners, managers and dispatchers write with an active offer" on public.clients
  for all to authenticated
  using (
    private.has_role(company_id, '{owner,manager,dispatcher}')
    and private.has_feature(company_id, 'clients')
  )
  with check (
    private.has_role(company_id, '{owner,manager,dispatcher}')
    and private.has_feature(company_id, 'clients')
  );
