-- Driver app: own trips only, start/finish, positions only while in progress (BR-201), purge.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'owner-a@test.local'),
  ('a0000000-0000-0000-0000-000000000003', 'driver-a@test.local'),
  ('a0000000-0000-0000-0000-000000000004', 'driver2-a@test.local'),
  ('a0000000-0000-0000-0000-000000000005', 'accountant-a@test.local');
insert into public.companies (id, legal_name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'Atlas Transport SARL');
insert into public.company_members (company_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'owner'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003', 'driver'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000004', 'driver'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000005', 'accountant');
insert into public.drivers (id, company_id, user_id, full_name, phone, license_number, license_expires_on) values
  ('22222222-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003', 'Youssef', '+212600000001', 'L-1', '2099-01-01'),
  ('22222222-0000-4000-8000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000004', 'Hamid', '+212600000002', 'L-2', '2099-01-01');
insert into public.vehicles (id, company_id, registration, brand, model, vehicle_type_code, seats) values
  ('11111111-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', '1-A-1', 'Skoda', 'Superb', 'sedan', 3);
insert into public.trips (id, company_id, passenger_name, passengers, pickup_city_id, pickup_address,
  dropoff_city_id, dropoff_address, starts_at, ends_at, vehicle_id, driver_id)
select '33333333-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Emma', 2, c.id, 'Gare', c.id, 'Riad',
  now() - interval '10 minutes', now() + interval '1 hour', '11111111-0000-4000-8000-000000000001',
  '22222222-0000-4000-8000-000000000001'
from public.cities c where c.slug = 'casablanca';

create temp table point as select jsonb_build_array(jsonb_build_object('lat', 33.5731, 'lng', -7.5898, 'accuracy', 8, 'at', now())) as batch;
grant select on point to authenticated;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000003", "role": "authenticated", "aal": "aal1"}', true);
select throws_ok(
  $$ select public.record_driver_locations('33333333-0000-4000-8000-000000000001', (select batch from point)) $$,
  'MT005', null, 'no position is recorded before the trip starts (BR-201)'
);
select lives_ok(
  $$ select public.driver_set_trip_status('33333333-0000-4000-8000-000000000001', 'in_progress') $$,
  'the driver starts their trip'
);
select is(public.record_driver_locations('33333333-0000-4000-8000-000000000001', (select batch from point)), 1,
  'a position is recorded while the trip is in progress');
select throws_ok(
  $$ select public.driver_set_trip_status('33333333-0000-4000-8000-000000000001', 'cancelled') $$,
  'MT005', null, 'a driver cannot cancel a trip'
);
select throws_ok(
  $$ insert into public.driver_locations (company_id, trip_id, driver_id, latitude, longitude, recorded_at)
     values ('aaaaaaaa-0000-0000-0000-000000000000', '33333333-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000001', 0, 0, now()) $$,
  '42501', null, 'positions are never inserted directly'
);

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000004", "role": "authenticated", "aal": "aal1"}', true);
select throws_ok(
  $$ select public.record_driver_locations('33333333-0000-4000-8000-000000000001', (select batch from point)) $$,
  '42501', null, 'another driver cannot send positions for this trip'
);

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select is((select count(*) from public.live_positions('aaaaaaaa-0000-0000-0000-000000000000')), 1::bigint,
  'the owner sees the live position of the trip');

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000005", "role": "authenticated", "aal": "aal1"}', true);
select is((select count(*) from public.driver_locations), 0::bigint, 'the accountant does not see positions');

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000003", "role": "authenticated", "aal": "aal1"}', true);
select lives_ok(
  $$ select public.driver_set_trip_status('33333333-0000-4000-8000-000000000001', 'completed') $$,
  'the driver completes their trip'
);
select throws_ok(
  $$ select public.record_driver_locations('33333333-0000-4000-8000-000000000001', (select batch from point)) $$,
  'MT005', null, 'no position is recorded after the trip'
);

reset role;
update public.driver_locations set recorded_at = now() - interval '91 days';
select is(private.purge_driver_locations(), 1, 'positions older than 90 days are purged (BR-202)');

select * from finish();
rollback;
