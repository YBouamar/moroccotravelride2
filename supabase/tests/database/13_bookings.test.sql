-- Bookings: creation (service role), frozen commission, acceptance and conversion, trip sync,
-- commission ledger, expiry, traveler cancellation, payment confirmation, RLS.
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'owner-a@test.local'),
  ('a0000000-0000-0000-0000-000000000002', 'dispatcher-a@test.local'),
  ('b0000000-0000-0000-0000-000000000001', 'owner-b@test.local');
insert into public.companies (id, legal_name, trade_name, status, marketplace_enabled, license_expires_on) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Atlas Transport SARL', 'Atlas', 'verified', true, '2099-12-31'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Sahara Tours SARL', 'Sahara', 'verified', true, '2099-12-31');
insert into public.company_members (company_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'owner'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002', 'dispatcher'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', 'owner');
insert into public.vehicles (id, company_id, registration, brand, model, vehicle_type_code, seats) values
  ('11111111-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', '1-A-1', 'Skoda', 'Superb', 'sedan', 3);
insert into public.drivers (id, company_id, full_name, phone, license_number, license_expires_on) values
  ('22222222-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Youssef', '+212600000001', 'L-1', '2099-01-01');
insert into public.price_grids (id, company_id, from_city_id, to_city_id, vehicle_type_code, price_cents)
select '33333333-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', c.id, m.id, 'sedan', 80000
from public.cities c, public.cities m where c.slug = 'casablanca' and m.slug = 'marrakech';

create temp table refs (name text primary key, id uuid, ref text);
grant all on refs to anon, authenticated, service_role;

-- Creation ------------------------------------------------------------------------------
set local role service_role;
insert into refs select 'main', booking_id, public_ref from public.create_booking(
  '33333333-0000-4000-8000-000000000001', now() + interval '5 days', 2, 2, 'Emma Martin',
  'Emma@Example.test', '+33600000001', 'Gare Casa Port', 'Riad Atlas', 'AT201', '', 'bank_transfer', 'fr');
insert into refs select 'refused', booking_id, public_ref from public.create_booking(
  '33333333-0000-4000-8000-000000000001', now() + interval '6 days', 2, 0, 'John Smith',
  'john@example.test', '+33600000002', 'Gare', 'Riad', '', '', 'cash_to_driver', 'en');
insert into refs select 'late', booking_id, public_ref from public.create_booking(
  '33333333-0000-4000-8000-000000000001', now() + interval '7 days', 1, 0, 'Late Carrier',
  'late@example.test', '+33600000003', 'Gare', 'Riad', '', '', 'cash_to_driver', 'fr');
insert into refs select 'cancel', booking_id, public_ref from public.create_booking(
  '33333333-0000-4000-8000-000000000001', now() + interval '30 hours', 1, 0, 'Paid Traveler',
  'paid@example.test', '+33600000004', 'Gare', 'Riad', '', '', 'bank_transfer', 'fr');

select matches((select ref from refs where name = 'main'), '^MTR-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$',
  'the public reference is random and unambiguous');
select is(
  (select array[total_cents, commission_cents, carrier_cents]::bigint[] from public.bookings where id = (select id from refs where name = 'main')),
  array[80000, 16000, 64000]::bigint[],
  '800 MAD at 20 % gives 160 MAD of commission and 640 MAD for the carrier'
);
select is((select traveler_email from public.bookings where id = (select id from refs where name = 'main')),
  'emma@example.test', 'the e-mail is stored in lower case');
select throws_ok(
  $$ select * from public.create_booking('33333333-0000-4000-8000-000000000001', now() + interval '2 hours', 1, 0,
       'Too Soon', 'soon@example.test', '+33600000009', 'Gare', 'Riad', '', '', 'cash_to_driver', 'fr') $$,
  'MT021', null, 'a pickup sooner than the minimum lead time is refused'
);
select throws_ok(
  $$ select * from public.create_booking('33333333-0000-4000-8000-000000000001', now() + interval '5 days', 4, 0,
       'Too Many', 'many@example.test', '+33600000009', 'Gare', 'Riad', '', '', 'cash_to_driver', 'fr') $$,
  'MT020', null, 'an offer without a vehicle large enough is unavailable'
);

