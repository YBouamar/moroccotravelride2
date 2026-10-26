-- Invoicing: RLS, per-line VAT, gapless numbering at issue, immutability, credit notes, payments.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'owner-a@test.local'),
  ('a0000000-0000-0000-0000-000000000002', 'accountant-a@test.local'),
  ('a0000000-0000-0000-0000-000000000003', 'dispatcher-a@test.local'),
  ('b0000000-0000-0000-0000-000000000001', 'owner-b@test.local');
insert into public.companies (id, legal_name, ice, if_number, rc_number, address) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Atlas Transport SARL', '000000000000001', '1234567', 'RC 1', '1 rue A'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Sahara Tours SARL', null, null, null, null);
insert into public.company_members (company_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'owner'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002', 'accountant'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003', 'dispatcher'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', 'owner');
insert into public.clients (id, company_id, type, name, ice) values
  ('cccccccc-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'b2b', 'Agence Découverte', '000000000000101'),
  ('cccccccc-0000-4000-8000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'b2b', 'Hotel sans ICE', null),
  ('cccccccc-0000-4000-8000-000000000009', 'bbbbbbbb-0000-0000-0000-000000000000', 'b2c', 'Client B', null);

-- Accountant A ---------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal1"}', true);

select lives_ok(
  $$ insert into public.invoices (id, company_id, client_id) values
     ('dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'cccccccc-0000-4000-8000-000000000001'),
     ('dddddddd-0000-4000-8000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'cccccccc-0000-4000-8000-000000000001'),
     ('dddddddd-0000-4000-8000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000000', 'cccccccc-0000-4000-8000-000000000002') $$,
  'an accountant creates draft invoices'
);
select lives_ok(
  $$ insert into public.invoice_lines (invoice_id, company_id, description, quantity, unit_price_cents, vat_rate_bps) values
     ('dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Transfert aéroport', 1, 80000, 1000),
     ('dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Attente', 3, 3333, 1000),
     ('dddddddd-0000-4000-8000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'Transfert', 1, 50000, 0),
     ('dddddddd-0000-4000-8000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000000', 'Transfert', 1, 50000, 0) $$,
  'lines are added to drafts'
);
-- 80000 + 8000 VAT ; 3 x 3333 = 9999 + 999.9 -> 1000 VAT (half-up per line)
select is(
  (select array[subtotal_cents, vat_cents, total_cents] from public.invoices where id = 'dddddddd-0000-4000-8000-000000000001'),
  array[89999, 9000, 98999]::bigint[],
  'totals are the sum of lines rounded per line'
);
select throws_ok(
  $$ update public.invoices set status = 'issued', number = 'X-1' where id = 'dddddddd-0000-4000-8000-000000000001' $$,
  'MT007', null, 'a draft cannot be issued by a plain update'
);
select is(public.issue_invoice('dddddddd-0000-4000-8000-000000000001'),
  extract(year from (now() at time zone 'Africa/Casablanca'))::integer || '-000001', 'the first issued invoice gets number 000001');
select is(public.issue_invoice('dddddddd-0000-4000-8000-000000000002'),
  extract(year from (now() at time zone 'Africa/Casablanca'))::integer || '-000002', 'numbers follow without gap');
select throws_ok(
  $$ select public.issue_invoice('dddddddd-0000-4000-8000-000000000003') $$,
  'MT010', null, 'a B2B client without ICE cannot be invoiced'
);
select is(
  (select seller ->> 'ice' from public.invoices where id = 'dddddddd-0000-4000-8000-000000000001'),
  '000000000000001', 'the seller legal details are frozen at issue'
);
select throws_ok(
  $$ update public.invoices set notes = 'changed' where id = 'dddddddd-0000-4000-8000-000000000001' $$,
  'MT007', null, 'an issued invoice is immutable'
);
select throws_ok(
  $$ update public.invoice_lines set unit_price_cents = 1 where invoice_id = 'dddddddd-0000-4000-8000-000000000001' $$,
  'MT007', null, 'the lines of an issued invoice are immutable'
);
select is_empty(
  $$ delete from public.invoices where id = 'dddddddd-0000-4000-8000-000000000001' returning id $$,
  'an issued invoice is never deleted (RLS: drafts only, trigger as a second guard)'
);

-- Payments ---------------------------------------------------------------------------
select lives_ok(
  $$ insert into public.payments (company_id, invoice_id, amount_cents, method, paid_on)
     values ('aaaaaaaa-0000-0000-0000-000000000000', 'dddddddd-0000-4000-8000-000000000001', 50000, 'bank_transfer', '2030-01-01') $$,
  'a partial payment is recorded'
);
select is((select status::text from public.invoices where id = 'dddddddd-0000-4000-8000-000000000001'),
  'partially_paid', 'the invoice becomes partially paid');
select throws_ok(
  $$ insert into public.payments (company_id, invoice_id, amount_cents, method, paid_on)
     values ('aaaaaaaa-0000-0000-0000-000000000000', 'dddddddd-0000-4000-8000-000000000001', 50000, 'cash', '2030-01-02') $$,
  'MT008', null, 'a payment cannot exceed the amount due'
);
select lives_ok(
  $$ insert into public.payments (company_id, invoice_id, amount_cents, method, paid_on)
     values ('aaaaaaaa-0000-0000-0000-000000000000', 'dddddddd-0000-4000-8000-000000000001', 48999, 'cash', '2030-01-02') $$,
  'the balance is paid'
);
select is((select status::text from public.invoices where id = 'dddddddd-0000-4000-8000-000000000001'),
  'paid', 'the invoice becomes paid');

-- Credit note ----------------------------------------------------------------------------
select is(public.create_credit_note('dddddddd-0000-4000-8000-000000000002', 'Erreur de client'),
  'AV-' || extract(year from (now() at time zone 'Africa/Casablanca'))::integer || '-000001',
  'a full credit note gets its own series');
select is((select status::text from public.invoices where id = 'dddddddd-0000-4000-8000-000000000002'),
  'cancelled', 'the credited invoice is cancelled');

-- Dispatcher A and company B ---------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000003", "role": "authenticated", "aal": "aal1"}', true);
select is((select count(*) from public.invoices), 0::bigint, 'a dispatcher does not read invoices');

select set_config('request.jwt.claims',
  '{"sub": "b0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select throws_ok(
  $$ select public.issue_invoice('dddddddd-0000-4000-8000-000000000003') $$,
  '42501', null, 'another company cannot issue company A invoices'
);

select * from finish();
rollback;
