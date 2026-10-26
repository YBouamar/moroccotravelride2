-- Steps 14 to 17: marketplace bookings, carrier acceptance, conversion into a SaaS trip,
-- offline payments, traveler cancellation and the commission ledger.
--   BR-003 commission frozen on the booking; BR-005 split; BR-006 lead time; BR-010 acceptance
--   deadline; BR-011 cancellation tiers; BR-013 public reference; BR-015 conversion; ADR-016.
-- Travelers never touch these tables: the web server calls the functions below with the service
-- role after its own checks (Turnstile, rate limit, signed magic link). Carriers use RLS.
-- Custom SQLSTATEs: MT020 offer unavailable, MT021 too late to book, MT022 booking not pending,
--   MT023 acceptance deadline passed, MT024 cannot cancel, MT025 payment state.

create type public.booking_status as enum (
  'pending_carrier', 'confirmed', 'assigned', 'completed',
  'cancelled_by_traveler', 'cancelled_by_carrier', 'disputed'
);
create type public.booking_payment_status as enum ('unpaid', 'paid', 'partially_refunded', 'refunded');
create type public.booking_payment_method as enum ('bank_transfer', 'cash_to_driver', 'online_card');

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  public_ref text not null unique check (public_ref ~ '^MTR-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$'),
  company_id uuid not null references public.companies (id),
  price_grid_id uuid references public.price_grids (id) on delete set null,
  traveler_name text not null check (char_length(traveler_name) between 2 and 120),
  traveler_email text not null check (char_length(traveler_email) between 3 and 200),
  traveler_phone text not null check (char_length(traveler_phone) between 8 and 32),
  locale text not null default 'fr' check (locale in ('fr', 'en', 'ar')),
  passengers integer not null check (passengers between 1 and 80),
  luggage integer not null default 0 check (luggage between 0 and 200),
  from_city_id uuid not null references public.cities (id),
  to_city_id uuid not null references public.cities (id),
  pickup_address text not null check (char_length(pickup_address) between 2 and 300),
  dropoff_address text not null check (char_length(dropoff_address) between 2 and 300),
  flight_number text check (char_length(flight_number) <= 12),
  notes text check (char_length(notes) <= 500),
  pickup_at timestamptz not null,
  vehicle_type_code text not null references public.vehicle_types (code),
  -- Frozen at creation (BR-003): never recomputed when rates change.
  total_cents bigint not null check (total_cents > 0),
  commission_rate_bps integer not null check (commission_rate_bps between 0 and 10000),
  commission_cents bigint not null check (commission_cents >= 0),
  carrier_cents bigint not null check (carrier_cents >= 0),
  cancellation_policy jsonb not null,
  payment_method public.booking_payment_method not null,
  status public.booking_status not null default 'pending_carrier',
  payment_status public.booking_payment_status not null default 'unpaid',
  accept_deadline timestamptz not null,
  responded_at timestamptz,
  trip_id uuid unique,
  cancel_reason text check (char_length(cancel_reason) <= 300),
  cancelled_at timestamptz,
  refund_cents bigint not null default 0 check (refund_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (commission_cents + carrier_cents = total_cents),
  unique (id, company_id),
  foreign key (trip_id, company_id) references public.trips (id, company_id)
);

create index bookings_company_idx on public.bookings (company_id, created_at desc);
create index bookings_pending_idx on public.bookings (accept_deadline) where status = 'pending_carrier';
create trigger bookings_updated_at before update on public.bookings
  for each row execute function private.set_updated_at();

alter table public.trips add column booking_id uuid unique;
alter table public.trips add constraint trips_booking_fk
  foreign key (booking_id, company_id) references public.bookings (id, company_id);

-- History of every booking change (BR state machine). Written by the functions only.
create table public.booking_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  company_id uuid not null,
  event text not null check (event ~ '^[a-z_]+$'),
  actor_id uuid references auth.users (id) on delete set null default auth.uid(),
  data jsonb,
  created_at timestamptz not null default now()
);
create index booking_events_booking_idx on public.booking_events (booking_id, created_at);

