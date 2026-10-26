-- Step 16: monthly commission statements (ADR-016, BR-009b, BR-009d).
-- Each month, the commissions of the carrier's completed bookings (and retained parts of paid
-- cancellations) are gathered into one statement, paid by the owner in cash or by instant
-- transfer and recorded by a platform admin. Unpaid statements become overdue after the due date
-- and the carrier's marketplace visibility is suspended after `statement_suspension_days`
-- (Q17: 15 days); only an admin lifts the suspension (Q19).

insert into public.platform_settings (key, value, description) values
  ('statement_due_days', '10', 'Jours après la fin du mois pour régler un relevé de commissions (À CONFIRMER)');

create type public.statement_status as enum ('issued', 'paid', 'overdue');
create type public.statement_payment_method as enum ('cash', 'instant_transfer', 'bank_transfer');

create table public.commission_statements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id),
  -- First day of the month covered (Morocco calendar).
  month date not null check (extract(day from month) = 1),
  total_cents bigint not null check (total_cents >= 0),
  paid_cents bigint not null default 0 check (paid_cents >= 0),
  status public.statement_status not null default 'issued',
  due_date date not null,
  issued_at timestamptz not null default now(),
  unique (company_id, month)
);
create index commission_statements_status_idx on public.commission_statements (status, due_date);

alter table public.commission_ledger
  add constraint commission_ledger_statement_fk foreign key (statement_id) references public.commission_statements (id);

create table public.commission_statement_payments (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid not null references public.commission_statements (id),
  company_id uuid not null references public.companies (id),
  amount_cents bigint not null check (amount_cents > 0),
  method public.statement_payment_method not null,
  received_on date not null,
  reference text check (char_length(reference) <= 120),
  recorded_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create trigger commission_statements_audit after insert or update on public.commission_statements
  for each row execute function private.audit_changes('statement', 'status', 'total_cents', 'paid_cents');
create trigger commission_statement_payments_audit after insert on public.commission_statement_payments
  for each row execute function private.audit_changes('statement_payment', 'amount_cents', 'method', 'received_on');

/**
 * Builds the statements of one month (default: the previous Morocco month) from the ledger lines
 * not yet attached to a statement. Idempotent: running it twice does not duplicate anything.
 */
create function private.generate_commission_statements(p_month date default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_month date := coalesce(
    date_trunc('month', p_month)::date,
    (date_trunc('month', (now() at time zone 'Africa/Casablanca')) - interval '1 month')::date);
  v_start timestamptz := v_month::timestamp at time zone 'Africa/Casablanca';
  v_end timestamptz := (v_month + interval '1 month')::timestamp at time zone 'Africa/Casablanca';
  v_due_days integer := coalesce(
    (select value::integer from public.platform_settings where key = 'statement_due_days'), 10);
  v_count integer := 0;
  v_row record;
  v_statement uuid;
begin
  for v_row in
    select company_id, sum(amount_cents) as total
    from public.commission_ledger
    where statement_id is null and occurred_at >= v_start and occurred_at < v_end
    group by company_id
  loop
    insert into public.commission_statements (company_id, month, total_cents, due_date)
    values (v_row.company_id, v_month, v_row.total,
      (v_month + interval '1 month' - interval '1 day')::date + v_due_days)
    on conflict (company_id, month) do update
      set total_cents = public.commission_statements.total_cents + excluded.total_cents,
          status = case when public.commission_statements.status = 'paid'
            then 'issued'::public.statement_status else public.commission_statements.status end
    returning id into v_statement;
    update public.commission_ledger set statement_id = v_statement
    where company_id = v_row.company_id and statement_id is null
      and occurred_at >= v_start and occurred_at < v_end;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

/** Admin trigger of the monthly generation (also run by pg_cron on the 1st of each month). */
create function public.generate_commission_statements(p_month date default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_platform_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return private.generate_commission_statements(p_month);
end;
$$;
revoke execute on function public.generate_commission_statements(date) from public, anon;
grant execute on function public.generate_commission_statements(date) to authenticated;

/** Payment received by the platform (cash or instant transfer), recorded by an admin. */
create function public.record_statement_payment(
  p_statement uuid,
  p_amount_cents bigint,
  p_method public.statement_payment_method,
  p_received_on date,
  p_reference text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_statement public.commission_statements;
begin
  if not private.is_platform_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into v_statement from public.commission_statements where id = p_statement for update;
  if not found or v_statement.status = 'paid'
     or p_amount_cents <= 0 or v_statement.paid_cents + p_amount_cents > v_statement.total_cents then
    raise exception 'payment refused' using errcode = 'MT008';
  end if;
  insert into public.commission_statement_payments (statement_id, company_id, amount_cents, method, received_on, reference)
  values (p_statement, v_statement.company_id, p_amount_cents, p_method, p_received_on, nullif(trim(p_reference), ''));
  update public.commission_statements set
    paid_cents = paid_cents + p_amount_cents,
    status = case when paid_cents + p_amount_cents >= total_cents then 'paid'::public.statement_status else status end
  where id = p_statement;
end;
$$;
revoke execute on function public.record_statement_payment(uuid, bigint, public.statement_payment_method, date, text) from public, anon;
grant execute on function public.record_statement_payment(uuid, bigint, public.statement_payment_method, date, text) to authenticated;

/** Daily: overdue statements, then marketplace suspension after the grace days (BR-009d). */
create function private.process_overdue_statements()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Africa/Casablanca')::date;
  v_grace integer := coalesce(
    (select value::integer from public.platform_settings where key = 'statement_suspension_days'), 15);
  v_count integer;
begin
  update public.commission_statements set status = 'overdue'
  where status = 'issued' and due_date < v_today;

  update public.companies c set
    marketplace_suspended_at = now(),
    marketplace_suspension_reason = 'Relevé de commissions impayé (' || to_char(s.month, 'MM/YYYY') || ')'
  from public.commission_statements s
  where s.company_id = c.id and s.status = 'overdue' and s.due_date + v_grace < v_today
    and c.marketplace_suspended_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

select cron.schedule('generate-commission-statements', '0 5 1 * *', 'select private.generate_commission_statements()');
select cron.schedule('process-overdue-statements', '0 6 * * *', 'select private.process_overdue_statements()');

alter table public.commission_statements enable row level security;
alter table public.commission_statement_payments enable row level security;
revoke all on public.commission_statements, public.commission_statement_payments from anon;
revoke insert, update, delete on public.commission_statements, public.commission_statement_payments from authenticated;

create policy "statements: owners, managers, accountants and admins read" on public.commission_statements
  for select to authenticated
  using (private.has_role(company_id, '{owner,manager,accountant}') or private.is_platform_admin());
create policy "statement payments: owners, managers, accountants and admins read" on public.commission_statement_payments
  for select to authenticated
  using (private.has_role(company_id, '{owner,manager,accountant}') or private.is_platform_admin());
