-- Step 10: invoices, credit notes and payments of the carriers' clients.
--   BR-107 gapless numbering per company and year, assigned when the invoice is issued.
--   BR-108 an issued invoice is immutable; it is cancelled only by a full credit note.
--   BR-109 seller and buyer legal details are frozen at issue (list of mentions À VÉRIFIER).
--   BR-110 / BR-111 VAT rate per line (no rate imposed), computed and rounded per line.
-- Custom SQLSTATEs: MT007 locked invoice, MT008 payment refused, MT009 seller details missing,
--   MT010 B2B client without ICE, MT011 empty invoice.

create type public.invoice_status as enum ('draft', 'issued', 'partially_paid', 'paid', 'cancelled');
create type public.invoice_payment_method as enum ('bank_transfer', 'cash', 'cheque', 'other');

-- Composite key so that an invoice line can only reference a trip of its own company.
alter table public.trips add constraint trips_id_company_key unique (id, company_id);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  client_id uuid not null,
  status public.invoice_status not null default 'draft',
  -- Set at issue only (BR-107), e.g. 2026-000123.
  number text,
  year integer,
  issue_date date,
  due_date date,
  notes text check (char_length(notes) <= 1000),
  subtotal_cents bigint not null default 0 check (subtotal_cents >= 0),
  vat_cents bigint not null default 0 check (vat_cents >= 0),
  total_cents bigint not null default 0 check (total_cents >= 0),
  paid_cents bigint not null default 0 check (paid_cents >= 0),
  -- Legal details frozen at issue (BR-109).
  seller jsonb,
  buyer jsonb,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, number),
  unique (id, company_id),
  check ((status = 'draft') = (number is null)),
  check (due_date is null or issue_date is null or due_date >= issue_date),
  foreign key (client_id, company_id) references public.clients (id, company_id)
);

create index invoices_company_idx on public.invoices (company_id, created_at desc);
create index invoices_client_idx on public.invoices (client_id);
create trigger invoices_updated_at before update on public.invoices
  for each row execute function private.set_updated_at();

create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null,
  company_id uuid not null,
  position integer not null default 0,
  description text not null check (char_length(description) between 2 and 300),
  quantity integer not null check (quantity between 1 and 10000),
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  -- 2000 = 20 %. No default: the rate is always chosen (ADR-007).
  vat_rate_bps integer not null check (vat_rate_bps between 0 and 10000),
  subtotal_cents bigint not null default 0,
  vat_cents bigint not null default 0,
  total_cents bigint not null default 0,
  trip_id uuid,
  created_at timestamptz not null default now(),
  foreign key (invoice_id, company_id) references public.invoices (id, company_id) on delete cascade,
  foreign key (trip_id, company_id) references public.trips (id, company_id)
);

create index invoice_lines_invoice_idx on public.invoice_lines (invoice_id, position);
create index invoice_lines_trip_idx on public.invoice_lines (trip_id) where trip_id is not null;

create table public.credit_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  invoice_id uuid not null,
  number text not null,
  year integer not null,
  issue_date date not null,
  reason text not null check (char_length(reason) between 3 and 300),
  subtotal_cents bigint not null,
  vat_cents bigint not null,
  total_cents bigint not null,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (company_id, number),
  -- Full credit notes only in the MVP: at most one per invoice.
  unique (invoice_id),
  foreign key (invoice_id, company_id) references public.invoices (id, company_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  invoice_id uuid not null,
  amount_cents bigint not null check (amount_cents > 0),
  method public.invoice_payment_method not null,
  paid_on date not null,
  reference text check (char_length(reference) <= 120),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (invoice_id, company_id) references public.invoices (id, company_id)
);

create index payments_invoice_idx on public.payments (invoice_id);

-- Counters behind the gapless numbering: written only by the security definer functions below.
create table private.document_sequences (
  company_id uuid not null references public.companies (id) on delete cascade,
  kind text not null check (kind in ('invoice', 'credit_note')),
  year integer not null,
  last_number integer not null,
  primary key (company_id, kind, year)
);

