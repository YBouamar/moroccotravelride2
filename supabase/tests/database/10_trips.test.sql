-- Trips: RLS, status machine (BR-113), conflicts and override (BR-114), license rule (Q24).
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'owner-a@test.local'),
  ('a0000000-0000-0000-0000-000000000002', 'dispatcher-a@test.local'),
  ('a0000000-0000-0000-0000-000000000003', 'driver-a@test.local'),
  ('b0000000-0000-0000-0000-000000000001', 'owner-b@test.local');
insert into public.companies (id, legal_name) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Atlas Transport SARL'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Sahara Tours SARL');
insert into public.company_members (company_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'owner'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002', 'dispatcher'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003', 'driver'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', 'owner');
insert into public.vehicles (id, company_id, registration, brand, model, vehicle_type_code, seats, status) values
  ('11111111-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', '1-A-1', 'Mercedes', 'Vito', 'van', 7, 'active'),
  ('11111111-0000-4000-8000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', '2-A-1', 'Toyota', 'Prado', 'suv_4x4', 4, 'maintenance'),
  ('11111111-0000-4000-8000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000000', '3-A-1', 'Skoda', 'Superb', 'sedan', 3, 'active'),
  ('11111111-0000-4000-8000-000000000009', 'bbbbbbbb-0000-0000-0000-000000000000', '9-B-1', 'Fiat', 'Ducato', 'minibus', 16, 'active');
insert into public.drivers (id, company_id, user_id, full_name, phone, license_number, license_expires_on) values
  ('22222222-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003', 'Youssef', '+212600000001', 'L-1', '2035-01-01'),
  ('22222222-0000-4000-8000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', null, 'Hamid', '+212600000002', 'L-2', '2030-05-09'),
  ('22222222-0000-4000-8000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000000', null, 'Said', '+212600000003', 'L-3', '2035-01-01');

create temp view trip_fixture as select
  (select id from public.cities where slug = 'casablanca') as casa,
  (select id from public.cities where slug = 'marrakech') as rak;
grant select on trip_fixture to authenticated;

-- Dispatcher A ------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal1"}', true);

select lives_ok(
  $$ insert into public.trips (id, company_id, passenger_name, passengers, pickup_city_id, pickup_address,
       dropoff_city_id, dropoff_address, starts_at, ends_at, vehicle_id, driver_id)
     select '33333333-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'John Smith', 4,
       casa, 'Aéroport', rak, 'Riad', '2030-05-10 08:00+00', '2030-05-10 12:00+00',
       '11111111-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000001'
     from trip_fixture $$,
  'a dispatcher plans a trip with a driver and a vehicle'
);
select is((select status::text from public.trips where id = '33333333-0000-4000-8000-000000000001'),
  'assigned', 'a trip with a driver and a vehicle is assigned');

select throws_ok(
  $$ insert into public.trips (company_id, passenger_name, passengers, pickup_city_id, pickup_address,
       dropoff_city_id, dropoff_address, starts_at, ends_at, driver_id)
     select 'aaaaaaaa-0000-0000-0000-000000000000', 'Overlap', 2, casa, 'Gare', rak, 'Riad',
       '2030-05-10 11:00+00', '2030-05-10 14:00+00', '22222222-0000-4000-8000-000000000001'
     from trip_fixture $$,
  'MT002', null, 'the same driver cannot be booked on an overlapping slot'
);
select throws_ok(
  $$ insert into public.trips (company_id, passenger_name, passengers, pickup_city_id, pickup_address,
       dropoff_city_id, dropoff_address, starts_at, ends_at, driver_id, conflict_override, override_reason)
     select 'aaaaaaaa-0000-0000-0000-000000000000', 'Overlap', 2, casa, 'Gare', rak, 'Riad',
       '2030-05-10 11:00+00', '2030-05-10 14:00+00', '22222222-0000-4000-8000-000000000001', true, 'urgent'
     from trip_fixture $$,
  '42501', null, 'a dispatcher cannot override a conflict'
);
select throws_ok(
  $$ insert into public.trips (company_id, passenger_name, passengers, pickup_city_id, pickup_address,
       dropoff_city_id, dropoff_address, starts_at, ends_at, driver_id)
     select 'aaaaaaaa-0000-0000-0000-000000000000', 'Expired', 2, casa, 'Gare', rak, 'Riad',
       '2030-05-10 15:00+00', '2030-05-10 16:00+00', '22222222-0000-4000-8000-000000000002'
     from trip_fixture $$,
  'MT001', null, 'a driver whose license expires before the trip day cannot be assigned'
);
select throws_ok(
  $$ insert into public.trips (company_id, passenger_name, passengers, pickup_city_id, pickup_address,
       dropoff_city_id, dropoff_address, starts_at, ends_at, vehicle_id)
     select 'aaaaaaaa-0000-0000-0000-000000000000', 'Group', 5, casa, 'Gare', rak, 'Riad',
       '2030-05-11 08:00+00', '2030-05-11 09:00+00', '11111111-0000-4000-8000-000000000003'
     from trip_fixture $$,
  'MT003', null, 'passengers cannot exceed the vehicle seats'
);
select throws_ok(
  $$ insert into public.trips (company_id, passenger_name, passengers, pickup_city_id, pickup_address,
       dropoff_city_id, dropoff_address, starts_at, ends_at, vehicle_id)
     select 'aaaaaaaa-0000-0000-0000-000000000000', 'Garage', 2, casa, 'Gare', rak, 'Riad',
       '2030-05-11 08:00+00', '2030-05-11 09:00+00', '11111111-0000-4000-8000-000000000002'
     from trip_fixture $$,
  'MT004', null, 'a vehicle in maintenance cannot be assigned'
);
select throws_ok(
  $$ update public.trips set status = 'completed' where id = '33333333-0000-4000-8000-000000000001' $$,
  'MT005', null, 'an assigned trip cannot jump to completed'
);
select throws_ok(
  $$ insert into public.trips (company_id, passenger_name, passengers, pickup_city_id, pickup_address,
       dropoff_city_id, dropoff_address, starts_at, ends_at, vehicle_id)
     select 'aaaaaaaa-0000-0000-0000-000000000000', 'Cross', 2, casa, 'Gare', rak, 'Riad',
       '2030-05-12 08:00+00', '2030-05-12 09:00+00', '11111111-0000-4000-8000-000000000009'
     from trip_fixture $$,
  '23503', null, 'a trip cannot use a vehicle of another company'
);
select is_empty(
  $$ delete from public.trips where id = '33333333-0000-4000-8000-000000000001' returning id $$,
  'trips are never deleted'
);

-- Owner A: override with a reason ------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select lives_ok(
  $$ insert into public.trips (id, company_id, passenger_name, passengers, pickup_city_id, pickup_address,
       dropoff_city_id, dropoff_address, starts_at, ends_at, driver_id, conflict_override, override_reason)
     select '33333333-0000-4000-8000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'Overlap', 2,
       casa, 'Gare', rak, 'Riad', '2030-05-10 11:00+00', '2030-05-10 14:00+00',
       '22222222-0000-4000-8000-000000000001', true, 'Client VIP, deux trajets enchaînés'
     from trip_fixture $$,
  'an owner overrides a conflict with a reason'
);
select is(
  (select after ->> 'override_reason' from public.audit_logs
   where entity_id = '33333333-0000-4000-8000-000000000002' and action = 'trip.insert'),
  'Client VIP, deux trajets enchaînés', 'the override is recorded in the audit log'
);
select lives_ok(
  $$ update public.trips set status = 'cancelled', cancel_reason = 'Client absent'
     where id = '33333333-0000-4000-8000-000000000002' $$,
  'an assigned or planned trip can be cancelled'
);
select throws_ok(
  $$ update public.trips set notes = 'x' where id = '33333333-0000-4000-8000-000000000002' $$,
  'MT006', null, 'a cancelled trip is locked'
);

-- Driver A reads only their trips -------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000003", "role": "authenticated", "aal": "aal1"}', true);
select is((select count(*) from public.trips), 2::bigint, 'the driver reads the trips assigned to them');

-- Owner B -------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "b0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select is((select count(*) from public.trips), 0::bigint, 'another company sees no trip of company A');
select throws_ok(
  $$ insert into public.trips (company_id, passenger_name, passengers, pickup_city_id, pickup_address,
       dropoff_city_id, dropoff_address, starts_at, ends_at)
     select 'aaaaaaaa-0000-0000-0000-000000000000', 'Intruder', 1, casa, 'Gare', rak, 'Riad',
       '2030-05-13 08:00+00', '2030-05-13 09:00+00'
     from trip_fixture $$,
  '42501', null, 'another company cannot add a trip to company A'
);

select * from finish();
rollback;
