-- Fix: on insert, columns that stay empty were recorded as changed (missing key vs JSON null).
-- JSON null and a missing key are now treated the same way.
create or replace function private.audit_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  v_new jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  v_before jsonb := '{}'::jsonb;
  v_after jsonb := '{}'::jsonb;
  v_column text;
  v_row jsonb := case when tg_op = 'DELETE' then v_old else v_new end;
begin
  for i in 1 .. tg_nargs - 1 loop
    v_column := tg_argv[i];
    if nullif(v_old -> v_column, 'null'::jsonb) is distinct from nullif(v_new -> v_column, 'null'::jsonb) then
      v_before := v_before || jsonb_build_object(v_column, v_old -> v_column);
      v_after := v_after || jsonb_build_object(v_column, v_new -> v_column);
    end if;
  end loop;

  if v_after = '{}'::jsonb and v_before = '{}'::jsonb then
    return coalesce(new, old);
  end if;

  insert into public.audit_logs (actor_id, company_id, action, entity_type, entity_id, before, after)
  values (
    auth.uid(),
    coalesce((v_row ->> 'company_id')::uuid, case when tg_table_name = 'companies' then (v_row ->> 'id')::uuid end),
    tg_argv[0] || '.' || lower(tg_op),
    tg_table_name,
    coalesce(v_row ->> 'id', v_row ->> 'company_id') || coalesce(':' || (v_row ->> 'user_id'), ''),
    nullif(v_before, '{}'::jsonb),
    nullif(v_after, '{}'::jsonb)
  );
  return coalesce(new, old);
end;
$$;
