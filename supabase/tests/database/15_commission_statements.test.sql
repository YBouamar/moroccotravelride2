-- Monthly commission statements: generation, admin payments, overdue and suspension, RLS.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'owner-a@test.local'),
  ('a0000000-0000-0000-0000-000000000002', 'dispatcher-a@test.local'),
  ('d0000000-0000-0000-0000-000000000001', 'admin@test.local');
update public.profiles set is_platform_admin = true where id = 'd0000000-0000-0000-0000-000000000001';
insert into public.companies (id, legal_name, status, marketplace_enabled, license_expires_on) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Atlas Transport SARL', 'verified', true, '2099-12-31');
insert into public.company_members (company_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'owner'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002', 'dispatcher');

-- Two bookings completed in September 2026 (Morocco time), commission 160 and 40 MAD.
insert into public.bookings (id, public_ref, company_id, traveler_name, traveler_email, traveler_phone,
  passengers, from_city_id, to_city_id, pickup_address, dropoff_address, pickup_at, vehicle_type_code,
  total_cents, commission_rate_bps, commission_cents, carrier_cents, cancellation_policy, payment_method,
  status, accept_deadline)
select v.id::uuid, v.ref, 'aaaaaaaa-0000-0000-0000-000000000000', 'Traveler', 't@test.local', '+33600000001',
  1, c.id, c.id, 'A street', 'B street', '2026-09-10 10:00+00', 'sedan', v.total, 2000, v.commission,
  v.total - v.commission, '{"tiers": []}', 'cash_to_driver', 'completed', '2026-09-01 10:00+00'
from (values ('eeeeeeee-0000-4000-8000-000000000001', 'MTR-AAAAA2', 80000, 16000),
             ('eeeeeeee-0000-4000-8000-000000000002', 'MTR-AAAAA3', 20000, 4000)) as v(id, ref, total, commission),
  public.cities c where c.slug = 'casablanca';
insert into public.commission_ledger (company_id, booking_id, kind, amount_cents, occurred_at) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'eeeeeeee-0000-4000-8000-000000000001', 'completed', 16000, '2026-09-10 12:00+00'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'eeeeeeee-0000-4000-8000-000000000002', 'completed', 4000, '2026-09-30 23:30+00');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select throws_ok($$ select public.generate_commission_statements('2026-09-01') $$, '42501', null,
  'a carrier cannot generate statements');

select set_config('request.jwt.claims',
  '{"sub": "d0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}', true);
select is(public.generate_commission_statements('2026-09-01'), 1, 'the admin generates the September statements');
-- 23:30 UTC on 30 September is already 1 October in Morocco only in UTC+1 periods: count what the month holds.
select is(
  (select total_cents from public.commission_statements where company_id = 'aaaaaaaa-0000-0000-0000-000000000000' and month = '2026-09-01'),
  (select sum(amount_cents) from public.commission_ledger where statement_id is not null)::bigint,
  'the statement totals its ledger lines');
select is(public.generate_commission_statements('2026-09-01'), 0, 'generating again adds nothing');
select throws_ok(
  $$ select public.record_statement_payment((select id from public.commission_statements limit 1), 999999, 'cash', '2026-10-05') $$,
  'MT008', null, 'a payment cannot exceed the statement');
select lives_ok(
  $$ select public.record_statement_payment(s.id, s.total_cents, 'instant_transfer', '2026-10-05', 'VIR-1')
     from public.commission_statements s limit 1 $$,
  'the admin records the full payment');
select is((select status::text from public.commission_statements limit 1), 'paid', 'the statement is paid');

-- Overdue and suspension ---------------------------------------------------------------------
reset role;
update public.commission_statements set status = 'issued', paid_cents = 0, due_date = current_date - 30;
select is(private.process_overdue_statements(), 1, 'an unpaid statement past due + 15 days suspends the carrier');
select isnt((select marketplace_suspended_at from public.companies where id = 'aaaaaaaa-0000-0000-0000-000000000000'), null,
  'the marketplace visibility is suspended');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal1"}', true);
select is((select count(*) from public.commission_statements), 0::bigint, 'a dispatcher does not read statements');

select * from finish();
rollback;
