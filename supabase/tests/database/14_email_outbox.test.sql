-- E-mail outbox: written and read by the server (service role) only.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email) values ('a0000000-0000-0000-0000-000000000001', 'user@test.local');
insert into public.email_outbox (to_email, template, payload) values ('traveler@test.local', 'booking_received', '{}');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select throws_ok($$ select count(*) from public.email_outbox $$, '42501', null,
  'a signed-in user cannot read the outbox');
select throws_ok($$ insert into public.email_outbox (to_email, template) values ('x@test.local', 'booking_received') $$,
  '42501', null, 'a signed-in user cannot queue e-mails');

reset role;
set local role anon;
select throws_ok($$ select count(*) from public.email_outbox $$, '42501', null,
  'an anonymous user cannot read the outbox');

reset role;
set local role service_role;
select is((select count(*) from public.email_outbox where to_email = 'traveler@test.local'), 1::bigint,
  'the server reads the outbox');

select * from finish();
rollback;
