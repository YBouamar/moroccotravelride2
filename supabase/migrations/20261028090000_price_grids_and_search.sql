-- Steps 12-13: carriers' price grids and the public search of the marketplace.
--   BR-008 grid per carrier: departure, arrival, vehicle type, all-inclusive price (ADR-003).
--   BR-016 only eligible carriers appear (verified, visible, not suspended, valid tourism license).
-- The marketplace is Pillar A: it does not require a SaaS subscription (no has_feature here).

create table public.price_grids (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  from_city_id uuid not null references public.cities (id),
  to_city_id uuid not null references public.cities (id),
  vehicle_type_code text not null references public.vehicle_types (code),
  -- All-inclusive price shown to travelers, MAD cents (BR-004).
  price_cents bigint not null check (price_cents between 1000 and 10000000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, from_city_id, to_city_id, vehicle_type_code),
  unique (id, company_id)
);

create index price_grids_route_idx on public.price_grids (from_city_id, to_city_id) where is_active;
create trigger price_grids_updated_at before update on public.price_grids
  for each row execute function private.set_updated_at();
create trigger price_grids_audit after insert or update on public.price_grids
  for each row execute function private.audit_changes('price_grid', 'price_cents', 'is_active');

alter table public.price_grids enable row level security;
revoke all on public.price_grids from anon;

create policy "price grids: members and admins read" on public.price_grids
  for select to authenticated
  using (private.is_member(company_id) or private.is_platform_admin());
create policy "price grids: owners and managers write" on public.price_grids
  for all to authenticated
  using (private.has_role(company_id, '{owner,manager}'))
  with check (private.has_role(company_id, '{owner,manager}'));

/** BR-016: whether a company may currently appear on the marketplace. */
create function private.is_marketplace_eligible(p_company uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.companies c
    where c.id = p_company
      and c.status = 'verified'
      and c.marketplace_enabled
      and c.marketplace_suspended_at is null
      and c.license_expires_on >= (now() at time zone 'Africa/Casablanca')::date
  )
  and coalesce((select value::boolean from public.platform_settings where key = 'marketplace_open'), false);
$$;

/**
 * Public search (anonymous allowed). Returns the active offers of eligible carriers for a route,
 * when the carrier has an active vehicle of the type with enough seats. Pickups sooner than the
 * minimum lead time (BR-006) return nothing; the booking function checks it again.
 */
create function public.search_offers(
  p_from uuid,
  p_to uuid,
  p_pickup_at timestamptz,
  p_passengers integer
)
returns table (
  offer_id uuid,
  company_id uuid,
  carrier_name text,
  carrier_city_id uuid,
  vehicle_type_code text,
  price_cents bigint,
  max_seats integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select g.id, c.id, coalesce(c.trade_name, c.legal_name), c.city_id, g.vehicle_type_code,
    g.price_cents, max(v.seats)
  from public.price_grids g
  join public.companies c on c.id = g.company_id
  join public.vehicles v on v.company_id = c.id
    and v.vehicle_type_code = g.vehicle_type_code
    and v.status = 'active'
    and v.seats >= p_passengers
  where g.from_city_id = p_from
    and g.to_city_id = p_to
    and g.is_active
    and p_passengers between 1 and 80
    and p_pickup_at >= now() + make_interval(hours => coalesce(
      (select value::integer from public.platform_settings where key = 'min_booking_lead_hours'), 24))
    and private.is_marketplace_eligible(c.id)
  group by g.id, c.id
  order by g.price_cents, coalesce(c.trade_name, c.legal_name)
  limit 50;
$$;

revoke execute on function public.search_offers(uuid, uuid, timestamptz, integer) from public;
grant execute on function public.search_offers(uuid, uuid, timestamptz, integer) to anon, authenticated;