reset role;
update public.companies set commission_rate = 0.1500 where id = 'aaaaaaaa-0000-0000-0000-000000000000';
select is((select commission_cents from public.bookings where id = (select id from refs where name = 'main')),
  16000::bigint, 'a later change of rate does not change the booking (frozen)');
update public.bookings set accept_deadline = now() - interval '1 minute' where id = (select id from refs where name = 'late');

set local role anon;
select throws_ok(
  $$ select * from public.create_booking('33333333-0000-4000-8000-000000000001', now() + interval '5 days', 1, 0,
       'Anon', 'anon@example.test', '+33600000009', 'Gare', 'Riad', '', '', 'cash_to_driver', 'fr') $$,
  '42501', null, 'anonymous users cannot create bookings directly (server only)'
);

-- Carrier side ------------------------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal1"}', true);
select is((select count(*) from public.bookings where company_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  4::bigint, 'the dispatcher reads the bookings of the company');
select isnt(public.respond_booking((select id from refs where name = 'main'), true, 240), null,
  'the dispatcher accepts a booking, which creates a trip');
select is(
  (select origin::text || '|' || status::text from public.trips where booking_id = (select id from refs where name = 'main')),
  'marketplace|planned', 'the trip comes from the marketplace (BR-015)');
select is((select status::text from public.bookings where id = (select id from refs where name = 'main')),
  'confirmed', 'the booking is confirmed');
select is(public.respond_booking((select id from refs where name = 'refused'), false, null, 'Plus de véhicule'), null,
  'the dispatcher refuses a booking');
select throws_ok(
  $$ select public.respond_booking((select id from refs where name = 'late'), true) $$,
  'MT023', null, 'a booking cannot be accepted after its deadline'
);

update public.trips set driver_id = '22222222-0000-4000-8000-000000000001', vehicle_id = '11111111-0000-4000-8000-000000000001'
where booking_id = (select id from refs where name = 'main');
select is((select status::text from public.bookings where id = (select id from refs where name = 'main')),
  'assigned', 'assigning the trip assigns the booking');
update public.trips set status = 'in_progress' where booking_id = (select id from refs where name = 'main');
update public.trips set status = 'completed' where booking_id = (select id from refs where name = 'main');
select is((select status::text from public.bookings where id = (select id from refs where name = 'main')),
  'completed', 'completing the trip completes the booking');

select throws_ok(
  $$ select public.confirm_booking_payment((select id from refs where name = 'main')) $$,
  '42501', null, 'a dispatcher cannot confirm a payment'
);
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select lives_ok(
  $$ select public.confirm_booking_payment((select id from refs where name = 'main')) $$,
  'the owner confirms the transfer received'
);
select is(
  (select amount_cents from public.commission_ledger where booking_id = (select id from refs where name = 'main')),
  16000::bigint, 'the completed booking adds its commission to the ledger');

-- Expiry, traveler cancellation -----------------------------------------------------------------
reset role;
select is(private.expire_pending_bookings() >= 1, true, 'the expiry job cancels late bookings');
select is((select cancel_reason from public.bookings where id = (select id from refs where name = 'late')),
  'expired', 'an expired booking is cancelled by the carrier side with reason expired');

update public.bookings set status = 'confirmed', payment_status = 'paid' where id = (select id from refs where name = 'cancel');
set local role service_role;
select is(public.cancel_booking_by_traveler((select id from refs where name = 'cancel'), 'Vol annulé'),
  40000::bigint, 'a paid booking cancelled 30 h before is refunded 50 % (BR-011)');
reset role;

-- Isolation -------------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "b0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select is((select count(*) from public.bookings where company_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  0::bigint, 'another company sees no booking of company A');

select * from finish();
rollback;
