-- Security audit of 2026-10-26, findings 1 and 6.
--   1. Receipts from the driver app go through a server route that checks the real file type:
--      drivers can no longer write the bucket directly.
--   6. A driver's expense can only reference its own receipt ({company_id}/{client_ref}.ext).

/** Whether the signed-in user may attach a receipt for this company (server route check). */
create function public.receipt_upload_allowed(p_company uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_role(p_company, '{owner,manager,dispatcher,accountant,driver}')
    and private.has_feature(p_company, 'expenses');
$$;
revoke execute on function public.receipt_upload_allowed(uuid) from public, anon;
grant execute on function public.receipt_upload_allowed(uuid) to authenticated;

drop policy "expense receipts: members upload to their company folder" on storage.objects;
create policy "expense receipts: office roles upload to their company folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'expense-receipts'
    and private.has_role(private.storage_company_id(name), '{owner,manager,dispatcher,accountant}')
    and private.has_feature(private.storage_company_id(name), 'expenses')
  );

create or replace function private.guard_expense()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reviewer boolean := private.has_role(new.company_id, '{owner,manager,accountant}');
  v_office boolean := private.has_role(new.company_id, '{owner,manager,dispatcher,accountant}');
begin
  if tg_op = 'INSERT' then
    if new.status <> 'submitted' then
      raise exception 'an expense starts submitted' using errcode = 'MT005';
    end if;
    -- A driver files expenses in their own name only, with their own receipt only.
    if not v_office then
      new.driver_id := private.current_driver_id(new.company_id);
      if new.driver_id is null then
        raise exception 'not a driver of this company' using errcode = '42501';
      end if;
      if new.receipt_path is not null and (
        new.client_ref is null
        or new.receipt_path !~ ('^' || new.company_id::text || '/' || new.client_ref::text || '\.(jpg|png|webp|pdf)$')
      ) then
        raise exception 'a driver can only attach their own receipt' using errcode = '42501';
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
  if not v_office and new.receipt_path is distinct from old.receipt_path then
    raise exception 'a driver can only attach their own receipt' using errcode = '42501';
  end if;
  return new;
end;
$$;
