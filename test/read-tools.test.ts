import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { prepareRead, readToolNames, type ReadToolName } from '../src/tools/read-catalog.js';
import { SupabaseUserApi } from '../src/api/supabase.js';
import { AccessDenied, DependencyUnavailable } from '../src/contracts.js';

const identity = { user_id: randomUUID(), company_id: randomUUID() };
const options = { url: 'https://supabase.test', publishableKey: 'sb_publishable_test', timeoutMs: 1000, maxResponseBytes: 10000 };
test('tools migradas: destinos fixos, identidade fora dos argumentos e filtros limitados', () => {
  for (const name of readToolNames) {
    const input = name === 'get_contact_full_context_v2' ? { identifiers: ['contato@example.test'] } : {};
    for (const injected of [{ company_id: randomUUID() }, { user_id: randomUUID() }, { access_token: 'forged' }, { rpc: 'delete_all' }]) {
      assert.throws(() => prepareRead(name, { ...input, ...injected }, identity));
    }
    const request = prepareRead(name, input, identity);
    assert(request.path.startsWith('/rest/v1/'));
  }
  assert.throws(() => prepareRead('toString' as ReadToolName, {}, identity));
  assert.throws(() => prepareRead('list_users', { limit: 101 }, identity));
  assert.throws(() => prepareRead('list_users', { order_by: 'name.desc&company_id=eq.other' }, identity));
  assert.throws(() => prepareRead('list_products', { offset: 10001 }, identity));
  assert.throws(() => prepareRead('get_pipeline_deals_page_v7', { pipeline_id: Array(101).fill(randomUUID()) }, identity));
  assert.throws(() => prepareRead('get_contact_full_context_v2', { identifiers: [] }, identity));
  assert.throws(() => prepareRead('get_pipeline_deals_page_v7', { pipeline_deal_value_min: 20, pipeline_deal_value_max: 10 }, identity));
  assert.throws(() => prepareRead('get_pipeline_deals_totals_v7', { pipeline_deal_created_at_start: '2026-09-10T00:00:00Z', pipeline_deal_created_at_end: '2026-09-09T00:00:00Z' }, identity));
});

test('RPCs: mapeia filtros antigos e não mistura identidade autenticada com responsável', () => {
  const owner = randomUUID(); const pipeline = randomUUID();
  const input = { pipeline_id: [pipeline], pipeline_deal_user_id: [owner], pipeline_deal_value_min: 0,
    pipeline_deal_utm_source: ['google'], name: 'Maria', sort_by: 'created_at', sort_order: 'asc', limit: 10, page: 2 };
  const page = prepareRead('get_pipeline_deals_page_v7', input, identity);
  assert.deepEqual(page.body, { p_pipeline_id: [pipeline], p_pipeline_deal_user_id: [owner], p_pipeline_deal_value_min: 0,
    p_pipeline_deal_utm_source: ['google'], p_name: 'Maria', p_sort_by: 'created_at', p_sort_order: 'asc', p_limit: 10, p_page: 2 });
  assert(!Object.hasOwn(page.body!, 'p_company_id'));
  const { limit: _limit, page: _page, ...totalsInput } = input;
  const totals = prepareRead('get_pipeline_deals_totals_v7', totalsInput, identity);
  assert(!Object.hasOwn(totals.body!, 'p_page')); assert(!Object.hasOwn(totals.body!, 'p_limit'));
  const context = prepareRead('get_contact_full_context_v2', { identifiers: ['x@example.test'] }, identity);
  assert.deepEqual(context.body, { p_identifiers: ['x@example.test'], p_company_id: identity.company_id, p_user_id: identity.user_id });
});

