-- Local demo data only (never real data, never run in production).
-- Reference data (cities, vehicle types, settings) lives in migrations because production needs it.
-- Demo password for every account: Demo-Mtr-2026 (documented in docs/TESTING.md).

create or replace function pg_temp.demo_user(p_id uuid, p_email text, p_full_name text, p_locale text default 'fr')
returns void
language plpgsql
as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt('Demo-Mtr-2026', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('full_name', p_full_name, 'locale', p_locale),
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), p_id, p_id::text,
    jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
    'email', now(), now(), now()
  );
end;
$$;

select pg_temp.demo_user('00000000-0000-4000-a000-000000000001', 'admin@moroccotravelride.test', 'Admin Plateforme');
select pg_temp.demo_user('00000000-0000-4000-a000-000000000011', 'owner.atlas@moroccotravelride.test', 'Karim Atlas');
select pg_temp.demo_user('00000000-0000-4000-a000-000000000012', 'manager.atlas@moroccotravelride.test', 'Salma Manager');
select pg_temp.demo_user('00000000-0000-4000-a000-000000000013', 'driver.atlas@moroccotravelride.test', 'Youssef Chauffeur', 'ar');
select pg_temp.demo_user('00000000-0000-4000-a000-000000000021', 'owner.sahara@moroccotravelride.test', 'Nadia Sahara', 'en');
select pg_temp.demo_user('00000000-0000-4000-a000-000000000031', 'owner.oasis@moroccotravelride.test', 'Omar Oasis');

update public.profiles set is_platform_admin = true
where id = '00000000-0000-4000-a000-000000000001';

insert into public.companies (id, legal_name, trade_name, ice, city_id, status, marketplace_enabled, license_number, license_expires_on)
select v.id::uuid, v.legal_name, v.trade_name, v.ice, c.id, v.status::public.company_status, v.marketplace_enabled, v.license_number, v.license_expires_on::date
from (values
  ('00000000-0000-4000-b000-000000000001', 'Atlas Transport Touristique SARL', 'Atlas Transport', '000000000000001', 'casablanca', 'verified', true, 'DEMO-TT-0001', '2027-12-31'),
  ('00000000-0000-4000-b000-000000000002', 'Sahara Tours SARL', 'Sahara Tours', '000000000000002', 'marrakech', 'verified', true, 'DEMO-TT-0002', '2027-06-30'),
  ('00000000-0000-4000-b000-000000000003', 'Oasis Mobility SARL', 'Oasis Mobility', null, 'agadir', 'pending', false, null, null)
) as v (id, legal_name, trade_name, ice, city_slug, status, marketplace_enabled, license_number, license_expires_on)
join public.cities c on c.slug = v.city_slug;

insert into public.company_members (company_id, user_id, role) values
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000011', 'owner'),
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000012', 'manager'),
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000013', 'driver'),
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000021', 'owner'),
  ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000031', 'owner');

-- Subscriptions (a V2 trial is created by trigger for every company): one of each situation.
update public.subscriptions
set plan_code = 'v2', status = 'active', trial_ends_at = null,
    current_period_start = date_trunc('month', now())::date,
    current_period_end = (date_trunc('month', now()) + interval '1 month - 1 day')::date
where company_id = '00000000-0000-4000-b000-000000000001';

update public.subscriptions
set plan_code = 'standard', status = 'active', trial_ends_at = null,
    current_period_start = date_trunc('month', now())::date,
    current_period_end = (date_trunc('month', now()) + interval '1 month - 1 day')::date
where company_id = '00000000-0000-4000-b000-000000000002';
-- Oasis Mobility (pending) keeps its 14-day V2 trial.

-- Step 8: a few clients for Atlas (B2B agency and hotel, one traveler).
insert into public.clients (company_id, type, name, ice, email, phone) values
  ('00000000-0000-4000-b000-000000000001', 'b2b', 'Agence Découverte Maroc', '000000000000101', 'contact@decouverte.test', '+212522000101'),
  ('00000000-0000-4000-b000-000000000001', 'b2b', 'Riad Atlas Palace', '000000000000102', 'reservation@atlaspalace.test', '+212524000102'),
  ('00000000-0000-4000-b000-000000000001', 'b2c', 'Emma Martin', null, 'emma.martin@example.test', null);

