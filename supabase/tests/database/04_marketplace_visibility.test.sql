-- Q19: carriers control their own marketplace visibility; only admins suspend and lift suspensions.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'owner-a@test.local'),
  ('a0000000-0000-0000-0000-000000000003', 'driver-a@test.local'),
  ('d0000000-0000-0000-0000-000000000001', 'admin@test.local');
update public.profiles set is_platform_admin = true where id = 'd0000000-0000-0000-0000-000000000001';
insert into public.companies (id, legal_name, status) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Atlas Transport SARL', 'verified');
insert into public.company_members (company_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'owner'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003', 'driver');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select lives_ok(
  $$ update public.companies set marketplace_enabled = true where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  'an owner can turn marketplace visibility on'
);

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000003", "role": "authenticated", "aal": "aal1"}', true);
select is_empty(
  $$ update public.companies set marketplace_enabled = false where id = 'aaaaaaaa-0000-0000-0000-000000000000' returning id $$,
  'a driver cannot change marketplace visibility'
);

select set_config('request.jwt.claims',
  '{"sub": "d0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}', true);
select lives_ok(
  $$ update public.companies set marketplace_suspended_at = now(), marketplace_suspension_reason = 'unpaid statement'
     where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  'an admin can suspend a carrier from the marketplace'
);

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select throws_ok(
  $$ update public.companies set marketplace_suspended_at = null where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  '42501', null,
  'a suspended carrier cannot lift the suspension'
);
select lives_ok(
  $$ update public.companies set marketplace_enabled = false where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  'a suspended carrier can still turn visibility off'
);

select * from finish();
rollback;
