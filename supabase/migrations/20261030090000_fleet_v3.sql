-- Phase 5 (V3): maintenance and parts, vehicle deadlines with reminders, fuel consumption.
-- Features: fleet_maintenance, vehicle_deadlines, fuel_tracking (V3 offer, ADR-022 convention).
-- Acceptance criterion: reminders at D-30, D-7 and D-1 for an insurance deadline.

create type public.maintenance_kind as enum ('service', 'repair', 'tires', 'inspection', 'other');
create type public.deadline_kind as enum ('insurance', 'technical_inspection', 'vignette', 'transport_authorization', 'other');

create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  vehicle_id uuid not null,
  kind public.maintenance_kind not null,
  performed_on date not null,
  odometer_km integer check (odometer_km between 0 and 5000000),
  garage text check (char_length(garage) <= 120),
  notes text check (char_length(notes) <= 500),
  -- Labour and other costs; parts are listed below. Totals are computed, never stored twice.
  labour_cents bigint not null default 0 check (labour_cents >= 0),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (id, company_id),
  foreign key (vehicle_id, company_id) references public.vehicles (id, company_id)
);
create index maintenance_records_vehicle_idx on public.maintenance_records (vehicle_id, performed_on desc);

create table public.maintenance_parts (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null,
  company_id uuid not null,
  name text not null check (char_length(name) between 2 and 120),
  quantity integer not null check (quantity between 1 and 1000),
  unit_cost_cents bigint not null check (unit_cost_cents >= 0),
  foreign key (record_id, company_id) references public.maintenance_records (id, company_id) on delete cascade
);

create table public.vehicle_deadlines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  vehicle_id uuid not null,
  kind public.deadline_kind not null,
  label text check (char_length(label) <= 120),
  due_on date not null,
  -- Smallest reminder already sent (30, 7 or 1 days before): each reminder is sent once.
  last_reminder_days integer check (last_reminder_days in (30, 7, 1)),
  done_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (vehicle_id, company_id) references public.vehicles (id, company_id)
);
create index vehicle_deadlines_due_idx on public.vehicle_deadlines (due_on) where done_at is null;

create table public.fuel_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  vehicle_id uuid not null,
  filled_on date not null,
  odometer_km integer not null check (odometer_km between 0 and 5000000),
  -- Centilitres (integer, no floats): 45.30 L = 4530.
  volume_cl integer not null check (volume_cl between 100 and 100000),
  amount_cents bigint not null check (amount_cents >= 0),
  full_tank boolean not null default true,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (vehicle_id, company_id) references public.vehicles (id, company_id)
);
create index fuel_logs_vehicle_idx on public.fuel_logs (vehicle_id, odometer_km);

/**
 * Daily (pg_cron 07:00 UTC): queues one e-mail per deadline reaching D-30, D-7 or D-1 to the
 * owners and managers, once per level. `p_today` makes the job testable.
 */
create function private.send_deadline_reminders(p_today date default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := coalesce(p_today, (now() at time zone 'Africa/Casablanca')::date);
  v_count integer := 0;
  v_deadline record;
  v_level integer;
begin
  for v_deadline in
    select d.*, v.registration
    from public.vehicle_deadlines d
    join public.vehicles v on v.id = d.vehicle_id
    where d.done_at is null and d.due_on >= v_today and d.due_on - v_today <= 30
      and private.has_feature(d.company_id, 'vehicle_deadlines')
  loop
    v_level := case
      when v_deadline.due_on - v_today <= 1 then 1
      when v_deadline.due_on - v_today <= 7 then 7
      else 30 end;
    continue when v_deadline.last_reminder_days is not null and v_deadline.last_reminder_days <= v_level;

    insert into public.email_outbox (to_email, template, locale, payload)
    select u.email, 'deadline_reminder', coalesce(p.locale, 'fr'),
      jsonb_build_object('vehicle', v_deadline.registration, 'kind', v_deadline.kind::text,
        'label', coalesce(v_deadline.label, ''), 'days', v_deadline.due_on - v_today,
        'date', to_char(v_deadline.due_on, 'DD/MM/YYYY'))
    from public.company_members m
    join auth.users u on u.id = m.user_id
    left join public.profiles p on p.id = m.user_id
    where m.company_id = v_deadline.company_id and m.is_active and m.role in ('owner', 'manager')
      and u.email is not null;

    update public.vehicle_deadlines set last_reminder_days = v_level where id = v_deadline.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

select cron.schedule('send-deadline-reminders', '0 7 * * *', 'select private.send_deadline_reminders()');

alter table public.maintenance_records enable row level security;
alter table public.maintenance_parts enable row level security;
alter table public.vehicle_deadlines enable row level security;
alter table public.fuel_logs enable row level security;
revoke all on public.maintenance_records, public.maintenance_parts, public.vehicle_deadlines, public.fuel_logs from anon;

create policy "maintenance: office roles read" on public.maintenance_records
  for select to authenticated using (private.has_role(company_id, '{owner,manager,dispatcher,accountant}'));
create policy "maintenance: owners and managers write with V3" on public.maintenance_records
  for all to authenticated
  using (private.has_role(company_id, '{owner,manager}') and private.has_feature(company_id, 'fleet_maintenance'))
  with check (private.has_role(company_id, '{owner,manager}') and private.has_feature(company_id, 'fleet_maintenance'));

create policy "maintenance parts: office roles read" on public.maintenance_parts
  for select to authenticated using (private.has_role(company_id, '{owner,manager,dispatcher,accountant}'));
create policy "maintenance parts: owners and managers write with V3" on public.maintenance_parts
  for all to authenticated
  using (private.has_role(company_id, '{owner,manager}') and private.has_feature(company_id, 'fleet_maintenance'))
  with check (private.has_role(company_id, '{owner,manager}') and private.has_feature(company_id, 'fleet_maintenance'));

create policy "deadlines: office roles read" on public.vehicle_deadlines
  for select to authenticated using (private.has_role(company_id, '{owner,manager,dispatcher,accountant}'));
create policy "deadlines: owners and managers write with V3" on public.vehicle_deadlines
  for all to authenticated
  using (private.has_role(company_id, '{owner,manager}') and private.has_feature(company_id, 'vehicle_deadlines'))
  with check (private.has_role(company_id, '{owner,manager}') and private.has_feature(company_id, 'vehicle_deadlines'));

create policy "fuel logs: office roles read" on public.fuel_logs
  for select to authenticated using (private.has_role(company_id, '{owner,manager,dispatcher,accountant}'));
create policy "fuel logs: owners, managers and dispatchers write with V3" on public.fuel_logs
  for all to authenticated
  using (private.has_role(company_id, '{owner,manager,dispatcher}') and private.has_feature(company_id, 'fuel_tracking'))
  with check (private.has_role(company_id, '{owner,manager,dispatcher}') and private.has_feature(company_id, 'fuel_tracking'));
