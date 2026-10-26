-- V3: maintenance, deadlines with D-30 / D-7 / D-1 reminders (Phase 5 criterion), fuel logs, RLS.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'owner-a@test.local'),
  ('a0000000-0000-0000-0000-000000000002', 'dispatcher-a@test.local'),
  ('b0000000-0000-0000-0000-000000000001', 'owner-b@test.local');
insert into public.companies (id, legal_name) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Atlas Transport SARL'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Sahara Tours SARL');
insert into public.company_members (company_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'owner'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002', 'dispatcher'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', 'owner');
-- Atlas on V3 (active), Sahara keeps the V2 trial.
update public.subscriptions set plan_code = 'v3', status = 'active', trial_ends_at = null
where company_id = 'aaaaaaaa-0000-0000-0000-000000000000';
insert into public.vehicles (id, company_id, registration, brand, model, vehicle_type_code, seats) values
  ('11111111-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', '1-A-1', 'Mercedes', 'Vito', 'van', 7),
  ('11111111-0000-4000-8000-000000000009', 'bbbbbbbb-0000-0000-0000-000000000000', '9-B-1', 'Fiat', 'Ducato', 'minibus', 16);

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select lives_ok(
  $$ insert into public.vehicle_deadlines (id, company_id, vehicle_id, kind, due_on)
     values ('55555555-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000',
       '11111111-0000-4000-8000-000000000001', 'insurance', '2026-12-31') $$,
  'the owner records an insurance deadline'
);
select lives_ok(
  $$ insert into public.maintenance_records (id, company_id, vehicle_id, kind, performed_on, odometer_km, labour_cents)
     values ('66666666-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000',
       '11111111-0000-4000-8000-000000000001', 'service', '2026-10-01', 120000, 30000) $$,
  'the owner records a service'
);
select lives_ok(
  $$ insert into public.maintenance_parts (record_id, company_id, name, quantity, unit_cost_cents)
     values ('66666666-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Filtre à huile', 1, 8000) $$,
  'parts are attached to the service'
);

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000002", "role": "authenticated", "aal": "aal1"}', true);
select lives_ok(
  $$ insert into public.fuel_logs (company_id, vehicle_id, filled_on, odometer_km, volume_cl, amount_cents)
     values ('aaaaaaaa-0000-0000-0000-000000000000', '11111111-0000-4000-8000-000000000001', '2026-10-02', 120500, 5000, 65000) $$,
  'a dispatcher records a fuel fill'
);
select is_empty(
  $$ update public.vehicle_deadlines set due_on = '2030-01-01' returning id $$,
  'a dispatcher cannot change deadlines'
);

select set_config('request.jwt.claims',
  '{"sub": "b0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select is((select count(*) from public.maintenance_records), 0::bigint, 'another company sees no maintenance of company A');
select throws_ok(
  $$ insert into public.vehicle_deadlines (company_id, vehicle_id, kind, due_on)
     values ('bbbbbbbb-0000-0000-0000-000000000000', '11111111-0000-4000-8000-000000000009', 'insurance', '2026-12-31') $$,
  '42501', null, 'deadlines need the V3 offer'
);

-- Reminders D-30, D-7, D-1, each sent once ---------------------------------------------------
reset role;
select is(private.send_deadline_reminders('2026-11-20'), 0, 'nothing more than 30 days ahead');
select is(private.send_deadline_reminders('2026-12-01'), 1, 'D-30 reminder');
select is(private.send_deadline_reminders('2026-12-02'), 0, 'the D-30 reminder is not sent twice');
select is(private.send_deadline_reminders('2026-12-24') + private.send_deadline_reminders('2026-12-30'), 2,
  'D-7 and D-1 reminders');
select is(
  (select count(*) from public.email_outbox where template = 'deadline_reminder' and payload ->> 'vehicle' = '1-A-1'),
  3::bigint, 'three reminder e-mails were queued for the owner');

select * from finish();
rollback;
