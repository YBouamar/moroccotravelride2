-- Q19 (2026-10-25): carriers turn their marketplace visibility on or off themselves
-- (marketplace_enabled), but an admin suspension (e.g. unpaid commission statement, BR-009d)
-- blocks visibility and only an admin can lift it.
-- Visible on the marketplace = status 'verified' and marketplace_enabled and not suspended.

alter table public.companies
  add column marketplace_suspended_at timestamptz,
  add column marketplace_suspension_reason text
    check (char_length(marketplace_suspension_reason) <= 300);

create or replace function private.guard_company_admin_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated')
     and not private.is_platform_admin()
     and (new.status is distinct from old.status
       or new.commission_rate is distinct from old.commission_rate
       or new.marketplace_suspended_at is distinct from old.marketplace_suspended_at
       or new.marketplace_suspension_reason is distinct from old.marketplace_suspension_reason) then
    raise exception 'only a platform admin can change status, commission or marketplace suspension'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
