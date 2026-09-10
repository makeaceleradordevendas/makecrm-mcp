import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { calendarRange, timestampMicros, utcTimestamp, microsToUtc } from '../src/tools/date-time.js';
import { prepareRead } from '../src/tools/read-catalog.js';
import { SupabaseUserApi } from '../src/api/supabase.js';
import { readConfig } from '../src/config.js';

const identity = { user_id: randomUUID(), company_id: randomUUID() };
const names = ['get_pipeline_deals_page_v7', 'get_pipeline_deals_totals_v7'] as const;
const sqlShift = 3n * 60n * 60n * 1000000n;
const records = ['2026-09-10T02:59:59.999999Z', '2026-09-10T03:00:00.000000Z',
  '2026-09-10T03:01:51.622572Z', '2026-09-11T02:59:59.999999Z', '2026-09-11T03:00:00.000000Z'];
// Reproduces the supplied SQL's + interval '3 hours', >= start and <= end.
function sqlMatches(body: Record<string, unknown>, record: string): boolean {
  const at = timestampMicros(record);
  const start = body.p_pipeline_deal_created_at_start;
  const end = body.p_pipeline_deal_created_at_end;
  return (typeof start !== 'string' || at >= timestampMicros(start) + sqlShift)
    && (typeof end !== 'string' || at <= timestampMicros(end) + sqlShift);
}

test('regressão: as duas RPCs incluem 00:01:51 de São Paulo sem aplicar duas vezes +3h', () => {
  const start = '2026-09-10T00:00:00-03:00';
  assert.equal(utcTimestamp(start), '2026-09-10T03:00:00Z');
  assert.equal(sqlMatches({ p_pipeline_deal_created_at_start: start }, records[2]!), false);
  for (const name of names) {
    const request = prepareRead(name, { pipeline_deal_created_at_start: start }, identity);
    assert.equal(request.body!.p_pipeline_deal_created_at_start, '2026-09-10T00:00:00.000000Z');
    assert.equal(request.date_filter!.start_utc, '2026-09-10T03:00:00Z');
    assert.equal(sqlMatches(request.body!, records[2]!), true);
    assert.equal(sqlMatches(request.body!, records[0]!), false);
    assert(!Object.hasOwn(request.body!, 'p_pipeline_deal_created_at_end')); // no guessed intent for open-ended ranges
    const equivalent = prepareRead(name, { pipeline_deal_created_at_start: '2026-09-10T03:00:00Z' }, identity);
    assert.deepEqual(equivalent.body, request.body);
  }
});

test('dia completo: início inclusivo, último microssegundo incluído e dia seguinte excluído', () => {
  for (const name of names) {
    const request = prepareRead(name, { created_on: '2026-09-10' }, identity);
    assert.equal(request.body!.p_pipeline_deal_created_at_start, '2026-09-10T00:00:00.000000Z');
    assert.equal(request.body!.p_pipeline_deal_created_at_end, '2026-09-10T23:59:59.999999Z');
    assert(!Object.hasOwn(request.body!, 'p_created_on'));
    assert.deepEqual(records.map(record => sqlMatches(request.body!, record)), [false, true, true, true, false]);
    assert.deepEqual(request.date_filter, { time_zone: 'America/Sao_Paulo', local_date: '2026-09-10', start_utc: '2026-09-10T03:00:00.000Z',
      end_exclusive_utc: '2026-09-11T03:00:00.000Z', end_inclusive_utc: '2026-09-11T02:59:59.999999Z' });
  }
});

test('hoje/ontem usam data local, inclusive perto da meia-noite UTC, mês, ano e bissexto', () => {
  const now = new Date('2026-09-10T02:30:00Z'); // still September 9 in São Paulo
  assert.equal(calendarRange('today', undefined, now).local_date, '2026-09-09');
  assert.equal(calendarRange('yesterday', undefined, now).local_date, '2026-09-08');
  assert.equal(calendarRange('today', undefined, new Date('2026-09-10T03:00:00Z')).local_date, '2026-09-10');
  assert.equal(calendarRange('yesterday', undefined, new Date('2026-01-01T15:00:00Z')).local_date, '2025-12-31');
  assert.equal(calendarRange('yesterday', undefined, new Date('2024-03-01T15:00:00Z')).local_date, '2024-02-29');
  const request = prepareRead(names[1], { created_on: 'today' }, identity, { now });
  assert.equal(request.date_filter!.local_date, '2026-09-09');
  assert.throws(() => calendarRange('2026-02-29'));
  assert.throws(() => calendarRange('2026-04-31'));
});

test('dias locais respeitam horário de verão histórico e não assumem sempre 24 horas', () => {
  const start = calendarRange('2018-11-04'); // midnight skipped in São Paulo
  assert.equal(start.start_utc, '2018-11-04T03:00:00.000Z');
  assert.equal(start.end_exclusive_utc, '2018-11-05T02:00:00.000Z');
  const end = calendarRange('2019-02-16'); // 23:00 repeated in São Paulo
  assert.equal(end.start_utc, '2019-02-16T02:00:00.000Z');
  assert.equal(end.end_exclusive_utc, '2019-02-17T03:00:00.000Z');
  const summer = prepareRead(names[0], { created_on: '2018-01-10' }, identity);
  assert.equal(summer.body!.p_pipeline_deal_created_at_start, '2018-01-09T23:00:00.000000Z');
  assert.equal(timestampMicros(String(summer.body!.p_pipeline_deal_created_at_start)) + sqlShift, timestampMicros('2018-01-10T02:00:00Z'));
  assert.equal(calendarRange('2026-09-10', 'Asia/Kolkata').start_utc, '2026-09-09T18:30:00.000Z');
});

