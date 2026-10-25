-- Vehicles, drivers and private company documents.
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'owner-a@test.local'),
  ('a0000000-0000-0000-0000-000000000002', 'dispatcher-a@test.local'),
  ('a0000000-0000-0000-0000-000000000003', 'driver-a@test.local'),
  ('b0000000-0000-0000-0000-000000000001', 'owner-b@test.local'),
  ('d0000000-0000-0000-0000-000000000001', 'admin@test.local');
update public.profiles set is_platform_admin = true where id = 'd0000000-0000-0000-0000-000000000001';
insert into public.companies (id, legal_name) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Atlas Transport SARL'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Sahara Tours SARL');
insert into public.company_members (company_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'owner'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002', 'dispatcher'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003', 'driver'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', 'owner');
insert into public.drivers (company_id, user_id, full_name, phone, license_number, license_expires_on) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003', 'Youssef', '+212600000001', 'L-1', '2030-01-01'),
  ('aaaaaaaa-0000-0000-0000-000000000000', null, 'Hamid', '+212600000002', 'L-2', '2030-01-01');
insert into storage.objects (bucket_id, name) values
  ('company-documents', 'aaaaaaaa-0000-0000-0000-000000000000/license.pdf');

-- Owner A -----------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);

select lives_ok(
  $$ insert into public.vehicles (company_id, registration, brand, model, vehicle_type_code, seats)
     values ('aaaaaaaa-0000-0000-0000-000000000000', '12345-A-6', 'Mercedes', 'Vito', 'van', 7) $$,
  'an owner adds a vehicle to their company during the trial'
);
select throws_ok(
  $$ insert into public.vehicles (company_id, registration, brand, model, vehicle_type_code, seats)
     values ('bbbbbbbb-0000-0000-0000-000000000000', '999-B-1', 'Fiat', 'Ducato', 'minibus', 16) $$,
  '42501', null,
  'an owner cannot add a vehicle to another company'
);
select throws_ok(
  $$ insert into public.drivers (company_id, user_id, full_name, phone, license_number, license_expires_on)
     values ('aaaaaaaa-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', 'Intruder', '+212600000009', 'L-9', '2030-01-01') $$,
  '42501', null,
  'a driver record cannot be linked to a user from another company'
);
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('company-documents', 'aaaaaaaa-0000-0000-0000-000000000000/insurance.pdf') $$,
  'an owner uploads a document into their company folder'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('company-documents', 'bbbbbbbb-0000-0000-0000-000000000000/fake.pdf') $$,
  '42501', null,
  'an owner cannot upload into another company folder'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('company-documents', 'not-a-uuid/file.pdf') $$,
  '42501', null,
  'uploads outside a company folder are refused'
);

-- Read-only after the trial (Q21) ----------------------------------------------
reset role;
update public.subscriptions set trial_ends_at = now() - interval '1 day'
where company_id = 'aaaaaaaa-0000-0000-0000-000000000000';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select is((select count(*) from public.vehicles), 1::bigint, 'a read-only company still reads its vehicles');
select throws_ok(
  $$ insert into public.vehicles (company_id, registration, brand, model, vehicle_type_code, seats)
     values ('aaaaaaaa-0000-0000-0000-000000000000', '22222-A-6', 'Toyota', 'Hiace', 'van', 9) $$,
  '42501', null,
  'a read-only company cannot add vehicles'
);
reset role;
update public.subscriptions set trial_ends_at = now() + interval '14 days'
where company_id = 'aaaaaaaa-0000-0000-0000-000000000000';
set local role authenticated;

-- Dispatcher, driver, other company, admin ---------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal1"}', true);
select is((select count(*) from public.drivers), 2::bigint, 'a dispatcher reads all drivers of the company');
select throws_ok(
  $$ insert into public.vehicles (company_id, registration, brand, model, vehicle_type_code, seats)
     values ('aaaaaaaa-0000-0000-0000-000000000000', '33333-A-6', 'Kia', 'Carnival', 'van', 7) $$,
  '42501', null,
  'a dispatcher cannot add vehicles'
);
select is(
  (select count(*) from storage.objects where bucket_id = 'company-documents'),
  0::bigint,
  'a dispatcher cannot read company documents'
);

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000003", "role": "authenticated", "aal": "aal1"}', true);
select is((select array_agg(full_name) from public.drivers), array['Youssef'], 'a driver only reads their own driver record');

select set_config('request.jwt.claims',
  '{"sub": "b0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select is(
  (select count(*) from public.vehicles) + (select count(*) from public.drivers)
    + (select count(*) from storage.objects where bucket_id = 'company-documents'),
  0::bigint,
  'another company sees no vehicle, driver or document of company A'
);

select set_config('request.jwt.claims',
  '{"sub": "d0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}', true);
-- Scoped to the fixture folder: e2e runs leave other uploads in the local bucket.
select is(
  (select count(*) from storage.objects
   where bucket_id = 'company-documents' and name like 'aaaaaaaa-0000-0000-0000-000000000000/%'),
  2::bigint,
  'an admin with MFA reads company documents to verify them'
);

reset role;
select is(
  (select public from storage.buckets where id = 'company-documents'),
  false,
  'the documents bucket is private'
);

select * from finish();
rollback;
