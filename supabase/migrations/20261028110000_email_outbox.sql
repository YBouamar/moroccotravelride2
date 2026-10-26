-- Step 17: transactional e-mails go through an outbox, written and read by the server only
-- (service role). A booking is never lost because an e-mail provider is down: the outbox is
-- flushed again by a scheduled call (/api/cron/emails). No personal data beyond what the e-mail
-- needs; rows are purged after 90 days.

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  to_email text not null check (char_length(to_email) between 3 and 200),
  template text not null check (template ~ '^[a-z_]+$'),
  locale text not null default 'fr' check (locale in ('fr', 'en', 'ar')),
  payload jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0,
  last_error text check (char_length(last_error) <= 500),
  booking_id uuid references public.bookings (id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index email_outbox_pending_idx on public.email_outbox (created_at) where status = 'pending';

alter table public.email_outbox enable row level security;
revoke all on public.email_outbox from anon, authenticated;
-- Only the service role (server, bypasses RLS) reads and writes the outbox: deny everyone else.
create policy "email outbox: server only" on public.email_outbox
  for all to anon, authenticated using (false) with check (false);

select cron.schedule(
  'purge-email-outbox', '30 3 * * *',
  $$delete from public.email_outbox where created_at < now() - interval '90 days'$$
);
