-- Step 18 (V2): expenses submitted by drivers or the office, reviewed by the office (BR-115:
-- submitted -> approved | rejected). Receipts in a private bucket, one folder per company.
-- Writes need the 'expenses' feature (V2) like every SaaS table (ADR-022).

create type public.expense_category as enum ('fuel', 'toll', 'parking', 'maintenance', 'meal', 'other');
create type public.expense_status as enum ('submitted', 'approved', 'rejected');

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  category public.expense_category not null,
  amount_cents bigint not null check (amount_cents > 0 and amount_cents <= 100000000),
  spent_on date not null,
  description text check (char_length(description) <= 300),
  trip_id uuid,
  vehicle_id uuid,
  driver_id uuid,
  -- Private storage path, prefixed by the company id (docs/SECURITY.md 2.4).
  receipt_path text check (receipt_path is null or receipt_path like company_id::text || '/%'),
  status public.expense_status not null default 'submitted',
  rejection_reason text check (char_length(rejection_reason) <= 300),
  submitted_by uuid references auth.users (id) on delete set null default auth.uid(),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  -- Client generated id of an offline submission: replaying the queue never duplicates.
  client_ref uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'rejected' or rejection_reason is not null),
  foreign key (trip_id, company_id) references public.trips (id, company_id),
  foreign key (vehicle_id, company_id) references public.vehicles (id, company_id),
  foreign key (driver_id, company_id) references public.drivers (id, company_id)
);

create index expenses_company_idx on public.expenses (company_id, spent_on desc);
create trigger expenses_updated_at before update on public.expenses
  for each row execute function private.set_updated_at();
create trigger expenses_audit after insert or update on public.expenses
  for each row execute function private.audit_changes('expense', 'status', 'amount_cents', 'rejection_reason');

/** The driver record of the signed-in user in a company, if any. */
create function private.current_driver_id(p_company uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select d.id from public.drivers d
  where d.company_id = p_company and d.user_id = (select auth.uid()) and d.status = 'active'
  limit 1;
$$;

/**
 * Who may change what: reviewers (owner, manager, accountant) decide on submitted expenses;
 * the author edits its own expense while it is submitted; a decided expense is final.
 */
create function private.guard_expense()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reviewer boolean := private.has_role(new.company_id, '{owner,manager,accountant}');
begin
  if tg_op = 'INSERT' then
    if new.status <> 'submitted' then
      raise exception 'an expense starts submitted' using errcode = 'MT005';
    end if;
    -- A driver files expenses in their own name only.
    if not private.has_role(new.company_id, '{owner,manager,dispatcher,accountant}') then
      new.driver_id := private.current_driver_id(new.company_id);
      if new.driver_id is null then
        raise exception 'not a driver of this company' using errcode = '42501';
      end if;
    end if;
    new.reviewed_by := null;
    new.reviewed_at := null;
    return new;
  end if;

  if old.status <> 'submitted' then
    raise exception 'a reviewed expense is final' using errcode = 'MT006';
  end if;
  if new.status <> old.status then
    if not v_reviewer then
      raise exception 'only owners, managers and accountants review expenses' using errcode = '42501';
    end if;
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  end if;
  return new;
end;
$$;

create trigger expenses_guard before insert or update on public.expenses
  for each row execute function private.guard_expense();

alter table public.expenses enable row level security;
revoke all on public.expenses from anon;

create policy "expenses: office roles read all, drivers read their own" on public.expenses
  for select to authenticated
  using (
    private.has_role(company_id, '{owner,manager,dispatcher,accountant}')
    or (driver_id is not null and driver_id = private.current_driver_id(company_id))
    or private.is_platform_admin()
  );
create policy "expenses: members file expenses with the V2 offer" on public.expenses
  for insert to authenticated
  with check (
    private.has_role(company_id, '{owner,manager,dispatcher,accountant,driver}')
    and private.has_feature(company_id, 'expenses')
  );
create policy "expenses: reviewers and authors update with the V2 offer" on public.expenses
  for update to authenticated
  using (
    private.has_feature(company_id, 'expenses')
    and (
      private.has_role(company_id, '{owner,manager,accountant}')
      or (submitted_by = (select auth.uid()) and status = 'submitted')
    )
  )
  with check (private.has_feature(company_id, 'expenses'));
-- No delete: a wrong expense is rejected with a reason (history kept).

-- Receipts: private bucket, 10 MB, images and PDF.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('expense-receipts', 'expense-receipts', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

create policy "expense receipts: office roles and the uploader read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'expense-receipts'
    and (
      private.has_role(private.storage_company_id(name), '{owner,manager,dispatcher,accountant}')
      or owner_id = (select auth.uid())::text
    )
  );
create policy "expense receipts: members upload to their company folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'expense-receipts'
    and private.has_role(private.storage_company_id(name), '{owner,manager,dispatcher,accountant,driver}')
    and private.has_feature(private.storage_company_id(name), 'expenses')
  );
