-- Home page redesign (ADR-040):
--   1. quote requests for chauffeur hire ("mise à disposition") and organized tours, which are not
--      bookable online: written by the server only (service role, after Turnstile and rate limit),
--      read and handled by platform admins;
--   2. public "from" prices of every route, for the destination cards of the home page.

create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('hourly', 'tour')),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) between 3 and 200),
  phone text not null check (char_length(phone) between 8 and 20),
  from_city_id uuid not null references public.cities (id),
  start_date date not null,
  days integer not null check (days between 1 and 30),
  passengers integer not null check (passengers between 1 and 80),
  message text not null default '' check (char_length(message) <= 2000),
  locale text not null default 'fr' check (locale in ('fr', 'en', 'ar')),
  status text not null default 'new' check (status in ('new', 'handled', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quote_requests_status_idx on public.quote_requests (status, created_at desc);

create trigger quote_requests_updated_at before update on public.quote_requests
  for each row execute function private.set_updated_at();
create trigger quote_requests_audit after update on public.quote_requests
  for each row execute function private.audit_changes('quote_request', 'status');

alter table public.quote_requests enable row level security;
revoke all on public.quote_requests from anon;
revoke insert, delete on public.quote_requests from authenticated;

create policy "quote requests: admins read" on public.quote_requests
  for select to authenticated
  using (private.is_platform_admin());
-- Admins only change the status; the content of the request stays as sent.
create policy "quote requests: admins handle" on public.quote_requests
  for update to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

revoke update on public.quote_requests from authenticated;
grant update (status) on public.quote_requests to authenticated;

-- Personal data minimization (law 09-08): requests are purged 12 months after their last change
-- (retention to be confirmed, ADR-040).
select cron.schedule(
  'purge-quote-requests', '45 3 * * *',
  $$delete from public.quote_requests where updated_at < now() - interval '12 months'$$
);

/** E-mail addresses of the platform admins, to notify them of a new request. Server only. */
create function public.platform_admin_emails()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email::text
  from auth.users u
  join public.profiles p on p.id = u.id
  where p.is_platform_admin and u.email is not null;
$$;

revoke execute on function public.platform_admin_emails() from public, anon, authenticated;
grant execute on function public.platform_admin_emails() to service_role;

/** Lowest public price of every route served by an eligible carrier (home page). */
create function public.route_price_overview()
returns table (from_city_id uuid, to_city_id uuid, min_price_cents bigint, carriers bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select g.from_city_id, g.to_city_id, min(g.price_cents), count(distinct g.company_id)
  from public.price_grids g
  where g.is_active
    and private.is_marketplace_eligible(g.company_id)
    and exists (
      select 1 from public.vehicles v
      where v.company_id = g.company_id and v.vehicle_type_code = g.vehicle_type_code and v.status = 'active')
  group by g.from_city_id, g.to_city_id
  order by min(g.price_cents)
  limit 100;
$$;

revoke execute on function public.route_price_overview() from public;
grant execute on function public.route_price_overview() to anon, authenticated;
