-- Profiles: created on sign-up, visible to oneself and colleagues only, admin flag locked.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'amine@test.local', '{"full_name": "Amine", "locale": "ar"}'),
  ('a0000000-0000-0000-0000-000000000002', 'sara@test.local', '{"full_name": "Sara", "locale": "xx"}'),
  ('c0000000-0000-0000-0000-000000000001', 'stranger@test.local', '{}');

select is(
  (select locale from public.profiles where id = 'a0000000-0000-0000-0000-000000000001'),
  'ar',
  'sign-up creates a profile with the chosen locale'
);
select is(
  (select locale from public.profiles where id = 'a0000000-0000-0000-0000-000000000002'),
  'fr',
  'an unsupported locale falls back to French'
);

insert into public.companies (id, legal_name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'Atlas Transport SARL');
insert into public.company_members (company_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'owner'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002', 'driver');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);

select is(
  (select array_agg(full_name order by full_name) from public.profiles),
  array['Amine', 'Sara'],
  'a user sees their own profile and their colleagues, not strangers'
);
select isnt_empty(
  $$ update public.profiles set full_name = 'Amine B.' where id = 'a0000000-0000-0000-0000-000000000001' returning id $$,
  'a user can update their own profile'
);
select is_empty(
  $$ update public.profiles set full_name = 'Renamed' where id = 'a0000000-0000-0000-0000-000000000002' returning id $$,
  'a user cannot update a colleague profile'
);
select throws_ok(
  $$ update public.profiles set is_platform_admin = true where id = 'a0000000-0000-0000-0000-000000000001' $$,
  '42501', null,
  'a user cannot make themselves platform admin'
);

select set_config('request.jwt.claims',
  '{"sub": "c0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select is((select count(*) from public.profiles), 1::bigint, 'a stranger only sees their own profile');

reset role;
set local role anon;
select throws_ok($$ select * from public.profiles $$, '42501', null, 'anonymous users cannot read profiles');

select * from finish();
rollback;