-- Atlas fleet and drivers (Youssef has the driver app account; Hassan's license is expired, Q24).
insert into public.vehicles (id, company_id, registration, brand, model, vehicle_type_code, seats, luggage_capacity, year) values
  ('00000000-0000-4000-9000-000000000101', '00000000-0000-4000-b000-000000000001', '12345-A-6', 'Mercedes', 'Classe E', 'sedan', 3, 3, 2023),
  ('00000000-0000-4000-9000-000000000102', '00000000-0000-4000-b000-000000000001', '23456-B-6', 'Mercedes', 'Vito', 'van', 7, 7, 2022),
  ('00000000-0000-4000-9000-000000000103', '00000000-0000-4000-b000-000000000001', '34567-A-6', 'Toyota', 'Land Cruiser', 'suv_4x4', 4, 4, 2021);
insert into public.drivers (id, company_id, user_id, full_name, phone, license_number, license_expires_on, languages) values
  ('00000000-0000-4000-9000-000000000201', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000013', 'Youssef Chauffeur', '+212661000013', 'DEMO-P-0013', '2031-03-31', '{ar,fr,en}'),
  ('00000000-0000-4000-9000-000000000202', '00000000-0000-4000-b000-000000000001', null, 'Hassan Ait Ali', '+212661000014', 'DEMO-P-0014', '2026-01-31', '{ar,fr,zgh}');

-- Atlas trips around today (Morocco time), so that the planning and the dashboard show data.
with day as (select (now() at time zone 'Africa/Casablanca')::date as today),
places as (
  select
    (select id from public.cities where slug = 'aeroport-casablanca-mohammed-v') as cmn,
    (select id from public.cities where slug = 'casablanca') as casa,
    (select id from public.cities where slug = 'marrakech') as rak
)
insert into public.trips (company_id, client_id, passenger_name, passenger_phone, passengers, luggage,
  pickup_city_id, pickup_address, dropoff_city_id, dropoff_address, starts_at, ends_at, price_cents,
  vehicle_id, driver_id)
select '00000000-0000-4000-b000-000000000001', c.id, v.passenger, v.phone, v.passengers, v.luggage,
  v.pickup, v.pickup_address, v.dropoff, v.dropoff_address,
  ((day.today + v.day_offset) + v.start_time) at time zone 'Africa/Casablanca',
  ((day.today + v.day_offset) + v.end_time) at time zone 'Africa/Casablanca',
  v.price, v.vehicle_id::uuid, v.driver_id::uuid
from day, places,
lateral (values
  (0, time '09:00', time '10:00', 'Emma Martin', '+33600000001', 2, 3, places.cmn, 'Terminal 1', places.casa, 'Hôtel Hyatt Regency', 30000::bigint, '00000000-0000-4000-9000-000000000101', '00000000-0000-4000-9000-000000000201', 'Emma Martin'),
  (1, time '08:00', time '12:00', 'Groupe Découverte', '+212522000101', 6, 6, places.casa, 'Agence Découverte, Maarif', places.rak, 'Riad Atlas Palace, Médina', 80000::bigint, '00000000-0000-4000-9000-000000000102', '00000000-0000-4000-9000-000000000201', 'Agence Découverte Maroc'),
  (2, time '15:00', time '16:00', 'Famille Haddad', null, 3, 2, places.rak, 'Gare de Marrakech', places.rak, 'Palmeraie', 25000::bigint, null, null, null)
) as v(day_offset, start_time, end_time, passenger, phone, passengers, luggage, pickup, pickup_address, dropoff, dropoff_address, price, vehicle_id, driver_id, client_name)
left join public.clients c on c.name = v.client_name and c.company_id = '00000000-0000-4000-b000-000000000001';
