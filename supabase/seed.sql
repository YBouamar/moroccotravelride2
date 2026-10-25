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
