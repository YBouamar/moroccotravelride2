-- Phase 7 (SEO): public "from" prices of the routes leaving a city, for the city landing pages.
-- Only eligible carriers count (BR-016); no carrier is exposed, only the lowest price per route.

create function public.route_prices(p_from uuid)
returns table (to_city_id uuid, min_price_cents bigint, carriers bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select g.to_city_id, min(g.price_cents), count(distinct g.company_id)
  from public.price_grids g
  where g.from_city_id = p_from
    and g.is_active
    and private.is_marketplace_eligible(g.company_id)
    and exists (
      select 1 from public.vehicles v
      where v.company_id = g.company_id and v.vehicle_type_code = g.vehicle_type_code and v.status = 'active')
  group by g.to_city_id
  order by min(g.price_cents)
  limit 20;
$$;

revoke execute on function public.route_prices(uuid) from public;
grant execute on function public.route_prices(uuid) to anon, authenticated;
