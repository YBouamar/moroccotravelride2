-- Platform-wide business settings (docs/BUSINESS_RULES.md). Values are validated by Zod schemas in
-- packages/shared before use. Rates are basis points (2000 = 20 %, ADR-006).

create table public.platform_settings (
  key text primary key check (key ~ '^[a-z][a-z0-9_]*$'),
  value jsonb not null,
  description text,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);

create trigger platform_settings_updated_at before update on public.platform_settings
  for each row execute function private.set_updated_at();

alter table public.platform_settings enable row level security;

-- No secrets here: the marketplace needs some of these values before login (e.g. minimum lead time).
create policy "settings are public" on public.platform_settings
  for select to anon, authenticated using (true);

-- Keys are created by migrations only; admins can change values.
create policy "settings: admins update" on public.platform_settings
  for update to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

insert into public.platform_settings (key, value, description) values
  ('default_commission_bps', '2000', 'Commission marketplace par défaut, en points de base (BR-001)'),
  ('min_booking_lead_hours', '24', 'Délai minimal entre la réservation et la prise en charge (BR-006)'),
  ('carrier_accept_hours', '2', 'Délai laissé au transporteur pour accepter une réservation (BR-010)'),
  ('cancellation_policy',
   '{"tiers": [{"min_hours_before": 48, "refund_bps": 10000}, {"min_hours_before": 24, "refund_bps": 5000}, {"min_hours_before": 0, "refund_bps": 0}]}',
   'Remboursement voyageur selon le délai avant la prise en charge (BR-011)'),
  ('statement_suspension_days', '15', 'Jours après échéance d''un relevé impayé avant suspension marketplace (BR-009d)'),
  ('location_retention_days', '90', 'Conservation des positions chauffeur avant purge (BR-202)'),
  ('saas_trial', '{"days": 14, "plan": "v2"}', 'Essai gratuit du SaaS (BR-106)'),
  ('marketplace_open', 'true', 'Interrupteur global de la marketplace (RUNBOOK, incidents)');
