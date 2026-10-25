-- Answers of 2026-10-26 (ADR-022):
--   Q21: an ended trial or subscription makes the company READ-ONLY (data stays readable).
--   Q22: a past_due subscription keeps full access for 15 days, then it is cancelled.
--   Q23: platform payment details (RIB, e-mail, phone) shown on the subscription page.
--
-- Convention for SaaS tables (Phase 2 onward): SELECT policies require membership only;
-- INSERT / UPDATE / DELETE policies also require private.has_feature() (= write access).

insert into public.platform_settings (key, value, description) values
  ('subscription_grace_days', '15',
   'Jours d''accès complet après passage en paiement en retard, avant résiliation (Q22)'),
  ('subscription_payment_info',
   '{"bank_name": "", "account_holder": "", "rib": "", "email": "", "phone": ""}',
   'Coordonnées de paiement des abonnements affichées aux transporteurs (Q23), saisies par l''admin');

alter table public.subscriptions add column past_due_since timestamptz;

-- past_due_since follows the status: set when it becomes past_due, cleared otherwise.
create function private.track_past_due()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'past_due' and (tg_op = 'INSERT' or old.status is distinct from 'past_due') then
    new.past_due_since := now();
  elsif new.status <> 'past_due' then
    new.past_due_since := null;
  end if;
  return new;
end;
$$;

create trigger subscriptions_track_past_due before insert or update on public.subscriptions
  for each row execute function private.track_past_due();

/** Write access to a feature (read access only needs membership, Q21). */
create or replace function private.has_feature(target_company uuid, feature text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.subscriptions s
    join public.plan_features pf on pf.plan_code = s.plan_code
    where s.company_id = target_company
      and pf.feature_key = feature
      and (
        s.status = 'active'
        or (s.status = 'trial' and s.trial_ends_at > now())
        or (
          s.status = 'past_due'
          and s.past_due_since > now() - make_interval(days => coalesce(
            (select (value #>> '{}')::integer from public.platform_settings
             where key = 'subscription_grace_days'),
            15
          ))
        )
      )
  );
$$;

/** Daily job: past_due subscriptions beyond the grace period are cancelled (Q22). */
create function private.cancel_overdue_subscriptions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.subscriptions
  set status = 'cancelled'
  where status = 'past_due'
    and past_due_since <= now() - make_interval(days => coalesce(
      (select (value #>> '{}')::integer from public.platform_settings
       where key = 'subscription_grace_days'),
      15
    ));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function private.cancel_overdue_subscriptions() from public;

create extension if not exists pg_cron;

select cron.schedule(
  'cancel-overdue-subscriptions',
  '15 2 * * *', -- every day at 02:15 UTC
  $$ select private.cancel_overdue_subscriptions() $$
);
