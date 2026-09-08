import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import { test } from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createApp } from '../src/app.js';
import { readConfig } from '../src/config.js';
import type { Principal, RateLimiter, SaasGateway } from '../src/contracts.js';

export function testConfig() {
  return readConfig({ NODE_ENV: 'test', PUBLIC_URL: 'http://localhost:3000', OAUTH_ISSUER: 'https://auth.test',
    SAAS_API_URL: 'https://api.test/mcp/', SAAS_API_KEY: 's'.repeat(32), REDIS_URL: 'redis://localhost:6379',
    ALLOWED_HOSTS: 'localhost:3000', ALLOWED_ORIGINS: 'https://app.test' });
}
function principal(company = randomUUID()): Principal {
  return { active: true, credential_id: randomUUID(), user_id: randomUUID(), company_id: company,
    scopes: ['contacts:read', 'opportunities:read', 'conversations:read'], resource: 'http://localhost:3000/mcp',
    expires_at: Math.floor(Date.now() / 1000) + 600 };
}
class MemoryLimiter implements RateLimiter {
  counts = new Map<string, number>();
  async consume(key: string, limit: number) {
    const value = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, value);
    return { allowed: value <= limit, retryAfter: 60 };
  }
  async ready() { return true; }
}
async function setup(overrides: { gateway?: SaasGateway; limiter?: RateLimiter; userLimit?: number; companyLimit?: number; personalToken?: boolean } = {}) {
  const a = principal();
  const b = principal();
  const identities = new Map<string, Principal>([['token-a', a], ['token-b', b]]);
  const reads: { user: string; company: string }[] = [];
  const gateway: SaasGateway = overrides.gateway ?? {
    async authenticate(token) { return identities.get(token) ?? null; },
    async read(_collection, identity) {
      reads.push({ user: identity.user_id, company: identity.company_id });
      await new Promise(resolve => setTimeout(resolve, 2));
      return { items: [{ company: identity.company_id }], next_cursor: null };
    },
  };
  const config = testConfig();
  if (overrides.personalToken) { config.AUTH_MODE = 'personal_token'; config.OAUTH_ISSUER = undefined; }
  if (overrides.userLimit) config.USER_REQUESTS_PER_MINUTE = overrides.userLimit;
  if (overrides.companyLimit) config.COMPANY_REQUESTS_PER_MINUTE = overrides.companyLimit;
  const audits: unknown[] = [];
  const app = createApp(config, { gateway, limiter: overrides.limiter ?? new MemoryLimiter() }, event => audits.push(event));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert(address && typeof address !== 'string');
  config.allowedHosts.push(`127.0.0.1:${address.port}`);
  const url = `http://127.0.0.1:${address.port}`;
  const post = (body: unknown, token = 'token-a', headers: Record<string, string> = {}) => fetch(`${url}/mcp`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...headers },
    body: JSON.stringify(body),
  });
  return { a, b, identities, reads, audits, config, url, post, close: async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); } };
}
const list = { jsonrpc: '2.0', id: 1, method: 'tools/list' };
const call = (args: unknown = {}) => ({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'search_contacts', arguments: args } });

test('token manual exige autenticação, limita acesso e não anuncia OAuth', async t => {
  const s = await setup({ personalToken: true }); t.after(s.close);
  for (const path of ['/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/mcp']) {
    assert.equal((await fetch(`${s.url}${path}`)).status, 404);
  }
  const missing = await fetch(`${s.url}/mcp`, { method: 'POST' });
  assert.equal(missing.status, 401);
  assert.equal(missing.headers.get('www-authenticate'), 'Bearer realm="MakeCRM MCP"');
  assert.equal((await s.post(list, 'invalid')).status, 401);
  const client = new Client({ name: 'manual-token-test', version: '1.0.0' });
  t.after(() => client.close());
  await client.connect(new StreamableHTTPClientTransport(new URL(`${s.url}/mcp`), {
    requestInit: { headers: { authorization: 'Bearer token-a' } },
  }));
  const tools = await client.listTools();
  assert.equal(tools.tools.length, 3);
  assert(tools.tools.every(tool => tool.annotations?.readOnlyHint && !tool._meta?.securitySchemes));
  assert.equal((await client.callTool({ name: 'search_contacts', arguments: {} })).isError, undefined);
  s.identities.set('token-a', { ...s.a, scopes: ['opportunities:read'] });
  assert.equal((await client.callTool({ name: 'search_contacts', arguments: {} })).isError, true);
  s.identities.delete('token-a');
  assert.equal((await s.post(list)).status, 401);
});

