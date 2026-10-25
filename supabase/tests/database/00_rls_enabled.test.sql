-- Structural guarantees: no table without RLS, no table without policy (CLAUDE.md rule 8).
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

select is(
  (select array_agg(c.relname::text order by c.relname)
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  null,
  'every public table has row level security enabled'
);

select is(
  (select array_agg(c.relname::text order by c.relname)
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
     and not exists (
       select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname
     )),
  null,
  'every public table has at least one policy'
);

select ok(
  not has_function_privilege('anon', 'public.create_company(text, text, uuid)', 'execute'),
  'anonymous users cannot create companies'
);

select * from finish();
rollback;
