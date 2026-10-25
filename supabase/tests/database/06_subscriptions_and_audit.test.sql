-- Subscriptions, feature gating and audit trail.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'owner-a@test.local'),
  ('a0000000-0000-0000-0000-000000000003', 'driver-a@test.local'),
  ('b0000000-0000-0000-0000-000000000001', 'owner-b@test.local'),
  ('d0000000-0000-0000-0000-000000000001', 'admin@test.local');
update public.profiles set is_platform_admin = true where id = 'd0000000-0000-0000-0000-000000000001';
insert into public.companies (id, legal_name) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Atlas Transport SARL'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Sahara Tours SARL');
insert into public.company_members (company_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'owner'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003', 'driver'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', 'owner');

-- Trial created automatically -------------------------------------------------
select is(
  (select plan_code || ':' || status from public.subscriptions where company_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  'v2:trial',
  'a new company starts a V2 trial'
);
select ok(
  (select trial_ends_at between now() + interval '13 days 23 hours' and now() + interval '14 days 1 hour'
   from public.subscriptions where company_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  'the trial lasts 14 days (platform_settings.saas_trial)'
);
select is((select count(*) from public.plans), 3::bigint, 'three offers exist');
select ok(
  (select not (after ? 'current_period_end') and after ? 'plan_code'
   from public.audit_logs
   where action = 'subscription.insert' and company_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  'the audit log ignores columns that stay empty'
);
select ok(
  private.has_feature('aaaaaaaa-0000-0000-0000-000000000000', 'expenses'),
  'a V2 trial includes V2 features'
);
select ok(
  not private.has_feature('aaaaaaaa-0000-0000-0000-000000000000', 'fleet_maintenance'),
  'a V2 trial does not include V3 features'
);

update public.subscriptions set plan_code = 'standard', status = 'active'
where company_id = 'bbbbbbbb-0000-0000-0000-000000000000';
select ok(
  private.has_feature('bbbbbbbb-0000-0000-0000-000000000000', 'invoicing')
    and not private.has_feature('bbbbbbbb-0000-0000-0000-000000000000', 'expenses'),
  'Standard includes invoicing but not expenses'
);

update public.subscriptions set trial_ends_at = now() - interval '1 minute'
where company_id = 'aaaaaaaa-0000-0000-0000-000000000000';
select ok(
  not private.has_feature('aaaaaaaa-0000-0000-0000-000000000000', 'trips'),
  'an expired trial gives no feature'
);
update public.subscriptions set trial_ends_at = now() + interval '14 days'
where company_id = 'aaaaaaaa-0000-0000-0000-000000000000';

-- Visibility and write access -------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000003", "role": "authenticated", "aal": "aal1"}', true);
select is(
  (select array_agg(company_id) from public.subscriptions),
  array['aaaaaaaa-0000-0000-0000-000000000000'::uuid],
  'members (even drivers) only see their own subscription'
);

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select is_empty(
  $$ update public.subscriptions set plan_code = 'v3', status = 'active'
     where company_id = 'aaaaaaaa-0000-0000-0000-000000000000' returning company_id $$,
  'an owner cannot activate or change their own subscription'
);
select throws_ok(
  $$ insert into public.audit_logs (action, entity_type, entity_id) values ('fake.insert', 'x', 'y') $$,
  '42501', null,
  'nobody writes the audit log directly'
);

select set_config('request.jwt.claims',
  '{"sub": "d0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal2"}', true);
select lives_ok(
  $$ update public.subscriptions set plan_code = 'v3', status = 'active', current_period_start = current_date
     where company_id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  'an admin activates a subscription'
);
select lives_ok(
  $$ update public.companies set status = 'verified' where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  'an admin verifies a company'
);

-- Audit trail -----------------------------------------------------------------
select is(
  (select after ->> 'status' from public.audit_logs
   where action = 'company.update' and company_id = 'aaaaaaaa-0000-0000-0000-000000000000'
   order by id desc limit 1),
  'verified',
  'verifying a company is audited with the new status'
);
select is(
  (select actor_id from public.audit_logs
   where action = 'subscription.update' and company_id = 'aaaaaaaa-0000-0000-0000-000000000000'
   order by id desc limit 1),
  'd0000000-0000-0000-0000-000000000001'::uuid,
  'the audit log records who changed the subscription'
);

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select ok(
  (select count(*) from public.audit_logs where company_id = 'aaaaaaaa-0000-0000-0000-000000000000') > 0
    and (select count(*) from public.audit_logs where company_id = 'bbbbbbbb-0000-0000-0000-000000000000') = 0,
  'an owner reads the audit log of their company only'
);

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000003", "role": "authenticated", "aal": "aal1"}', true);
select is((select count(*) from public.audit_logs), 0::bigint, 'a driver cannot read the audit log');

select * from finish();
rollback;