test('modo manual permite produção sem issuer; modo OAuth continua exigindo issuer', () => {
  const env = { NODE_ENV: 'production', PUBLIC_URL: 'https://mcp.test',
    SAAS_API_KEY: 's'.repeat(32), REDIS_URL: 'rediss://redis.test:6379', ALLOWED_HOSTS: 'mcp.test',
    SUPABASE_URL: 'https://project.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_only',
    SESSION_ENCRYPTION_KEY: 'a'.repeat(64), MCP_CURSOR_SECRET: 'c'.repeat(32) };
  assert.equal(readConfig({ ...env, AUTH_MODE: 'personal_token' }).OAUTH_ISSUER, undefined);
  assert.throws(() => readConfig(env), /OAUTH_ISSUER/);
  assert.throws(() => readConfig({ ...env, AUTH_MODE: 'none' }), /AUTH_MODE/);
  assert.throws(() => readConfig({ ...env, AUTH_MODE: 'personal_token', REDIS_URL: undefined }), /REDIS_URL/);
});

test('página inicial informa o endpoint sem declarar prontidão da integração', async t => {
  const s = await setup(); t.after(s.close);
  const response = await fetch(s.url);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.endpoint, '/mcp');
  assert.equal(body.readiness, '/readyz');
  assert.equal(body.status, undefined);
  assert.equal((await fetch(`${s.url}/mcp`, { method: 'POST' })).status, 401);
});

test('cliente oficial: initialize, list e consulta sem estado de sessão', async t => {
  const s = await setup(); t.after(s.close);
  const client = new Client({ name: 'integration-test', version: '1.0.0' });
  t.after(() => client.close());
  await client.connect(new StreamableHTTPClientTransport(new URL(`${s.url}/mcp`), { requestInit: { headers: { authorization: 'Bearer token-a' } } }));
  const tools = await client.listTools();
  assert.equal(tools.tools.length, 3);
  assert(tools.tools.every(tool => tool.annotations?.readOnlyHint === true));
  assert(tools.tools.every(tool => !('company_id' in (tool.inputSchema.properties ?? {}))));
  const result = await client.callTool({ name: 'search_contacts', arguments: { limit: 10 } });
  assert.equal(result.isError, undefined);
  assert.deepEqual(result.structuredContent, { items: [{ company: s.a.company_id }], next_cursor: null });
});

test('requisições concorrentes não compartilham identidade ou empresa', async t => {
  const s = await setup(); t.after(s.close);
  const results = await Promise.all(Array.from({ length: 40 }, async (_, i) => {
    const token = i % 2 ? 'token-a' : 'token-b';
    const response = await s.post(call(), token);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.result.structuredContent.items[0].company, i % 2 ? s.a.company_id : s.b.company_id);
  }));
  assert.equal(results.length, 40);
});

test('IDs de identidade injetados e limites inválidos não chegam à API', async t => {
  const s = await setup(); t.after(s.close);
  for (const args of [{ company_id: s.b.company_id }, { user_id: s.b.user_id }, { limit: 101 }, { query: 'x'.repeat(201) }]) {
    const response = await s.post(call(args));
    const body = await response.json();
    assert(body.error || body.result?.isError);
  }
  assert.equal(s.reads.length, 0);
});

test('credencial ausente, inválida, expirada, audiência incorreta e revogação', async t => {
  const s = await setup(); t.after(s.close);
  const missing = await fetch(`${s.url}/mcp`, { method: 'POST' });
  assert.equal(missing.status, 401);
  assert.match(missing.headers.get('www-authenticate')!, /resource_metadata/);
  const invalid = await s.post(list, 'invalid'); assert.equal(invalid.status, 401);
  s.identities.set('expired', { ...s.a, expires_at: 1 });
  s.identities.set('wrong-audience', { ...s.a, resource: 'https://another.test/mcp' });
  assert.equal((await s.post(list, 'expired')).status, 401);
  assert.equal((await s.post(list, 'wrong-audience')).status, 401);
  assert.equal((await s.post(list)).status, 200);
  s.identities.delete('token-a');
  assert.equal((await s.post(list)).status, 401);
});

