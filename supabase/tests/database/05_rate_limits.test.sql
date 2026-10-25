-- Rate limiting: fixed window counting, server-only access.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

select ok(public.consume_rate_limit('test:login', 2, 60), 'first hit is allowed');
select ok(public.consume_rate_limit('test:login', 2, 60), 'second hit is allowed');
select ok(not public.consume_rate_limit('test:login', 2, 60), 'third hit in the window is refused');
select ok(public.consume_rate_limit('test:other', 2, 60), 'keys are counted separately');

select ok(
  not has_function_privilege('authenticated', 'public.consume_rate_limit(text, integer, integer)', 'execute')
    and not has_function_privilege('anon', 'public.consume_rate_limit(text, integer, integer)', 'execute'),
  'only the server can consume rate limits'
);

select * from finish();
rollback;
