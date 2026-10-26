-- Step 9: trips and planning. Business rules enforced here, not only in the UI:
--   BR-113 status machine, BR-114 planning conflicts (blocking, owner/manager override, audited),
--   BR-121 / Q24 no trip without a valid driving license on the day of the trip.
-- Custom SQLSTATEs (mapped to translated messages by the web app):
--   MT001 driver ineligible, MT002 schedule conflict, MT003 capacity exceeded,
--   MT004 vehicle unavailable, MT005 invalid status transition, MT006 locked trip.

create type public.trip_status as enum ('planned', 'assigned', 'in_progress', 'completed', 'cancelled');
create type public.trip_origin as enum ('manual', 'marketplace');

-- Composite keys so that a trip can only reference rows of its own company.
alter table public.vehicles add constraint vehicles_id_company_key unique (id, company_id);
alter table public.drivers add constraint drivers_id_company_key unique (id, company_id);
alter table public.clients add constraint clients_id_company_key unique (id, company_id);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  origin public.trip_origin not null default 'manual',
  client_id uuid,
  passenger_name text not null check (char_length(passenger_name) between 2 and 120),
  passenger_phone text check (char_length(passenger_phone) <= 32),
  passengers integer not null check (passengers between 1 and 80),
  luggage integer not null default 0 check (luggage between 0 and 200),
  pickup_city_id uuid not null references public.cities (id),
  pickup_address text not null check (char_length(pickup_address) between 2 and 300),
  dropoff_city_id uuid not null references public.cities (id),
  dropoff_address text not null check (char_length(dropoff_address) between 2 and 300),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- Agreed price in MAD cents (ADR-006); null while not priced yet.
  price_cents bigint check (price_cents >= 0),
  vehicle_id uuid,
  driver_id uuid,
  status public.trip_status not null default 'planned',
  notes text check (char_length(notes) <= 1000),
  -- BR-114 override: set by an owner or manager, with a reason, recorded in the audit log.
  conflict_override boolean not null default false,
  override_reason text check (char_length(override_reason) <= 300),
  override_by uuid references auth.users (id) on delete set null,
  cancel_reason text check (char_length(cancel_reason) <= 300),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (ends_at - starts_at <= interval '3 days'),
  check (not conflict_override or override_reason is not null),
  foreign key (client_id, company_id) references public.clients (id, company_id),
  foreign key (vehicle_id, company_id) references public.vehicles (id, company_id),
  foreign key (driver_id, company_id) references public.drivers (id, company_id)
);

create index trips_company_starts_idx on public.trips (company_id, starts_at);
create index trips_driver_idx on public.trips (driver_id, starts_at) where driver_id is not null;
create index trips_vehicle_idx on public.trips (vehicle_id, starts_at) where vehicle_id is not null;
create trigger trips_updated_at before update on public.trips
  for each row execute function private.set_updated_at();

