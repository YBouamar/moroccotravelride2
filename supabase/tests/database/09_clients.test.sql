-- Clients: office roles only, write access needs an active offer.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

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
insert into public.clients (company_id, type, name, ice) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'b2b', 'Hotel Atlas Palace', '001234567000089');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal1"}', true);
select lives_ok(
  $$ insert into public.clients (company_id, type, name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'b2c', 'John Smith') $$,
  'a dispatcher adds a client'
);
select throws_ok(
  $$ insert into public.clients (company_id, type, name, ice) values ('aaaaaaaa-0000-0000-0000-000000000000', 'b2c', 'Bad', '001234567000089') $$,
  '23514', null,
  'an ICE is only allowed on B2B clients'
);

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000003", "role": "authenticated", "aal": "aal1"}', true);
select is((select count(*) from public.clients), 0::bigint, 'a driver does not read the client list');

select set_config('request.jwt.claims',
  '{"sub": "b0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select is((select count(*) from public.clients), 0::bigint, 'another company sees no client of company A');
select throws_ok(
  $$ insert into public.clients (company_id, type, name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'b2c', 'Intruder') $$,
  '42501', null,
  'another company cannot add a client to company A'
);

reset role;
update public.subscriptions set trial_ends_at = now() - interval '1 day'
where company_id = 'aaaaaaaa-0000-0000-0000-000000000000';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select is_empty(
  $$ update public.clients set name = 'Renamed' where company_id = 'aaaaaaaa-0000-0000-0000-000000000000' returning id $$,
  'a read-only company cannot edit clients'
);

select * from finish();
rollback;
