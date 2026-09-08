-- Asserções executadas com papel authenticated, nunca com o dono das tabelas.
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
do $$
declare
  a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  first_page jsonb; second_page jsonb; result jsonb;
begin
  assert public.mcp_identity()->>'user_id' = auth.uid()::text, 'identidade deve vir de auth.uid';
  first_page := public.mcp_read_page('contacts', a, '', 1);
  assert jsonb_array_length(first_page->'items') = 1, 'página limitada';
  assert first_page->'items'->0->>'id' = '10000000-0000-4000-8000-000000000002', 'desempate UUID descendente';
  second_page := public.mcp_read_page('contacts', a, '', 1,
    (first_page->'next_position'->>'created_at')::timestamptz, (first_page->'next_position'->>'id')::uuid);
  assert second_page->'items'->0->>'id' = '10000000-0000-4000-8000-000000000001', 'sem repetição ou perda de microssegundos';
  assert second_page->'next_position' = 'null'::jsonb, 'fim da paginação';
  result := public.mcp_read_page('contacts', a, '%', 25);
  assert jsonb_array_length(result->'items') = 1, 'busca % deve ser literal';
  result := public.mcp_read_page('contacts', a, $query$'; delete from contacts; --$query$, 25);
  assert jsonb_array_length(result->'items') = 0, 'texto não pode virar SQL';
  result := public.mcp_read_page('opportunities', a);
  assert jsonb_array_length(result->'items') = 1, 'respeitar RLS por responsável e excluir funil de outra empresa';
  result := public.mcp_read_page('conversations', a);
  assert jsonb_array_length(result->'items') = 1, 'respeitar RLS por responsável da conversa';
  assert not (result->'items'->0 ? 'last_message_content'), 'não expor mensagem privada no resumo';
  assert not (result->'items'->0 ? 'external_ids'), 'não expor metadados internos';
  begin
    perform public.mcp_read_page('contacts', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    raise exception 'ERRO: empresa forjada aceita';
  exception when insufficient_privilege then null; end;
  begin
    perform public.mcp_read_page('contacts', a, '', 101);
    raise exception 'ERRO: limite excessivo aceito';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.mcp_read_page('contacts', a, '', 25, now(), null);
    raise exception 'ERRO: cursor incompleto aceito';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.mcp_read_page('users', a);
    raise exception 'ERRO: coleção arbitrária aceita';
  exception when invalid_parameter_value then null; end;
end $$;

-- A mesma query sob outro usuário deve assumir a RLS deste usuário.
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
do $$ begin
  assert public.mcp_read_page('opportunities', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')->'items'->0->>'name' = 'Outro responsável', 'RLS do segundo usuário';
end $$;
set request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';
do $$ begin
  begin perform public.mcp_identity(); raise exception 'ERRO: usuário suspenso aceito';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
-- Mesmo com uma política ampla, o JOIN de empresa permanece como defesa adicional.
create policy legacy_wide_read on public.inbox_conversations for select to authenticated using (true);
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
do $$ declare result jsonb; begin
  result := public.mcp_read_page('conversations', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  assert jsonb_array_length(result->'items') = 2, 'RLS ampla continua limitada à empresa pelo JOIN';
  assert not result::text like '%Conversa B%', 'nunca retornar outra empresa';
end $$;
reset role;
do $$ begin
  assert not has_function_privilege('anon', 'public.mcp_identity()', 'execute'), 'anon bloqueado';
  assert not has_function_privilege('service_role', 'public.mcp_identity()', 'execute'), 'service_role sem grant';
  assert not exists(select 1 from pg_proc where oid in ('public.mcp_identity()'::regprocedure,
    'public.mcp_read_page(text,uuid,text,integer,timestamptz,uuid)'::regprocedure) and prosecdef), 'nunca SECURITY DEFINER';
end $$;
select 'PASS: RLS, isolamento, autorização, paginação e projeção de dados' as result;
