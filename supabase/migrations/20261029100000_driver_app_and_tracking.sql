-- Steps 19 to 21 (V2): driver app actions, live location and its purge.
--   BR-201 positions are accepted only while the driver's trip is in progress (checked here).
--   BR-202 positions are purged after `location_retention_days` (90 days by default).
--   BR-203 the app sends one point every 15 s or 50 m (À CONFIRMER), in batches when offline.

/** Driver: start or finish their own trip (V2 'driver_app'). The trips trigger checks the rest. */
create function public.driver_set_trip_status(p_trip uuid, p_status public.trip_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trip public.trips;
begin
  select t.* into v_trip from public.trips t
  join public.drivers d on d.id = t.driver_id
  where t.id = p_trip and d.user_id = (select auth.uid()) and d.status = 'active'
  for update of t;
  if not found or not private.has_feature(v_trip.company_id, 'driver_app') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not ((v_trip.status = 'assigned' and p_status = 'in_progress')
       or (v_trip.status = 'in_progress' and p_status = 'completed')) then
    raise exception 'transition not allowed for a driver' using errcode = 'MT005';
  end if;
  update public.trips set status = p_status where id = p_trip;
end;
$$;

revoke execute on function public.driver_set_trip_status(uuid, public.trip_status) from public, anon;
grant execute on function public.driver_set_trip_status(uuid, public.trip_status) to authenticated;

create table public.driver_locations (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies (id) on delete cascade,
  trip_id uuid not null,
  driver_id uuid not null,
  latitude numeric(9, 6) not null check (latitude between -90 and 90),
  longitude numeric(9, 6) not null check (longitude between -180 and 180),
  accuracy_m real check (accuracy_m >= 0),
  recorded_at timestamptz not null,
  received_at timestamptz not null default now(),
  foreign key (trip_id, company_id) references public.trips (id, company_id) on delete cascade,
  foreign key (driver_id, company_id) references public.drivers (id, company_id) on delete cascade
);

create index driver_locations_trip_idx on public.driver_locations (trip_id, recorded_at desc);
create index driver_locations_recorded_idx on public.driver_locations (recorded_at);

/**
 * Batch of positions from the driver app: [{"lat":..,"lng":..,"accuracy":..,"at":"iso"}].
 * Accepted only for the driver's own trip while it is in progress (BR-201); points older than
 * the trip start or in the future are ignored. Returns the number of points stored.
 */
create function public.record_driver_locations(p_trip uuid, p_points jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trip public.trips;
  v_count integer;
begin
  select t.* into v_trip from public.trips t
  join public.drivers d on d.id = t.driver_id
  where t.id = p_trip and d.user_id = (select auth.uid()) and d.status = 'active';
  if not found or not private.has_feature(v_trip.company_id, 'live_tracking') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_trip.status <> 'in_progress' then
    raise exception 'positions are recorded only during the trip' using errcode = 'MT005';
  end if;
  if jsonb_typeof(p_points) <> 'array' or jsonb_array_length(p_points) > 500 then
    raise exception 'invalid batch' using errcode = '22023';
  end if;

  insert into public.driver_locations (company_id, trip_id, driver_id, latitude, longitude, accuracy_m, recorded_at)
  select v_trip.company_id, v_trip.id, v_trip.driver_id,
    (point ->> 'lat')::numeric, (point ->> 'lng')::numeric, nullif(point ->> 'accuracy', '')::real,
    (point ->> 'at')::timestamptz
  from jsonb_array_elements(p_points) as point
  where (point ->> 'at')::timestamptz between v_trip.starts_at - interval '2 hours' and now() + interval '1 minute';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.record_driver_locations(uuid, jsonb) from public, anon;
grant execute on function public.record_driver_locations(uuid, jsonb) to authenticated;

/** Last known position of each trip in progress of a company (office live map). */
create function public.live_positions(p_company uuid)
returns table (trip_id uuid, latitude numeric, longitude numeric, recorded_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select distinct on (l.trip_id) l.trip_id, l.latitude, l.longitude, l.recorded_at
  from public.driver_locations l
  join public.trips t on t.id = l.trip_id
  where l.company_id = p_company and t.status = 'in_progress'
  order by l.trip_id, l.recorded_at desc;
$$;

grant execute on function public.live_positions(uuid) to authenticated;

/** BR-202: positions are kept `location_retention_days`, then deleted (daily pg_cron). */
create function private.purge_driver_locations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_days integer := coalesce(
    (select value::integer from public.platform_settings where key = 'location_retention_days'), 90);
  v_count integer;
begin
  delete from public.driver_locations where recorded_at < now() - make_interval(days => v_days);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

select cron.schedule('purge-driver-locations', '15 3 * * *', 'select private.purge_driver_locations()');

alter table public.driver_locations enable row level security;
revoke all on public.driver_locations from anon;
revoke insert, update, delete on public.driver_locations from authenticated;

-- Dispatching roles follow the trips; the accountant and the platform do not need positions.
create policy "driver locations: owners, managers and dispatchers read" on public.driver_locations
  for select to authenticated
  using (private.has_role(company_id, '{owner,manager,dispatcher}'));

-- Live map: Realtime broadcasts new rows, filtered by the same RLS policy.
alter publication supabase_realtime add table public.driver_locations;
