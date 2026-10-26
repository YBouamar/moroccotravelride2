-- Phase 6: KPIs (admin only), reviews (completed bookings only, admin moderation), ratings.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'owner-a@test.local'),
  ('d0000000-0000-0000-0000-000000000001', 'admin@test.local');
update public.profiles set is_platform_admin = true where id = 'd0000000-0000-0000-0000-000000000001';
insert into public.companies (id, legal_name, status) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Atlas Transport SARL', 'verified');
insert into public.company_members (company_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'owner');
insert into public.bookings (id, public_ref, company_id, traveler_name, traveler_email, traveler_phone,
  passengers, from_city_id, to_city_id, pickup_address, dropoff_address, pickup_at, vehicle_type_code,
  total_cents, commission_rate_bps, commission_cents, carrier_cents, cancellation_policy, payment_method,
  status, accept_deadline)
select v.id::uuid, v.ref, 'aaaaaaaa-0000-0000-0000-000000000000', 'Emma Martin', 't@test.local', '+33600000001',
  1, c.id, c.id, 'A street', 'B street', now(), 'sedan', 80000, 2000, 16000, 64000, '{"tiers": []}',
  'cash_to_driver', v.status::public.booking_status, now()
from (values ('eeeeeeee-0000-4000-8000-000000000001', 'MTR-BBBBB2', 'completed'),
             ('eeeeeeee-0000-4000-8000-000000000002', 'MTR-BBBBB3', 'confirmed')) as v(id, ref, status),
  public.cities c where c.slug = 'casablanca';

set local role service_role;
select isnt(public.submit_review('eeeeeeee-0000-4000-8000-000000000001', 5, 'Chauffeur ponctuel'), null,
  'a traveler reviews a completed booking');
select throws_ok($$ select public.submit_review('eeeeeeee-0000-4000-8000-000000000002', 4, '') $$, 'MT024', null,
  'a booking not completed cannot be reviewed');
select throws_ok($$ select public.submit_review('eeeeeeee-0000-4000-8000-000000000001', 1, 'Again') $$, '23505', null,
  'a booking is reviewed only once');
select is((select traveler_name from public.reviews where booking_id = 'eeeeeeee-0000-4000-8000-000000000001'), 'Emma', 'only the first name is shown');

reset role;
set local role anon;
select is_empty($$ select * from public.carrier_ratings(array['aaaaaaaa-0000-0000-0000-000000000000'::uuid]) $$,
  'a review pending moderation does not count');

reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select is_empty($$ update public.reviews set status = 'published' where booking_id = 'eeeeeeee-0000-4000-8000-000000000001' returning id $$, 'a carrier cannot moderate its reviews');
select throws_ok($$ select public.admin_kpis() $$, '42501', null, 'KPIs are reserved to admins');

select set_config('request.jwt.claims',
  '{"sub": "d0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}', true);
update public.reviews set status = 'published' where booking_id = 'eeeeeeee-0000-4000-8000-000000000001';
select is((select (average, reviews)::text from public.carrier_ratings(array['aaaaaaaa-0000-0000-0000-000000000000'::uuid])),
  '(5.0,1)', 'a published review counts in the rating');
select ok((public.admin_kpis() ->> 'gmv_cents')::bigint >= 80000, 'the admin reads the GMV of the month');

select * from finish();
rollback;
