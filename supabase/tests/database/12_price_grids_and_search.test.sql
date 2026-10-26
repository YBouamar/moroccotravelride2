-- Price grids RLS and public search eligibility (BR-006, BR-008, BR-016).
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'owner-a@test.local'),
  ('a0000000-0000-0000-0000-000000000002', 'dispatcher-a@test.local'),
  ('b0000000-0000-0000-0000-000000000001', 'owner-b@test.local');
insert into public.companies (id, legal_name, trade_name, status, marketplace_enabled, license_expires_on) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Atlas Transport SARL', 'Atlas', 'verified', true, '2099-12-31'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Sahara Tours SARL', 'Sahara', 'pending', true, '2099-12-31');
insert into public.company_members (company_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'owner'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002', 'dispatcher'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', 'owner');
insert into public.vehicles (company_id, registration, brand, model, vehicle_type_code, seats) values
  ('aaaaaaaa-0000-0000-0000-000000000000', '1-A-1', 'Mercedes', 'Vito', 'van', 7),
  ('bbbbbbbb-0000-0000-0000-000000000000', '1-B-1', 'Mercedes', 'Vito', 'van', 7);
insert into public.price_grids (company_id, from_city_id, to_city_id, vehicle_type_code, price_cents)
select 'bbbbbbbb-0000-0000-0000-000000000000', c.id, m.id, 'van', 70000
from public.cities c, public.cities m where c.slug = 'casablanca' and m.slug = 'marrakech';

create temp view route as select
  (select id from public.cities where slug = 'casablanca') as casa,
  (select id from public.cities where slug = 'marrakech') as rak;
grant select on route to anon, authenticated;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select lives_ok(
  $$ insert into public.price_grids (company_id, from_city_id, to_city_id, vehicle_type_code, price_cents)
     select 'aaaaaaaa-0000-0000-0000-000000000000', casa, rak, 'van', 80000 from route $$,
  'an owner adds a price to the grid'
);
select is((select count(*) from public.price_grids where company_id <> 'aaaaaaaa-0000-0000-0000-000000000000'), 0::bigint, 'an owner reads only the grid of their company');

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal1"}', true);
select is_empty(
  $$ update public.price_grids set price_cents = 1000 returning id $$,
  'a dispatcher cannot change prices'
);

select set_config('request.jwt.claims',
  '{"sub": "b0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select throws_ok(
  $$ insert into public.price_grids (company_id, from_city_id, to_city_id, vehicle_type_code, price_cents)
     select 'aaaaaaaa-0000-0000-0000-000000000000', rak, casa, 'van', 1000 from route $$,
  '42501', null, 'another company cannot write the grid of company A'
);

-- Public search -----------------------------------------------------------------------
reset role;
set local role anon;
select is(
  (select array_agg(carrier_name) from public.search_offers(
    (select casa from route), (select rak from route), now() + interval '3 days', 4) where company_id in ('aaaaaaaa-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000000')),
  array['Atlas'], 'anonymous travelers find the verified carriers only'
);
select is(
  (select price_cents from public.search_offers(
    (select casa from route), (select rak from route), now() + interval '3 days', 4) where company_id in ('aaaaaaaa-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000000')),
  80000::bigint, 'the offer carries the grid price'
);
select is_empty(
  $$ select * from public.search_offers((select casa from route), (select rak from route), now() + interval '2 hours', 4) where company_id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  'a pickup sooner than the minimum lead time returns nothing'
);
select is_empty(
  $$ select * from public.search_offers((select casa from route), (select rak from route), now() + interval '3 days', 8) where company_id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  'no offer when no vehicle has enough seats'
);
select throws_ok(
  $$ select * from public.price_grids $$,
  '42501', null, 'anonymous users cannot read grids directly'
);

reset role;
update public.companies set marketplace_suspended_at = now(), marketplace_suspension_reason = 'Relevé impayé'
where id = 'aaaaaaaa-0000-0000-0000-000000000000';
select is_empty(
  $$ select * from public.search_offers((select casa from route), (select rak from route), now() + interval '3 days', 4) where company_id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  'a suspended carrier disappears from the search'
);
update public.companies set marketplace_suspended_at = null, marketplace_suspension_reason = null,
  license_expires_on = current_date - 1
where id = 'aaaaaaaa-0000-0000-0000-000000000000';
select is_empty(
  $$ select * from public.search_offers((select casa from route), (select rak from route), now() + interval '3 days', 4) where company_id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  'a carrier with an expired tourism license disappears from the search'
);

select * from finish();
rollback;