/** Allowed transitions of BR-113 (the planned/assigned pair follows the assignment). */
create function private.trip_transition_allowed(p_from public.trip_status, p_to public.trip_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_from = p_to
    or (p_from, p_to) in (
      ('planned', 'assigned'), ('assigned', 'planned'),
      ('assigned', 'in_progress'), ('in_progress', 'completed'),
      ('planned', 'cancelled'), ('assigned', 'cancelled'), ('in_progress', 'cancelled')
    );
$$;

create function private.check_trip()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_driver record;
  v_vehicle record;
  v_day date := (new.starts_at at time zone 'Africa/Casablanca')::date;
  v_can_override boolean;
begin
  if tg_op = 'UPDATE' then
    if old.status in ('completed', 'cancelled') then
      raise exception 'trip % is %', old.id, old.status using errcode = 'MT006';
    end if;
    if new.company_id <> old.company_id or new.origin <> old.origin then
      raise exception 'company and origin are immutable' using errcode = 'MT006';
    end if;
  end if;

  -- The planned/assigned status follows the assignment; other statuses are explicit.
  if new.status in ('planned', 'assigned') then
    new.status := case when new.driver_id is not null and new.vehicle_id is not null
      then 'assigned'::public.trip_status else 'planned'::public.trip_status end;
  end if;
  if tg_op = 'UPDATE' and not private.trip_transition_allowed(old.status, new.status) then
    raise exception 'transition % -> % not allowed', old.status, new.status using errcode = 'MT005';
  end if;
  if tg_op = 'INSERT' and new.status not in ('planned', 'assigned') then
    raise exception 'a trip starts planned' using errcode = 'MT005';
  end if;
  if new.status = 'in_progress' and (new.driver_id is null or new.vehicle_id is null) then
    raise exception 'a trip needs a driver and a vehicle to start' using errcode = 'MT005';
  end if;
  if new.status = 'cancelled' then
    return new;
  end if;

  -- Serialize assignment checks per company so that two concurrent writes cannot both pass.
  perform pg_advisory_xact_lock(hashtextextended(new.company_id::text, 0));

  v_can_override := private.has_role(new.company_id, '{owner,manager}');
  if new.conflict_override then
    if not v_can_override then
      raise exception 'only owners and managers can override conflicts' using errcode = '42501';
    end if;
    new.override_by := auth.uid();
  else
    new.override_reason := null;
    new.override_by := null;
  end if;

  if new.driver_id is not null then
    select status, license_expires_on into v_driver from public.drivers where id = new.driver_id;
    -- Q24: never overridable.
    if v_driver.status <> 'active' or v_driver.license_expires_on < v_day then
      raise exception 'driver cannot perform a trip on %', v_day using errcode = 'MT001';
    end if;
  end if;

  if new.vehicle_id is not null then
    select status, seats into v_vehicle from public.vehicles where id = new.vehicle_id;
    if v_vehicle.status <> 'active' then
      raise exception 'vehicle is %', v_vehicle.status using errcode = 'MT004';
    end if;
    if new.passengers > v_vehicle.seats and not new.conflict_override then
      raise exception 'capacity exceeded' using errcode = 'MT003';
    end if;
  end if;

  if not new.conflict_override and exists (
    select 1 from public.trips t
    where t.company_id = new.company_id
      and t.id <> new.id
      and t.status not in ('cancelled', 'completed')
      and tstzrange(t.starts_at, t.ends_at) && tstzrange(new.starts_at, new.ends_at)
      and ((new.driver_id is not null and t.driver_id = new.driver_id)
        or (new.vehicle_id is not null and t.vehicle_id = new.vehicle_id))
  ) then
    raise exception 'driver or vehicle already booked' using errcode = 'MT002';
  end if;

  return new;
end;
$$;

create trigger trips_check before insert or update on public.trips
  for each row execute function private.check_trip();

create trigger trips_audit after insert or update on public.trips
  for each row execute function private.audit_changes(
    'trip', 'status', 'driver_id', 'vehicle_id', 'starts_at', 'ends_at', 'price_cents',
    'conflict_override', 'override_reason', 'cancel_reason'
  );

alter table public.trips enable row level security;
revoke all on public.trips from anon;

-- Office roles read their company's trips; a driver reads the trips assigned to them.
create policy "trips: office roles, the assigned driver and admins read" on public.trips
  for select to authenticated
  using (
    private.has_role(company_id, '{owner,manager,dispatcher,accountant}')
    or exists (
      select 1 from public.drivers d
      where d.id = trips.driver_id and d.user_id = (select auth.uid())
    )
    or private.is_platform_admin()
  );

create policy "trips: owners, managers and dispatchers insert with an active offer" on public.trips
  for insert to authenticated
  with check (
    private.has_role(company_id, '{owner,manager,dispatcher}')
    and private.has_feature(company_id, 'trips')
  );

create policy "trips: owners, managers and dispatchers update with an active offer" on public.trips
  for update to authenticated
  using (
    private.has_role(company_id, '{owner,manager,dispatcher}')
    and private.has_feature(company_id, 'trips')
  )
  with check (
    private.has_role(company_id, '{owner,manager,dispatcher}')
    and private.has_feature(company_id, 'trips')
  );
-- No delete policy: trips are cancelled, never deleted (history, invoices, commissions).
