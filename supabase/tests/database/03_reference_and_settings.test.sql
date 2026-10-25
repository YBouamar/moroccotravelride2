-- Reference data and platform settings: public read, admin-only write.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'user@test.local'),
  ('d0000000-0000-0000-0000-000000000001', 'admin@test.local');
update public.profiles set is_platform_admin = true where id = 'd0000000-0000-0000-0000-000000000001';

set local role anon;
select is((select count(*) from public.cities), 12::bigint, 'anonymous users read the 6 cities and 6 airports');
select is((select count(*) from public.vehicle_types), 5::bigint, 'anonymous users read vehicle types');
select is(
  (select value from public.platform_settings where key = 'default_commission_bps'),
  '2000'::jsonb,
  'the default commission is 20 % (2000 bps)'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select is_empty(
  $$ update public.platform_settings set value = '1000' where key = 'default_commission_bps' returning key $$,
  'a regular user cannot change platform settings'
);
select throws_ok(
  $$ insert into public.cities (slug, name_fr, name_en, name_ar, latitude, longitude)
     values ('test', 'Test', 'Test', 'Test', 0, 0) $$,
  '42501', null,
  'a regular user cannot add a city'
);

select set_config('request.jwt.claims',
  '{"sub": "d0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}', true);
select isnt_empty(
  $$ update public.platform_settings set value = '1800' where key = 'default_commission_bps' returning key $$,
  'an admin with MFA can change platform settings'
);
select throws_ok(
  $$ insert into public.platform_settings (key, value) values ('new_key', '1') $$,
  '42501', null,
  'settings keys are created by migrations only'
);

select * from finish();
rollback;
