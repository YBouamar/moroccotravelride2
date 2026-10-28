-- Quote requests (server writes, admins read and handle) and the public route price overview.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'owner-a@test.local'),
  ('d0000000-0000-0000-0000-000000000001', 'admin@test.local');
update public.profiles set is_platform_admin = true where id = 'd0000000-0000-0000-0000-000000000001';
insert into public.companies (id, legal_name, status, marketplace_enabled, license_expires_on) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Atlas Transport SARL', 'verified', true, '2099-12-31'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Pending SARL', 'pending', true, '2099-12-31');
insert into public.vehicles (company_id, registration, brand, model, vehicle_type_code, seats) values
  ('aaaaaaaa-0000-0000-0000-000000000000', '1-A-1', 'Skoda', 'Superb', 'sedan', 3),
  ('bbbbbbbb-0000-0000-0000-000000000000', '1-B-1', 'Skoda', 'Superb', 'sedan', 3);
insert into public.price_grids (company_id, from_city_id, to_city_id, vehicle_type_code, price_cents)
select v.company::uuid, f.id, t.id, 'sedan', v.price
from (values ('aaaaaaaa-0000-0000-0000-000000000000', 90000), ('bbbbbbbb-0000-0000-0000-000000000000', 10000)) as v(company, price),
  public.cities f, public.cities t
where f.slug = 'agadir' and t.slug = 'tanger';

set local role service_role;
insert into public.quote_requests (id, kind, name, email, phone, from_city_id, start_date, days, passengers)
select 'eeeeeeee-0000-4000-8000-000000000001', 'tour', 'Emma Martin', 'emma@test.local', '+33600000001',
  c.id, current_date + 10, 3, 4
from public.cities c where c.slug = 'marrakech';
select ok((select 'admin@test.local' in (select * from public.platform_admin_emails())),
  'the server lists the platform admin e-mails');

reset role;
set local role anon;
select throws_ok($$ select * from public.quote_requests $$, '42501', null, 'anonymous users cannot read requests');
select throws_ok($$ insert into public.quote_requests (kind, name, email, phone, from_city_id, start_date, days, passengers)
  select 'tour', 'Bot', 'b@test.local', '+33600000002', id, current_date, 1, 1 from public.cities limit 1 $$,
  '42501', null, 'anonymous users cannot write requests directly');
select throws_ok($$ select * from public.platform_admin_emails() $$, '42501', null,
  'anonymous users cannot list admin e-mails');
select is(
  (select min_price_cents from public.route_price_overview()
   where from_city_id = (select id from public.cities where slug = 'agadir')
     and to_city_id = (select id from public.cities where slug = 'tanger')),
  90000::bigint, 'route prices are public, pending carriers excluded'
);

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "a0000000-0000-0000-0000-000000000001", "aal": "aal1"}';
select is_empty($$ select * from public.quote_requests $$, 'a carrier never sees quote requests');
select throws_ok($$ select * from public.platform_admin_emails() $$, '42501', null,
  'signed-in users cannot list admin e-mails');

set local request.jwt.claims to '{"sub": "d0000000-0000-0000-0000-000000000001", "aal": "aal2"}';
select is((select count(*) from public.quote_requests where id = 'eeeeeeee-0000-4000-8000-000000000001'),
  1::bigint, 'a platform admin reads the requests');
update public.quote_requests set status = 'handled' where id = 'eeeeeeee-0000-4000-8000-000000000001';
select is((select status from public.quote_requests where id = 'eeeeeeee-0000-4000-8000-000000000001'),
  'handled', 'a platform admin handles a request');
select throws_ok($$ update public.quote_requests set email = 'x@test.local' $$, '42501', null,
  'the content of a request cannot be changed');

select * from finish();
rollback;
