-- Public route prices of the city pages: eligible carriers only, lowest price per destination.
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

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
where f.slug = 'fes' and t.slug = 'rabat';

set local role anon;
select is(
  (select min_price_cents from public.route_prices((select id from public.cities where slug = 'fes'))
   where to_city_id = (select id from public.cities where slug = 'rabat')),
  90000::bigint, 'the price of a pending carrier is never shown'
);
select is(
  (select carriers from public.route_prices((select id from public.cities where slug = 'fes'))
   where to_city_id = (select id from public.cities where slug = 'rabat')),
  1::bigint, 'only eligible carriers are counted'
);
select throws_ok($$ select * from public.price_grids $$, '42501', null, 'the grids themselves stay private');

select * from finish();
rollback;