/**
 * Next number of a company's document series. The row lock taken by the upsert is held until
 * the end of the transaction: concurrent issues wait, and a rolled back issue gives its number
 * back. Hence no gap and no duplicate (BR-107).
 */
create function private.next_document_number(p_company uuid, p_kind text, p_year integer)
returns integer
language sql
security definer
set search_path = ''
as $$
  insert into private.document_sequences (company_id, kind, year, last_number)
  values (p_company, p_kind, p_year, 1)
  on conflict (company_id, kind, year)
    do update set last_number = private.document_sequences.last_number + 1
  returning last_number;
$$;

-- ---------------------------------------------------------------------------
-- Line amounts and invoice totals (BR-111: per line, half-up, totals = sum of lines)
-- ---------------------------------------------------------------------------
create function private.compute_invoice_line()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.subtotal_cents := new.quantity::bigint * new.unit_price_cents;
  new.vat_cents := (new.subtotal_cents * new.vat_rate_bps + 5000) / 10000;
  new.total_cents := new.subtotal_cents + new.vat_cents;
  return new;
end;
$$;

create trigger invoice_lines_compute before insert or update on public.invoice_lines
  for each row execute function private.compute_invoice_line();

create function private.guard_invoice_line()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice uuid := coalesce(new.invoice_id, old.invoice_id);
begin
  if (select status from public.invoices where id = v_invoice) <> 'draft' then
    raise exception 'invoice is not a draft' using errcode = 'MT007';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger invoice_lines_guard before insert or update or delete on public.invoice_lines
  for each row execute function private.guard_invoice_line();

create function private.refresh_invoice_totals()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice uuid := coalesce(new.invoice_id, old.invoice_id);
begin
  update public.invoices i set
    subtotal_cents = coalesce(t.subtotal, 0),
    vat_cents = coalesce(t.vat, 0),
    total_cents = coalesce(t.total, 0)
  from (
    select sum(subtotal_cents) as subtotal, sum(vat_cents) as vat, sum(total_cents) as total
    from public.invoice_lines where invoice_id = v_invoice
  ) t
  where i.id = v_invoice and i.status = 'draft';
  return null;
end;
$$;

create trigger invoice_lines_totals after insert or update or delete on public.invoice_lines
  for each row execute function private.refresh_invoice_totals();

-- ---------------------------------------------------------------------------
-- Immutability of issued invoices (BR-108)
-- ---------------------------------------------------------------------------
create function private.guard_invoice()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'an issued invoice is never deleted' using errcode = 'MT007';
    end if;
    return old;
  end if;
  if new.company_id <> old.company_id then
    raise exception 'company is immutable' using errcode = 'MT007';
  end if;
  if old.status = 'draft' then
    -- Issuing goes through public.issue_invoice only (number, snapshots).
    if new.status <> 'draft' and current_setting('mtr.issuing', true) is distinct from 'on' then
      raise exception 'use issue_invoice' using errcode = 'MT007';
    end if;
    return new;
  end if;
  -- Issued: only the payment status and the paid amount move (payments, credit note).
  if (new.client_id, new.number, new.year, new.issue_date, new.due_date, new.notes,
      new.subtotal_cents, new.vat_cents, new.total_cents, new.seller, new.buyer)
     is distinct from
     (old.client_id, old.number, old.year, old.issue_date, old.due_date, old.notes,
      old.subtotal_cents, old.vat_cents, old.total_cents, old.seller, old.buyer)
     or (new.status = 'draft') or (old.status = 'cancelled') then
    raise exception 'an issued invoice is immutable' using errcode = 'MT007';
  end if;
  return new;
end;
$$;

create trigger invoices_guard before update or delete on public.invoices
  for each row execute function private.guard_invoice();