test('instantes preservam microssegundos, fuso positivo e intervalos invertidos são rejeitados', () => {
  assert.equal(utcTimestamp('2026-09-10T00:00:00.622572-03:00'), '2026-09-10T03:00:00.622572Z');
  assert.equal(utcTimestamp('2026-09-10T00:00:00.123456+05:30'), '2026-09-09T18:30:00.123456Z');
  assert.equal(microsToUtc(-1n), '1969-12-31T23:59:59.999999Z');
  for (const name of names) {
    assert.throws(() => prepareRead(name, { created_on: 'today', pipeline_deal_created_at_start: '2026-09-10T03:00:00Z' }, identity));
    assert.throws(() => prepareRead(name, { created_on: 'yesterday', pipeline_deal_created_at_end: '2026-09-10T03:00:00Z' }, identity));
    assert.throws(() => prepareRead(name, { pipeline_deal_created_at_start: '2026-09-10T03:00:00.000002Z', pipeline_deal_created_at_end: '2026-09-10T03:00:00.000001Z' }, identity));
    assert.throws(() => prepareRead(name, { pipeline_deal_created_at_start: '2026-09-10T00:00:00' }, identity));
    assert.throws(() => prepareRead(name, { pipeline_deal_created_at_start: '2026-09-10T00:00:00.1234567Z' }, identity));
    const request = prepareRead(name, { pipeline_deal_created_at_end: '2026-09-10T23:59:59.999999-03:00' }, identity);
    assert.equal(request.body!.p_pipeline_deal_created_at_end, '2026-09-10T23:59:59.999999Z');
  }
});

test('compatibilidade +3h é configurável, restrita às RPCs de pipeline e independente do fuso', () => {
  const adjusted = prepareRead(names[1], { created_on: '2026-09-10' }, identity, { timeZone: 'UTC', pipelineRpcDateShiftMinutes: 0 });
  assert.equal(adjusted.body!.p_pipeline_deal_created_at_start, '2026-09-10T00:00:00.000000Z');
  const modern = prepareRead(names[0], { created_on: '2026-09-10' }, identity, { pipelineRpcDateShiftMinutes: 0 });
  assert.equal(modern.body!.p_pipeline_deal_created_at_start, '2026-09-10T03:00:00.000000Z');
  const context = prepareRead('get_contact_full_context_v2', { identifiers: ['test@example.test'] }, identity);
  assert(!context.date_filter); assert(!Object.hasOwn(context.body!, 'p_pipeline_deal_created_at_start'));
  const env = { NODE_ENV: 'test', AUTH_MODE: 'personal_token', PUBLIC_URL: 'https://mcp.test', SAAS_API_URL: 'https://api.test',
    SAAS_API_KEY: 's'.repeat(32), REDIS_URL: 'redis://localhost', ALLOWED_HOSTS: 'mcp.test' };
  assert.equal(readConfig(env).MCP_TIME_ZONE, 'America/Sao_Paulo');
  assert.equal(readConfig(env).PIPELINE_RPC_DATE_SHIFT_MINUTES, 180);
  assert.equal(readConfig({ ...env, PIPELINE_RPC_DATE_SHIFT_MINUTES: '0' }).PIPELINE_RPC_DATE_SHIFT_MINUTES, 0);
  assert.throws(() => readConfig({ ...env, MCP_TIME_ZONE: 'Invalid/Zone' }));
});

test('integração HTTP do adaptador: lista e total usam os mesmos limites e expõem o intervalo efetivo', async t => {
  const api = new SupabaseUserApi({ url: 'https://supabase.test', publishableKey: 'sb_publishable_test', timeoutMs: 1000, maxResponseBytes: 10000 });
  t.mock.method(globalThis, 'fetch', async (url: URL, init: RequestInit) => {
    assert.equal(new Headers(init.headers).get('authorization'), 'Bearer individual-user-jwt');
    const body = JSON.parse(String(init.body)); assert(!body.p_created_on);
    const found = records.filter(record => sqlMatches(body, record));
    return Response.json(url.pathname.endsWith('get_pipeline_deals_page_v7') ? { data: found.map(deal_created_at => ({ deal_created_at })), has_more: false } : { total: found.length });
  });
  const page = await api.executeRead('individual-user-jwt', identity, names[0], { created_on: '2026-09-10' });
  const totals = await api.executeRead('individual-user-jwt', identity, names[1], { created_on: '2026-09-10' });
  assert.equal((page.data as unknown[]).length, 3);
  assert.deepEqual(totals.data, { total: 3 });
  assert.deepEqual(page.date_filter, totals.date_filter);
});