test('permissão ausente impede consulta e sinaliza OAuth', async t => {
  const s = await setup(); t.after(s.close);
  s.identities.set('token-a', { ...s.a, scopes: ['opportunities:read'] });
  const response = await s.post(call());
  const body = await response.json();
  assert.equal(body.result.isError, true);
  assert.match(body.result._meta['mcp/www_authenticate'][0], /insufficient_scope/);
  assert.equal(s.reads.length, 0);
});

test('limite por usuário devolve 429 sem bloquear outro usuário', async t => {
  const s = await setup({ userLimit: 1 }); t.after(s.close);
  assert.equal((await s.post(list)).status, 200);
  const blocked = await s.post(list);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get('retry-after'), '60');
  assert.equal((await s.post(list, 'token-b')).status, 200);
});

test('limite por empresa agrega usuários diferentes', async t => {
  const s = await setup({ companyLimit: 1 }); t.after(s.close);
  s.identities.set('token-b', { ...s.b, company_id: s.a.company_id });
  assert.equal((await s.post(list)).status, 200);
  assert.equal((await s.post(list, 'token-b')).status, 429);
});

test('falha no Redis bloqueia acesso, sem fallback que contorne limites', async t => {
  const s = await setup({ limiter: { async consume() { throw new Error('redis-password'); }, async ready() { return false; } } }); t.after(s.close);
  const response = await s.post(list);
  assert.equal(response.status, 503);
  assert(!JSON.stringify(await response.json()).includes('redis-password'));
  assert.equal((await fetch(`${s.url}/readyz`)).status, 503);
});

test('falha no serviço de autenticação não vira autenticação válida', async t => {
  const s = await setup({ gateway: { async authenticate() { throw new Error('secret'); }, async read() { throw new Error('must not run'); } } }); t.after(s.close);
  const response = await s.post(list);
  assert.equal(response.status, 503);
  assert(!JSON.stringify(await response.json()).includes('secret'));
});

test('Origin/Host inválidos e token em URL são recusados', async t => {
  const s = await setup(); t.after(s.close);
  assert.equal((await s.post(list, 'token-a', { origin: 'https://evil.test' })).status, 403);
  const invalidHost = await new Promise<number | undefined>((resolve, reject) => {
    const req = httpRequest(`${s.url}/mcp`, { headers: { host: 'evil.test' } }, res => { res.resume(); resolve(res.statusCode); });
    req.on('error', reject); req.end();
  });
  assert.equal(invalidHost, 403);
  assert.equal((await fetch(`${s.url}/mcp?token=secret`)).status, 400);
  assert.equal((await s.post(list, 'token-a', { origin: 'https://app.test' })).headers.get('access-control-allow-origin'), 'https://app.test');
});

test('descoberta OAuth, métodos, JSON inválido e corpo excessivo', async t => {
  const s = await setup(); t.after(s.close);
  const metadata = await (await fetch(`${s.url}/.well-known/oauth-protected-resource/mcp`)).json();
  assert.equal(metadata.resource, s.config.resource);
  assert.equal((await fetch(`${s.url}/mcp`, { headers: { authorization: 'Bearer token-a' } })).status, 405);
  assert.equal((await fetch(`${s.url}/mcp`, { method: 'POST', headers: { authorization: 'Bearer token-a', 'content-type': 'application/json' }, body: '{' })).status, 400);
  assert.equal((await s.post({ oversized: 'x'.repeat(40000) })).status, 413);
});

test('logs não contêm tokens, argumentos ou resultados de consultas', async t => {
  const s = await setup(); t.after(s.close);
  await s.post(call({ query: 'private-contact-name' }));
  const audit = JSON.stringify(s.audits);
  for (const secret of ['token-a', 'private-contact-name', s.a.company_id, s.a.user_id]) assert(!audit.includes(secret));
});