test('REST: usa JWT individual, projeta colunas e pagina cadastros sem depender de UUID/data', async t => {
  const api = new SupabaseUserApi(options);
  const requests: URL[] = [];
  t.mock.method(globalThis, 'fetch', async (input: URL, init: RequestInit) => {
    const url = new URL(input); requests.push(url);
    const headers = new Headers(init.headers);
    assert.equal(headers.get('authorization'), 'Bearer private-user-jwt');
    assert.equal(headers.get('apikey'), options.publishableKey);
    assert.equal(init.method, 'GET'); assert.equal(init.body, undefined); assert.equal(init.redirect, 'error');
    assert.equal(url.searchParams.get('company_id'), `eq.${identity.company_id}`);
    assert.equal(url.searchParams.get('limit'), '3');
    assert.equal(url.searchParams.get('offset'), '2');
    assert.equal(url.searchParams.get('status'), 'eq.false');
    return Response.json(Array.from({ length: 3 }, (_, i) => ({ id: i + 1, name: 'Registro', company_id: identity.company_id })));
  });
  for (const name of ['list_users', 'list_pipelines', 'list_products', 'list_sources', 'list_campaigns'] as const) {
    const result = await api.executeRead('private-user-jwt', identity, name, { limit: 2, offset: 2, status_filter: false });
    assert.equal((result.items as unknown[]).length, 2); assert.equal(result.next_offset, 4);
    assert.equal(result.pagination_limit_reached, false);
  }
  assert.deepEqual(requests.map(r => r.pathname), ['/rest/v1/users', '/rest/v1/pipelines', '/rest/v1/products', '/rest/v1/sources', '/rest/v1/campaigns']);
  assert(requests.every(r => !r.searchParams.get('select')!.includes('*')));
});

test('REST/RPC: rejeita empresa divergente, respostas inválidas/grandes e erros sem expor conteúdo', async t => {
  const api = new SupabaseUserApi(options);
  let response = () => Response.json([{ company_id: randomUUID() }]);
  const mock = t.mock.method(globalThis, 'fetch', async () => response());
  await assert.rejects(api.executeRead('user', identity, 'list_users', {}), DependencyUnavailable);
  response = () => Response.json({ data: 'invalid' });
  await assert.rejects(api.executeRead('user', identity, 'get_pipeline_deals_page_v7', {}), DependencyUnavailable);
  response = () => Response.json({ data: [{ id: 'a' }, { id: 'b' }] });
  await assert.rejects(api.executeRead('user', identity, 'get_pipeline_deals_page_v7', { limit: 1 }), DependencyUnavailable);
  response = () => Response.json({ private: 'x'.repeat(11000) });
  await assert.rejects(api.executeRead('user', identity, 'get_pipeline_deals_totals_v7', {}), DependencyUnavailable);
  response = () => new Response('secret internal error', { status: 403 });
  await assert.rejects(api.executeRead('user', identity, 'list_users', {}), AccessDenied);
  response = () => new Response('secret internal error', { status: 500 });
  await assert.rejects(api.executeRead('user', identity, 'list_users', {}), error => error instanceof DependencyUnavailable && !error.message.includes('secret'));
  const before = mock.mock.callCount();
  await assert.rejects(api.executeRead('user', identity, 'list_users', { company_id: randomUUID() }));
  assert.equal(mock.mock.callCount(), before);
});

test('RPC: faz POST com contrato existente, respeita cancelamento e preserva resultados', async t => {
  const api = new SupabaseUserApi(options);
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async (input: URL, init: RequestInit) => {
    assert.equal(init.method, 'POST'); assert.equal(new Headers(init.headers).get('authorization'), 'Bearer individual');
    const args = JSON.parse(String(init.body));
    if (new URL(input).pathname.endsWith('get_contact_full_context_v2')) {
      assert.equal(args.p_user_id, identity.user_id); assert.equal(args.p_company_id, identity.company_id);
      return Response.json({ contact: { name: 'Contato' }, deals: [] });
    }
    assert(init.signal);
    controller.abort(); assert.equal(init.signal.aborted, true);
    init.signal.throwIfAborted();
    throw new Error('unreachable');
  });
  const result = await api.executeRead('individual', identity, 'get_contact_full_context_v2', { identifiers: ['x@example.test'] });
  assert.deepEqual(result, { data: { contact: { name: 'Contato' }, deals: [] } });
  await assert.rejects(api.executeRead('individual', identity, 'get_pipeline_deals_totals_v7', {}, controller.signal), DependencyUnavailable);
});
