-- Q21 (read-only after expiry) and Q22 (15-day grace for past_due, then cancellation).
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into public.companies (id, legal_name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'Atlas Transport SARL');

update public.subscriptions set plan_code = 'standard', status = 'past_due'
where company_id = 'aaaaaaaa-0000-0000-0000-000000000000';
select isnt(
  (select past_due_since from public.subscriptions where company_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  null,
  'switching to past_due records when it started'
);
select ok(
  private.has_feature('aaaaaaaa-0000-0000-0000-000000000000', 'trips'),
  'a past_due subscription keeps write access during the grace period'
);

update public.subscriptions set past_due_since = now() - interval '16 days'
where company_id = 'aaaaaaaa-0000-0000-0000-000000000000';
select ok(
  not private.has_feature('aaaaaaaa-0000-0000-0000-000000000000', 'trips'),
  'after 15 days past_due, write access stops even before the daily job'
);

select is(private.cancel_overdue_subscriptions(), 1, 'the daily job cancels the overdue subscription');
select is(
  (select status::text || ':' || coalesce(past_due_since::text, 'null')
   from public.subscriptions where company_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  'cancelled:null',
  'the subscription is cancelled and past_due_since cleared'
);
select ok(
  not private.has_feature('aaaaaaaa-0000-0000-0000-000000000000', 'trips'),
  'a cancelled subscription is read-only (no write access)'
);

select is(
  (select count(*) from cron.job where jobname = 'cancel-overdue-subscriptions'),
  1::bigint,
  'the cancellation job is scheduled daily'
);
select is(
  (select value from public.platform_settings where key = 'subscription_grace_days'),
  '15'::jsonb,
  'the grace period is a platform setting (15 days)'
);

select * from finish();
rollback;
