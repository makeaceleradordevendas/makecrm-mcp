-- Somente novas funções de leitura. Não altera tabelas, grants de tabelas ou RLS existentes.
-- Aplicar primeiro em homologação. SECURITY INVOKER mantém a identidade e RLS do usuário.
begin;

create function public.mcp_identity()
returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
declare v_identity jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select jsonb_build_object('user_id', u.id, 'company_id', u.company_id)
    into v_identity
    from public.users u join public.companys c on c.id = u.company_id
    where u.id = auth.uid() and u.status is true and c.status is true;
  if v_identity is null then
    raise exception 'Active membership required' using errcode = '42501';
  end if;
  return v_identity;
end;
$$;

create function public.mcp_read_page(
  p_collection text,
  p_company_id uuid,
  p_query text default '',
  p_limit integer default 25,
  p_after_created_at timestamptz default null,
  p_after_id uuid default null
)
returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
declare
  v_company uuid;
  v_pattern text;
  v_rows jsonb;
  v_items jsonb;
  v_last jsonb;
begin
  v_company := (public.mcp_identity()->>'company_id')::uuid;
  if p_company_id is distinct from v_company then
    raise exception 'Company mismatch' using errcode = '42501';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100
     or p_query is null or length(p_query) > 200
     or ((p_after_created_at is null) <> (p_after_id is null)) then
    raise exception 'Invalid pagination' using errcode = '22023';
  end if;
  -- Busca textual literal; %, _ e \ não se tornam curingas fornecidos pelo cliente.
  v_pattern := '%' || replace(replace(replace(p_query, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%';

  if p_collection = 'contacts' then
    select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc, r.id desc), '[]'::jsonb)
      into v_rows from (
        select c.id, c.name, c.emails, c.phones, c.created_at
        from public.contacts c
        where c.company_id = v_company
          and (p_query = '' or c.name ilike v_pattern escape E'\\')
          and (p_after_id is null or (c.created_at, c.id) < (p_after_created_at, p_after_id))
        order by c.created_at desc, c.id desc limit p_limit + 1
      ) r;
  elsif p_collection = 'opportunities' then
    select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc, r.id desc), '[]'::jsonb)
      into v_rows from (
        select d.id, d.name, d.value, d.status, d.currency, d.pipeline_id,
          d.stage_id, d.contact_id, d.user_id, d.sdr_id, d.closer_id, d.created_at, d.updated_at
        from public.pipeline_deals d
        join public.pipelines p on p.id = d.pipeline_id and p.company_id = v_company
        where d.company_id = v_company
          and (p_query = '' or d.name ilike v_pattern escape E'\\')
          and (p_after_id is null or (d.created_at, d.id) < (p_after_created_at, p_after_id))
        order by d.created_at desc, d.id desc limit p_limit + 1
      ) r;
  elsif p_collection = 'conversations' then
    select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc, r.id desc), '[]'::jsonb)
      into v_rows from (
        select c.id, c.name, c.identifier, c.inbox_id, i.name as inbox_name,
          c.user_id, c.sdr_id, c.closer_id, c.created_at, c.last_inbound_at, c.last_outbound_at
        from public.inbox_conversations c
        join public.inboxes i on i.id = c.inbox_id and i.company_id = v_company
        where (p_query = '' or c.name ilike v_pattern escape E'\\' or c.identifier ilike v_pattern escape E'\\')
          and (p_after_id is null or (c.created_at, c.id) < (p_after_created_at, p_after_id))
        order by c.created_at desc, c.id desc limit p_limit + 1
      ) r;
  else
    raise exception 'Unknown collection' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(value order by ordinal), '[]'::jsonb)
    into v_items from jsonb_array_elements(v_rows) with ordinality as e(value, ordinal)
    where ordinal <= p_limit;
  v_last := v_items -> (jsonb_array_length(v_items) - 1);
  return jsonb_build_object('items', v_items, 'next_position',
    case when jsonb_array_length(v_rows) > p_limit
      then jsonb_build_object('id', v_last->>'id', 'created_at', v_last->>'created_at')
      else null end);
end;
$$;

revoke all on function public.mcp_identity() from public, anon, service_role;
revoke all on function public.mcp_read_page(text, uuid, text, integer, timestamptz, uuid) from public, anon, service_role;
grant execute on function public.mcp_identity() to authenticated;
grant execute on function public.mcp_read_page(text, uuid, text, integer, timestamptz, uuid) to authenticated;

comment on function public.mcp_identity() is 'Resolve o vínculo ativo com auth.uid(), preservando RLS (SECURITY INVOKER).';
comment on function public.mcp_read_page(text, uuid, text, integer, timestamptz, uuid)
  is 'Consultas MCP paginadas e com colunas explícitas; executa com RLS do usuário autenticado.';

notify pgrst, 'reload schema';
commit;