-- What each carrier owes the platform (ADR-016): one line per completed or partly retained booking.
create table public.commission_ledger (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id),
  booking_id uuid not null references public.bookings (id),
  kind text not null check (kind in ('completed', 'cancellation_retained')),
  amount_cents bigint not null check (amount_cents >= 0),
  occurred_at timestamptz not null default now(),
  statement_id uuid,
  unique (booking_id, kind)
);
create index commission_ledger_company_idx on public.commission_ledger (company_id, occurred_at);

create function private.log_booking(p_booking uuid, p_event text, p_data jsonb default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.booking_events (booking_id, company_id, event, data)
  select id, company_id, p_event, p_data from public.bookings where id = p_booking;
$$;

/** BR-013: random, non sequential, without ambiguous characters (0/O, 1/I/L). */
create function private.new_public_ref()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_ref text;
begin
  loop
    v_ref := 'MTR-';
    for i in 1 .. 6 loop
      v_ref := v_ref || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1);
    end loop;
    exit when not exists (select 1 from public.bookings where public_ref = v_ref);
  end loop;
  return v_ref;
end;
$$;

-- ---------------------------------------------------------------------------
-- Creation (service role only, called by the web server after Turnstile and rate limit)
-- ---------------------------------------------------------------------------
create function public.create_booking(
  p_offer uuid,
  p_pickup_at timestamptz,
  p_passengers integer,
  p_luggage integer,
  p_traveler_name text,
  p_traveler_email text,
  p_traveler_phone text,
  p_pickup_address text,
  p_dropoff_address text,
  p_flight_number text,
  p_notes text,
  p_payment_method public.booking_payment_method,
  p_locale text
)
returns table (booking_id uuid, public_ref text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grid public.price_grids;
  v_rate integer;
  v_commission bigint;
  v_lead integer := coalesce(
    (select value::integer from public.platform_settings where key = 'min_booking_lead_hours'), 24);
  v_accept integer := coalesce(
    (select value::integer from public.platform_settings where key = 'carrier_accept_hours'), 2);
  v_id uuid;
  v_ref text;
begin
  if p_payment_method not in ('bank_transfer', 'cash_to_driver') then
    raise exception 'payment method not available' using errcode = 'MT020';
  end if;
  if p_pickup_at < now() + make_interval(hours => v_lead) then
    raise exception 'too late to book' using errcode = 'MT021';
  end if;

  select g.* into v_grid from public.price_grids g where g.id = p_offer and g.is_active;
  if not found
     or not private.is_marketplace_eligible(v_grid.company_id)
     or not exists (
       select 1 from public.vehicles v
       where v.company_id = v_grid.company_id and v.vehicle_type_code = v_grid.vehicle_type_code
         and v.status = 'active' and v.seats >= p_passengers) then
    raise exception 'offer unavailable' using errcode = 'MT020';
  end if;

  -- BR-002: carrier specific rate, else the platform default; frozen from now on (BR-003).
  select coalesce(round(c.commission_rate * 10000)::integer,
    (select value::integer from public.platform_settings where key = 'default_commission_bps'))
  into v_rate from public.companies c where c.id = v_grid.company_id;
  v_commission := (v_grid.price_cents * v_rate + 5000) / 10000;
  v_ref := private.new_public_ref();

  insert into public.bookings (
    public_ref, company_id, price_grid_id, traveler_name, traveler_email, traveler_phone, locale,
    passengers, luggage, from_city_id, to_city_id, pickup_address, dropoff_address, flight_number,
    notes, pickup_at, vehicle_type_code, total_cents, commission_rate_bps, commission_cents,
    carrier_cents, cancellation_policy, payment_method, accept_deadline)
  values (
    v_ref, v_grid.company_id, v_grid.id, p_traveler_name, lower(p_traveler_email), p_traveler_phone,
    coalesce(nullif(p_locale, ''), 'fr'), p_passengers, p_luggage, v_grid.from_city_id,
    v_grid.to_city_id, p_pickup_address, p_dropoff_address, nullif(p_flight_number, ''),
    nullif(p_notes, ''), p_pickup_at, v_grid.vehicle_type_code, v_grid.price_cents, v_rate,
    v_commission, v_grid.price_cents - v_commission,
    (select value from public.platform_settings where key = 'cancellation_policy'),
    p_payment_method, now() + make_interval(hours => v_accept))
  returning id into v_id;

  perform private.log_booking(v_id, 'created', jsonb_build_object('total_cents', v_grid.price_cents));
  return query select v_id, v_ref;
end;
$$;

revoke execute on function public.create_booking(uuid, timestamptz, integer, integer, text, text, text, text, text, text, text, public.booking_payment_method, text) from public, anon, authenticated;
grant execute on function public.create_booking(uuid, timestamptz, integer, integer, text, text, text, text, text, text, text, public.booking_payment_method, text) to service_role;

-- ---------------------------------------------------------------------------
-- Carrier response (BR-010) and conversion into a trip (BR-015)
-- ---------------------------------------------------------------------------
create function public.respond_booking(
  p_booking uuid,
  p_accept boolean,
  p_duration_minutes integer default 120,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_trip uuid;
begin
  select * into v_booking from public.bookings where id = p_booking for update;
  if not found or not private.has_role(v_booking.company_id, '{owner,manager,dispatcher}') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_booking.status <> 'pending_carrier' then
    raise exception 'booking is not pending' using errcode = 'MT022';
  end if;
  if now() > v_booking.accept_deadline then
    raise exception 'acceptance deadline passed' using errcode = 'MT023';
  end if;

  if not p_accept then
    update public.bookings set status = 'cancelled_by_carrier', responded_at = now(),
      cancelled_at = now(), cancel_reason = coalesce(nullif(trim(p_reason), ''), 'refused')
    where id = p_booking;
    perform private.log_booking(p_booking, 'refused', jsonb_build_object('reason', p_reason));
    return null;
  end if;

  insert into public.trips (company_id, origin, booking_id, passenger_name, passenger_phone,
    passengers, luggage, pickup_city_id, pickup_address, dropoff_city_id, dropoff_address,
    starts_at, ends_at, price_cents, notes)
  values (v_booking.company_id, 'marketplace', v_booking.id, v_booking.traveler_name,
    v_booking.traveler_phone, v_booking.passengers, v_booking.luggage, v_booking.from_city_id,
    v_booking.pickup_address, v_booking.to_city_id, v_booking.dropoff_address, v_booking.pickup_at,
    v_booking.pickup_at + make_interval(mins => greatest(15, least(coalesce(p_duration_minutes, 120), 4320))),
    v_booking.total_cents,
    concat_ws(' · ', v_booking.public_ref, 'vol ' || v_booking.flight_number, v_booking.notes))
  returning id into v_trip;

  update public.bookings set status = 'confirmed', responded_at = now(), trip_id = v_trip
  where id = p_booking;
  perform private.log_booking(p_booking, 'accepted', jsonb_build_object('trip_id', v_trip));
  return v_trip;
end;
$$;

revoke execute on function public.respond_booking(uuid, boolean, integer, text) from public, anon;
grant execute on function public.respond_booking(uuid, boolean, integer, text) to authenticated;

/** BR-010: pending bookings past their deadline are cancelled (pg_cron, every 5 minutes). */
create function private.expire_pending_bookings()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with expired as (
    update public.bookings set status = 'cancelled_by_carrier', cancelled_at = now(),
      cancel_reason = 'expired'
    where status = 'pending_carrier' and accept_deadline < now()
    returning id, company_id
  )
  insert into public.booking_events (booking_id, company_id, event, actor_id)
  select id, company_id, 'expired', null from expired;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

select cron.schedule('expire-pending-bookings', '*/5 * * * *', 'select private.expire_pending_bookings()');

-- ---------------------------------------------------------------------------
-- The trip drives the booking: assigned, completed (commission due), cancelled by the carrier
-- ---------------------------------------------------------------------------
create function private.sync_booking_from_trip()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_status public.booking_status;
begin
  if new.booking_id is null or new.status is not distinct from old.status then
    return null;
  end if;
  select * into v_booking from public.bookings where id = new.booking_id for update;
  if v_booking.status not in ('confirmed', 'assigned') then
    return null;
  end if;
  v_status := case new.status
    when 'assigned' then 'assigned'
    when 'planned' then 'confirmed'
    when 'in_progress' then 'assigned'
    when 'completed' then 'completed'
    when 'cancelled' then 'cancelled_by_carrier'
  end;
  if v_status is distinct from v_booking.status then
    update public.bookings set status = v_status,
      cancelled_at = case when v_status = 'cancelled_by_carrier' then now() end,
      cancel_reason = case when v_status = 'cancelled_by_carrier' then new.cancel_reason end
    where id = v_booking.id;
    perform private.log_booking(v_booking.id, v_status::text);
  end if;
  if v_status = 'completed' then
    insert into public.commission_ledger (company_id, booking_id, kind, amount_cents)
    values (v_booking.company_id, v_booking.id, 'completed', v_booking.commission_cents)
    on conflict (booking_id, kind) do nothing;
  end if;
  return null;
end;
$$;

-- Plain "after update": the status may be set by the BEFORE trigger (assignment), not the SET list.
create trigger trips_sync_booking after update on public.trips
  for each row execute function private.sync_booking_from_trip();

-- ---------------------------------------------------------------------------
-- Offline payment confirmed by the carrier (BR-009c)
-- ---------------------------------------------------------------------------
create function public.confirm_booking_payment(p_booking uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings where id = p_booking for update;
  if not found or not private.has_role(v_booking.company_id, '{owner,manager,accountant}') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_booking.payment_status <> 'unpaid'
     or v_booking.status in ('pending_carrier', 'cancelled_by_traveler', 'cancelled_by_carrier') then
    raise exception 'payment cannot be confirmed' using errcode = 'MT025';
  end if;
  update public.bookings set payment_status = 'paid' where id = p_booking;
  perform private.log_booking(p_booking, 'payment_confirmed',
    jsonb_build_object('method', v_booking.payment_method, 'amount_cents', v_booking.total_cents));
end;
$$;

revoke execute on function public.confirm_booking_payment(uuid) from public, anon;
grant execute on function public.confirm_booking_payment(uuid) to authenticated;

/** Refund given back to the traveler by the carrier after a cancellation (offline). */
create function public.confirm_booking_refund(p_booking uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings where id = p_booking for update;
  if not found or not private.has_role(v_booking.company_id, '{owner,manager,accountant}') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_booking.payment_status <> 'paid' or v_booking.refund_cents = 0 then
    raise exception 'no refund due' using errcode = 'MT025';
  end if;
  update public.bookings set payment_status = case
    when v_booking.refund_cents >= v_booking.total_cents then 'refunded'::public.booking_payment_status
    else 'partially_refunded'::public.booking_payment_status end
  where id = p_booking;
  perform private.log_booking(p_booking, 'refund_confirmed', jsonb_build_object('refund_cents', v_booking.refund_cents));
end;
$$;

revoke execute on function public.confirm_booking_refund(uuid) from public, anon;
grant execute on function public.confirm_booking_refund(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Traveler cancellation (BR-011), service role only after the magic link check
-- ---------------------------------------------------------------------------
create function public.cancel_booking_by_traveler(p_booking uuid, p_reason text default null)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_hours numeric;
  v_refund_bps integer;
  v_refund bigint := 0;
  v_retained bigint := 0;
begin
  select * into v_booking from public.bookings where id = p_booking for update;
  if not found or v_booking.status not in ('pending_carrier', 'confirmed', 'assigned')
     -- Once the driver has started the trip, it can no longer be cancelled online.
     or exists (select 1 from public.trips where id = v_booking.trip_id and status = 'in_progress') then
    raise exception 'booking cannot be cancelled' using errcode = 'MT024';
  end if;
  v_hours := extract(epoch from (v_booking.pickup_at - now())) / 3600;
  -- First tier reached, tiers ordered from the most generous (validated by the settings schema).
  select (tier ->> 'refund_bps')::integer into v_refund_bps
  from jsonb_array_elements(v_booking.cancellation_policy -> 'tiers') as tier
  where v_hours >= (tier ->> 'min_hours_before')::numeric
  order by (tier ->> 'min_hours_before')::numeric desc
  limit 1;
  v_refund_bps := coalesce(v_refund_bps, 0);

  -- Nothing retained when nothing was paid (ADR-016).
  if v_booking.payment_status = 'paid' then
    v_refund := (v_booking.total_cents * v_refund_bps + 5000) / 10000;
    v_retained := v_booking.total_cents - v_refund;
  end if;

  update public.bookings set status = 'cancelled_by_traveler', cancelled_at = now(),
    cancel_reason = nullif(trim(p_reason), ''), refund_cents = v_refund
  where id = p_booking;
  if v_booking.trip_id is not null then
    update public.trips set status = 'cancelled', cancel_reason = 'Annulée par le voyageur'
    where id = v_booking.trip_id and status in ('planned', 'assigned');
  end if;
  if v_retained > 0 then
    insert into public.commission_ledger (company_id, booking_id, kind, amount_cents)
    values (v_booking.company_id, p_booking, 'cancellation_retained',
      (v_retained * v_booking.commission_rate_bps + 5000) / 10000);
  end if;
  perform private.log_booking(p_booking, 'cancelled_by_traveler',
    jsonb_build_object('refund_bps', v_refund_bps, 'refund_cents', v_refund));
  return v_refund;
end;
$$;

revoke execute on function public.cancel_booking_by_traveler(uuid, text) from public, anon, authenticated;
grant execute on function public.cancel_booking_by_traveler(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- RLS: carriers read their bookings; travelers go through the server (service role)
-- ---------------------------------------------------------------------------
alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;
alter table public.commission_ledger enable row level security;
revoke all on public.bookings, public.booking_events, public.commission_ledger from anon;
revoke insert, update, delete on public.bookings, public.booking_events, public.commission_ledger from authenticated;

create policy "bookings: office roles and admins read" on public.bookings
  for select to authenticated
  using (
    private.has_role(company_id, '{owner,manager,dispatcher,accountant}')
    or private.is_platform_admin()
  );
create policy "booking events: office roles and admins read" on public.booking_events
  for select to authenticated
  using (
    private.has_role(company_id, '{owner,manager,dispatcher,accountant}')
    or private.is_platform_admin()
  );
create policy "commission ledger: owners, accountants and admins read" on public.commission_ledger
  for select to authenticated
  using (private.has_role(company_id, '{owner,manager,accountant}') or private.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Carrier bank details for transfers (BR-009a), set by owners and managers
-- ---------------------------------------------------------------------------
alter table public.companies
  add column bank_name text check (char_length(bank_name) <= 100),
  add column bank_rib text check (bank_rib ~ '^[0-9]{24}$');

/** Office members to notify about a booking (service role only: e-mails live in auth.users). */
create function public.booking_notification_recipients(p_company uuid)
returns table (email text, locale text)
language sql
stable
security definer
set search_path = ''
as $$
  select u.email::text, coalesce(p.locale, 'fr')
  from public.company_members m
  join auth.users u on u.id = m.user_id
  left join public.profiles p on p.id = m.user_id
  where m.company_id = p_company
    and m.is_active
    and m.role in ('owner', 'manager', 'dispatcher')
    and u.email is not null;
$$;

revoke execute on function public.booking_notification_recipients(uuid) from public, anon, authenticated;
grant execute on function public.booking_notification_recipients(uuid) to service_role;
