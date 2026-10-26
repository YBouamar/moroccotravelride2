-- Phase 6 (steps 25 to 27): platform KPIs, accounting exports (read side), reviews and moderation.
--   Reviews: a traveler rates a completed booking once (magic link, server side), the platform
--   moderates; only published reviews count in the carrier's public rating.

create type public.review_status as enum ('pending', 'published', 'hidden');

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  traveler_name text not null check (char_length(traveler_name) between 1 and 120),
  status public.review_status not null default 'pending',
  moderated_by uuid references auth.users (id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now()
);
create index reviews_company_idx on public.reviews (company_id, status);

create trigger reviews_audit after update on public.reviews
  for each row execute function private.audit_changes('review', 'status');

/** Traveler review of a completed booking (service role only, after the magic link check). */
create function public.submit_review(p_booking uuid, p_rating integer, p_comment text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_id uuid;
begin
  select * into v_booking from public.bookings where id = p_booking;
  if not found or v_booking.status <> 'completed' then
    raise exception 'only a completed booking can be reviewed' using errcode = 'MT024';
  end if;
  insert into public.reviews (booking_id, company_id, rating, comment, traveler_name)
  values (p_booking, v_booking.company_id, p_rating, nullif(trim(p_comment), ''),
    split_part(v_booking.traveler_name, ' ', 1))
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.submit_review(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.submit_review(uuid, integer, text) to service_role;

/** Public rating of the marketplace carriers (published reviews only). */
create function public.carrier_ratings(p_companies uuid[])
returns table (company_id uuid, average numeric, reviews bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select r.company_id, round(avg(r.rating)::numeric, 1), count(*)
  from public.reviews r
  where r.company_id = any(p_companies) and r.status = 'published'
  group by r.company_id;
$$;
revoke execute on function public.carrier_ratings(uuid[]) from public;
grant execute on function public.carrier_ratings(uuid[]) to anon, authenticated;

/**
 * Platform KPIs for one Morocco month (admin with MFA): MRR of active subscriptions, GMV and
 * commissions of the completed marketplace bookings, booking funnel, carriers, open statements.
 */
create function public.admin_kpis(p_month date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_month date := coalesce(date_trunc('month', p_month)::date,
    date_trunc('month', (now() at time zone 'Africa/Casablanca'))::date);
  v_start timestamptz := v_month::timestamp at time zone 'Africa/Casablanca';
  v_end timestamptz := (v_month + interval '1 month')::timestamp at time zone 'Africa/Casablanca';
begin
  if not private.is_platform_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'month', v_month,
    'mrr_cents', (select coalesce(sum(p.monthly_price_cents), 0) from public.subscriptions s
      join public.plans p on p.code = s.plan_code where s.status in ('active', 'past_due')),
    'subscriptions', (select jsonb_object_agg(status, total) from (
      select status::text, count(*) as total from public.subscriptions group by status) t),
    'gmv_cents', (select coalesce(sum(total_cents), 0) from public.bookings
      where status = 'completed' and pickup_at >= v_start and pickup_at < v_end),
    'commission_cents', (select coalesce(sum(amount_cents), 0) from public.commission_ledger
      where occurred_at >= v_start and occurred_at < v_end),
    'bookings', (select jsonb_object_agg(status, total) from (
      select status::text, count(*) as total from public.bookings
      where created_at >= v_start and created_at < v_end group by status) b),
    'companies', (select jsonb_object_agg(status, total) from (
      select status::text, count(*) as total from public.companies group by status) c),
    'open_statements_cents', (select coalesce(sum(total_cents - paid_cents), 0)
      from public.commission_statements where status in ('issued', 'overdue')),
    'overdue_statements', (select count(*) from public.commission_statements where status = 'overdue')
  );
end;
$$;
revoke execute on function public.admin_kpis(date) from public, anon;
grant execute on function public.admin_kpis(date) to authenticated;

alter table public.reviews enable row level security;
revoke all on public.reviews from anon;
revoke insert, delete on public.reviews from authenticated;

create policy "reviews: the company and admins read" on public.reviews
  for select to authenticated
  using (private.has_role(company_id, '{owner,manager,dispatcher,accountant}') or private.is_platform_admin());
-- Moderation: platform admins only (status), never the carrier.
create policy "reviews: admins moderate" on public.reviews
  for update to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());
