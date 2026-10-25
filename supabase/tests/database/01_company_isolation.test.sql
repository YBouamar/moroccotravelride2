-- Tenant isolation between companies, roles inside a company, admin MFA requirement.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- Fixtures (as postgres, RLS bypassed) -----------------------------------------
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'owner-a@test.local'),
  ('a0000000-0000-0000-0000-000000000002', 'manager-a@test.local'),
  ('a0000000-0000-0000-0000-000000000003', 'driver-a@test.local'),
  ('b0000000-0000-0000-0000-000000000001', 'owner-b@test.local'),
  ('c0000000-0000-0000-0000-000000000001', 'stranger@test.local'),
  ('c0000000-0000-0000-0000-000000000002', 'newcomer@test.local'),
  ('d0000000-0000-0000-0000-000000000001', 'admin@test.local');

update public.profiles set is_platform_admin = true
where id = 'd0000000-0000-0000-0000-000000000001';

insert into public.companies (id, legal_name) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Atlas Transport SARL'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Sahara Tours SARL');

insert into public.company_members (company_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'owner'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002', 'manager'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003', 'driver'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', 'owner');

-- Owner of company A ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);

select is(
  (select array_agg(id) from public.companies),
  array['aaaaaaaa-0000-0000-0000-000000000000'::uuid],
  'owner A only sees company A'
);
select is(
  (select count(*) from public.company_members where company_id = 'bbbbbbbb-0000-0000-0000-000000000000'),
  0::bigint,
  'owner A cannot see members of company B'
);
select is_empty(
  $$ update public.companies set trade_name = 'Hacked' where id = 'bbbbbbbb-0000-0000-0000-000000000000' returning id $$,
  'owner A cannot update company B'
);
select isnt_empty(
  $$ update public.companies set trade_name = 'Atlas' where id = 'aaaaaaaa-0000-0000-0000-000000000000' returning id $$,
  'owner A can update company A'
);
select throws_ok(
  $$ update public.companies set status = 'verified' where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  '42501', null,
  'owner A cannot verify their own company'
);
select throws_ok(
  $$ update public.companies set commission_rate = 0.05 where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  '42501', null,
  'owner A cannot change their commission rate'
);
select throws_ok(
  $$ insert into public.company_members (company_id, user_id, role)
     values ('bbbbbbbb-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000002', 'driver') $$,
  '42501', null,
  'owner A cannot add a member to company B'
);
select lives_ok(
  $$ insert into public.company_members (company_id, user_id, role)
     values ('aaaaaaaa-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000002', 'dispatcher') $$,
  'owner A can add a member to company A'
);
select throws_ok(
  $$ delete from public.company_members
     where company_id = 'aaaaaaaa-0000-0000-0000-000000000000' and user_id = 'a0000000-0000-0000-0000-000000000001' $$,
  '23514', null,
  'the last owner of a company cannot be removed'
);

-- Manager of company A ----------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal1"}', true);

select throws_ok(
  $$ update public.company_members set role = 'owner'
     where company_id = 'aaaaaaaa-0000-0000-0000-000000000000' and user_id = 'a0000000-0000-0000-0000-000000000003' $$,
  '42501', null,
  'a manager cannot promote someone to owner'
);
select is_empty(
  $$ update public.company_members set role = 'driver'
     where user_id = 'a0000000-0000-0000-0000-000000000001' returning user_id $$,
  'a manager cannot demote an owner'
);

-- Driver of company A -----------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000003", "role": "authenticated", "aal": "aal1"}', true);

select is((select count(*) from public.companies), 1::bigint, 'a driver sees their own company');
select is_empty(
  $$ update public.companies set trade_name = 'Driver edit' where id = 'aaaaaaaa-0000-0000-0000-000000000000' returning id $$,
  'a driver cannot update the company'
);

-- Stranger, then company creation -----------------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "c0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);

select is((select count(*) from public.companies), 0::bigint, 'a user without membership sees no company');
select throws_ok(
  $$ insert into public.companies (legal_name) values ('Direct insert SARL') $$,
  '42501', null,
  'companies cannot be inserted directly'
);
select isnt(public.create_company('Oasis Mobility SARL'), null, 'create_company returns the new company id');
select is(
  (select role::text from public.company_members where user_id = 'c0000000-0000-0000-0000-000000000001'),
  'owner',
  'the creator becomes owner'
);
select is(
  (select status::text from public.companies where legal_name = 'Oasis Mobility SARL'),
  'pending',
  'a new company awaits verification'
);

-- Owner of company B: documents -------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "b0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);

select lives_ok(
  $$ insert into public.company_documents (id, company_id, type, storage_path)
     values ('dddddddd-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000000',
             'tourism_license', 'bbbbbbbb-0000-0000-0000-000000000000/license.pdf') $$,
  'owner B can upload a document for company B'
);
select throws_ok(
  $$ update public.company_documents set verification_status = 'approved'
     where id = 'dddddddd-0000-0000-0000-000000000000' $$,
  '42501', null,
  'owner B cannot approve their own document'
);

-- Platform admin: MFA required --------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "d0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select is((select count(*) from public.companies), 0::bigint, 'an admin without MFA (aal1) has no admin access');

select set_config('request.jwt.claims',
  '{"sub": "d0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}', true);
select is((select count(*) from public.companies), 3::bigint, 'an admin with MFA (aal2) sees all companies');
select lives_ok(
  $$ update public.companies set status = 'verified' where id = 'bbbbbbbb-0000-0000-0000-000000000000' $$,
  'an admin with MFA can verify a company'
);

-- Anonymous visitor -------------------------------------------------------------
reset role;
set local role anon;
select throws_ok($$ select * from public.companies $$, '42501', null, 'anonymous users cannot read companies');

select * from finish();
rollback;
