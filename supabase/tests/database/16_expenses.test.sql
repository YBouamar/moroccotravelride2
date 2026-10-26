-- Expenses: drivers file their own, reviewers decide, decisions are final, V2 feature required.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'owner-a@test.local'),
  ('a0000000-0000-0000-0000-000000000003', 'driver-a@test.local'),
  ('a0000000-0000-0000-0000-000000000004', 'driver2-a@test.local'),
  ('b0000000-0000-0000-0000-000000000001', 'owner-b@test.local');
insert into public.companies (id, legal_name) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Atlas Transport SARL'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Sahara Tours SARL');
insert into public.company_members (company_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'owner'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003', 'driver'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000004', 'driver'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', 'owner');
insert into public.drivers (id, company_id, user_id, full_name, phone, license_number, license_expires_on) values
  ('22222222-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003', 'Youssef', '+212600000001', 'L-1', '2099-01-01'),
  ('22222222-0000-4000-8000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000004', 'Hamid', '+212600000002', 'L-2', '2099-01-01');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000003", "role": "authenticated", "aal": "aal1"}', true);
select lives_ok(
  $$ insert into public.expenses (id, company_id, category, amount_cents, spent_on, driver_id)
     values ('44444444-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'fuel', 45000, current_date,
       '22222222-0000-4000-8000-000000000002') $$,
  'a driver files a fuel expense during the V2 trial'
);
select is((select driver_id from public.expenses where id = '44444444-0000-4000-8000-000000000001'),
  '22222222-0000-4000-8000-000000000001'::uuid, 'the expense is filed in the driver''s own name');
select throws_ok(
  $$ update public.expenses set status = 'approved' where id = '44444444-0000-4000-8000-000000000001' $$,
  '42501', null, 'a driver cannot approve an expense'
);

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000004", "role": "authenticated", "aal": "aal1"}', true);
select is((select count(*) from public.expenses where company_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  0::bigint, 'another driver does not see the expense');

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select throws_ok(
  $$ update public.expenses set status = 'rejected' where id = '44444444-0000-4000-8000-000000000001' $$,
  '23514', null, 'a rejection needs a reason'
);
select lives_ok(
  $$ update public.expenses set status = 'approved' where id = '44444444-0000-4000-8000-000000000001' $$,
  'the owner approves the expense'
);
select throws_ok(
  $$ update public.expenses set amount_cents = 1 where id = '44444444-0000-4000-8000-000000000001' $$,
  'MT006', null, 'an approved expense is final'
);

select set_config('request.jwt.claims',
  '{"sub": "b0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select is((select count(*) from public.expenses where company_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  0::bigint, 'another company sees no expense of company A');

reset role;
update public.subscriptions set plan_code = 'standard', status = 'active', trial_ends_at = null
where company_id = 'aaaaaaaa-0000-0000-0000-000000000000';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select throws_ok(
  $$ insert into public.expenses (company_id, category, amount_cents, spent_on)
     values ('aaaaaaaa-0000-0000-0000-000000000000', 'toll', 2000, current_date) $$,
  '42501', null, 'expenses need the V2 offer'
);

select * from finish();
rollback;
