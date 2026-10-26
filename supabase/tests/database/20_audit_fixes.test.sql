-- Security audit of 2026-10-26: findings 1, 2 and 6.
--   Policies of booking_events, credit_notes, commission_statement_payments and plan_features,
--   drivers no longer upload receipts directly, a driver's expense only references its own receipt.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'owner-a@test.local'),
  ('a0000000-0000-0000-0000-000000000003', 'driver-a@test.local'),
  ('b0000000-0000-0000-0000-000000000001', 'owner-b@test.local');
insert into public.companies (id, legal_name, ice, if_number, rc_number, address) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Atlas Transport SARL', '000000000000001', '1', 'RC 1', '1 rue A'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Sahara Tours SARL', null, null, null, null);
insert into public.company_members (company_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'owner'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003', 'driver'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', 'owner');
insert into public.drivers (company_id, user_id, full_name, phone, license_number, license_expires_on) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003', 'Youssef', '+212600000001', 'L-1', '2099-01-01');

-- Fixtures written by the system: a booking event, an issued then credited invoice, a statement payment.
insert into public.bookings (id, public_ref, company_id, traveler_name, traveler_email, traveler_phone,
  passengers, from_city_id, to_city_id, pickup_address, dropoff_address, pickup_at, vehicle_type_code,
  total_cents, commission_rate_bps, commission_cents, carrier_cents, cancellation_policy, payment_method,
  status, accept_deadline)
select 'eeeeeeee-0000-4000-8000-000000000001', 'MTR-CCCCC2', 'aaaaaaaa-0000-0000-0000-000000000000', 'Emma',
  't@test.local', '+33600000001', 1, c.id, c.id, 'A street', 'B street', now(), 'sedan', 80000, 2000, 16000, 64000,
  '{"tiers": []}', 'cash_to_driver', 'completed', now()
from public.cities c where c.slug = 'casablanca';
insert into public.booking_events (booking_id, company_id, event) values
  ('eeeeeeee-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'created');
insert into public.clients (id, company_id, type, name) values
  ('cccccccc-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'b2c', 'Emma Martin');
insert into public.invoices (id, company_id, client_id) values
  ('dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'cccccccc-0000-4000-8000-000000000001');
insert into public.invoice_lines (invoice_id, company_id, description, quantity, unit_price_cents, vat_rate_bps) values
  ('dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Transfert', 1, 50000, 0);
insert into public.commission_statements (id, company_id, month, total_cents, due_date) values
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', '2025-02-01', 16000, '2025-03-10');
insert into public.commission_statement_payments (statement_id, company_id, amount_cents, method, received_on) values
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 16000, 'cash', '2025-03-05');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select public.issue_invoice('dddddddd-0000-4000-8000-000000000001');
select public.create_credit_note('dddddddd-0000-4000-8000-000000000001', 'Erreur');

-- Owner A reads the company's records, never writes them directly.
select is((select count(*) from public.booking_events where company_id = 'aaaaaaaa-0000-0000-0000-000000000000'), 1::bigint,
  'the owner reads the booking history');
select throws_ok($$ insert into public.booking_events (booking_id, company_id, event)
  values ('eeeeeeee-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'forged') $$,
  '42501', null, 'nobody writes the booking history directly');
select is((select count(*) from public.credit_notes where company_id = 'aaaaaaaa-0000-0000-0000-000000000000'), 1::bigint,
  'the owner reads the credit notes');
select throws_ok($$ insert into public.credit_notes (company_id, invoice_id, number, year, issue_date, reason, subtotal_cents, vat_cents, total_cents)
  values ('aaaaaaaa-0000-0000-0000-000000000000', 'dddddddd-0000-4000-8000-000000000001', 'AV-X', 2026, current_date, 'Forged', 1, 0, 1) $$,
  '42501', null, 'credit notes are only created by create_credit_note');
select is((select count(*) from public.commission_statement_payments where company_id = 'aaaaaaaa-0000-0000-0000-000000000000'), 1::bigint,
  'the owner reads the payments of their statements');
select throws_ok($$ insert into public.commission_statement_payments (statement_id, company_id, amount_cents, method, received_on)
  values ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 1, 'cash', current_date) $$,
  '42501', null, 'a carrier cannot record a statement payment');
select is(public.receipt_upload_allowed('aaaaaaaa-0000-0000-0000-000000000000'), true,
  'office members may attach receipts');

-- Driver A ----------------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000003", "role": "authenticated", "aal": "aal1"}', true);
select is((select count(*) from public.booking_events), 0::bigint, 'a driver does not read the booking history');
select is(public.receipt_upload_allowed('aaaaaaaa-0000-0000-0000-000000000000'), true,
  'a driver may send a receipt through the server route');
select throws_ok($$ insert into storage.objects (bucket_id, name, owner_id)
  values ('expense-receipts', 'aaaaaaaa-0000-0000-0000-000000000000/direct.jpg', 'a0000000-0000-0000-0000-000000000003') $$,
  '42501', null, 'a driver cannot write the receipts bucket directly (finding 1)');
select throws_ok($$ insert into public.expenses (company_id, category, amount_cents, spent_on, client_ref, receipt_path)
  values ('aaaaaaaa-0000-0000-0000-000000000000', 'fuel', 1000, current_date, '99999999-0000-4000-8000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000000/someone-else.jpg') $$,
  '42501', null, 'a driver cannot attach another member''s receipt (finding 6)');
select lives_ok($$ insert into public.expenses (company_id, category, amount_cents, spent_on, client_ref, receipt_path)
  values ('aaaaaaaa-0000-0000-0000-000000000000', 'fuel', 1000, current_date, '99999999-0000-4000-8000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000000/99999999-0000-4000-8000-000000000002.jpg') $$,
  'a driver attaches their own receipt');

-- Company B and anonymous visitors ------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "b0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select is((select count(*) from public.credit_notes where company_id = 'aaaaaaaa-0000-0000-0000-000000000000'), 0::bigint,
  'another company sees no credit note of company A');

reset role;
set local role anon;
select ok((select count(*) from public.plan_features) > 0, 'the offers comparison (plan features) is public');

select * from finish();
rollback;