/** Issues a draft: number, dates and frozen legal details (BR-107, BR-109). */
create function public.issue_invoice(p_invoice_id uuid, p_due_date date default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice public.invoices;
  v_company public.companies;
  v_client public.clients;
  v_today date := (now() at time zone 'Africa/Casablanca')::date;
  v_year integer := extract(year from (now() at time zone 'Africa/Casablanca'))::integer;
  v_number text;
begin
  select * into v_invoice from public.invoices where id = p_invoice_id for update;
  if not found
     or not private.has_role(v_invoice.company_id, '{owner,manager,accountant}')
     or not private.has_feature(v_invoice.company_id, 'invoicing') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_invoice.status <> 'draft' then
    raise exception 'already issued' using errcode = 'MT007';
  end if;
  if not exists (select 1 from public.invoice_lines where invoice_id = p_invoice_id) then
    raise exception 'empty invoice' using errcode = 'MT011';
  end if;

  select * into v_company from public.companies where id = v_invoice.company_id;
  if v_company.ice is null or v_company.if_number is null or v_company.rc_number is null
     or v_company.address is null then
    raise exception 'seller legal details missing' using errcode = 'MT009';
  end if;
  select * into v_client from public.clients where id = v_invoice.client_id;
  if v_client.type = 'b2b' and v_client.ice is null then
    raise exception 'B2B client without ICE' using errcode = 'MT010';
  end if;

  v_number := v_year || '-' || lpad(
    private.next_document_number(v_invoice.company_id, 'invoice', v_year)::text, 6, '0');

  perform set_config('mtr.issuing', 'on', true);
  update public.invoices set
    status = 'issued',
    number = v_number,
    year = v_year,
    issue_date = v_today,
    due_date = coalesce(p_due_date, v_invoice.due_date, v_today),
    seller = jsonb_build_object(
      'legal_name', v_company.legal_name, 'trade_name', v_company.trade_name,
      'ice', v_company.ice, 'if_number', v_company.if_number, 'rc_number', v_company.rc_number,
      'tp_number', v_company.tp_number, 'address', v_company.address,
      'license_number', v_company.license_number),
    buyer = jsonb_build_object(
      'type', v_client.type, 'name', v_client.name, 'ice', v_client.ice,
      'address', v_client.address, 'email', v_client.email)
  where id = p_invoice_id;
  perform set_config('mtr.issuing', 'off', true);
  return v_number;
end;
$$;

revoke execute on function public.issue_invoice(uuid, date) from public, anon;
grant execute on function public.issue_invoice(uuid, date) to authenticated;

/** Full credit note: cancels an issued invoice (BR-108, BR-112). */
create function public.create_credit_note(p_invoice_id uuid, p_reason text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice public.invoices;
  v_year integer := extract(year from (now() at time zone 'Africa/Casablanca'))::integer;
  v_number text;
begin
  select * into v_invoice from public.invoices where id = p_invoice_id for update;
  if not found
     or not private.has_role(v_invoice.company_id, '{owner,manager,accountant}')
     or not private.has_feature(v_invoice.company_id, 'invoicing') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_invoice.status in ('draft', 'cancelled') then
    raise exception 'only an issued invoice can be credited' using errcode = 'MT007';
  end if;

  v_number := 'AV-' || v_year || '-' || lpad(
    private.next_document_number(v_invoice.company_id, 'credit_note', v_year)::text, 6, '0');
  insert into public.credit_notes (company_id, invoice_id, number, year, issue_date, reason,
    subtotal_cents, vat_cents, total_cents)
  values (v_invoice.company_id, p_invoice_id, v_number, v_year,
    (now() at time zone 'Africa/Casablanca')::date, p_reason,
    v_invoice.subtotal_cents, v_invoice.vat_cents, v_invoice.total_cents);
  update public.invoices set status = 'cancelled' where id = p_invoice_id;
  return v_number;
end;
$$;

revoke execute on function public.create_credit_note(uuid, text) from public, anon;
grant execute on function public.create_credit_note(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Payments update the invoice status (issued -> partially_paid -> paid)
-- ---------------------------------------------------------------------------
create function private.check_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice public.invoices;
begin
  select * into v_invoice from public.invoices where id = new.invoice_id for update;
  if v_invoice.status not in ('issued', 'partially_paid') then
    raise exception 'invoice cannot receive a payment' using errcode = 'MT008';
  end if;
  if v_invoice.paid_cents + new.amount_cents > v_invoice.total_cents then
    raise exception 'payment exceeds the amount due' using errcode = 'MT008';
  end if;
  return new;
end;
$$;

create trigger payments_check before insert on public.payments
  for each row execute function private.check_payment();

create function private.refresh_invoice_payments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice uuid := coalesce(new.invoice_id, old.invoice_id);
  v_paid bigint;
begin
  select coalesce(sum(amount_cents), 0) into v_paid from public.payments where invoice_id = v_invoice;
  update public.invoices set
    paid_cents = v_paid,
    status = case
      when status = 'cancelled' then status
      when v_paid = 0 then 'issued'::public.invoice_status
      when v_paid >= total_cents then 'paid'::public.invoice_status
      else 'partially_paid'::public.invoice_status
    end
  where id = v_invoice;
  return null;
end;
$$;

create trigger payments_refresh after insert or delete on public.payments
  for each row execute function private.refresh_invoice_payments();

create trigger invoices_audit after insert or update on public.invoices
  for each row execute function private.audit_changes('invoice', 'status', 'number', 'total_cents');
create trigger credit_notes_audit after insert on public.credit_notes
  for each row execute function private.audit_changes('credit_note', 'number', 'reason', 'total_cents');
create trigger payments_audit after insert or delete on public.payments
  for each row execute function private.audit_changes('payment', 'amount_cents', 'method', 'paid_on');

-- ---------------------------------------------------------------------------
-- RLS: owners, managers and accountants (ADR-022 convention)
-- ---------------------------------------------------------------------------
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.credit_notes enable row level security;
alter table public.payments enable row level security;
alter table private.document_sequences enable row level security;
revoke all on public.invoices, public.invoice_lines, public.credit_notes, public.payments from anon;
revoke all on private.document_sequences from anon, authenticated;

create policy "invoices: finance roles and admins read" on public.invoices
  for select to authenticated
  using (private.has_role(company_id, '{owner,manager,accountant}') or private.is_platform_admin());
create policy "invoices: finance roles create drafts" on public.invoices
  for insert to authenticated
  with check (
    status = 'draft'
    and private.has_role(company_id, '{owner,manager,accountant}')
    and private.has_feature(company_id, 'invoicing')
  );
create policy "invoices: finance roles update" on public.invoices
  for update to authenticated
  using (private.has_role(company_id, '{owner,manager,accountant}') and private.has_feature(company_id, 'invoicing'))
  with check (private.has_role(company_id, '{owner,manager,accountant}') and private.has_feature(company_id, 'invoicing'));
-- Drafts only (the guard trigger refuses issued invoices).
create policy "invoices: finance roles delete drafts" on public.invoices
  for delete to authenticated
  using (
    status = 'draft'
    and private.has_role(company_id, '{owner,manager,accountant}')
    and private.has_feature(company_id, 'invoicing')
  );

create policy "invoice lines: finance roles and admins read" on public.invoice_lines
  for select to authenticated
  using (private.has_role(company_id, '{owner,manager,accountant}') or private.is_platform_admin());
create policy "invoice lines: finance roles write" on public.invoice_lines
  for all to authenticated
  using (private.has_role(company_id, '{owner,manager,accountant}') and private.has_feature(company_id, 'invoicing'))
  with check (private.has_role(company_id, '{owner,manager,accountant}') and private.has_feature(company_id, 'invoicing'));

-- Credit notes are created by public.create_credit_note only and never changed.
create policy "credit notes: finance roles and admins read" on public.credit_notes
  for select to authenticated
  using (private.has_role(company_id, '{owner,manager,accountant}') or private.is_platform_admin());

create policy "payments: finance roles and admins read" on public.payments
  for select to authenticated
  using (private.has_role(company_id, '{owner,manager,accountant}') or private.is_platform_admin());
create policy "payments: finance roles record" on public.payments
  for insert to authenticated
  with check (private.has_role(company_id, '{owner,manager,accountant}') and private.has_feature(company_id, 'payments'));
-- A wrong payment can be removed (audited), the invoice status is recomputed.
create policy "payments: finance roles remove" on public.payments
  for delete to authenticated
  using (private.has_role(company_id, '{owner,manager,accountant}') and private.has_feature(company_id, 'payments'));
