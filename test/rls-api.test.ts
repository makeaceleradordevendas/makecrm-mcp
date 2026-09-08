import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { createApp } from '../src/create-app.js';
import { readConfig } from '../src/config.js';
import { scopes, type Principal } from '../src/contracts.js';
import { hashPersonalToken } from '../src/tokens.js';
import { CursorCodec, InvalidCursor } from '../src/api/cursor.js';
import { RlsSaasGateway } from '../src/api/rls-gateway.js';
import { createApiRouter } from '../src/api/router.js';
import { SessionCipher, type SessionStore, type UserSession } from '../src/api/sessions.js';
import { SupabaseUserApi } from '../src/api/supabase.js';

const userA = randomUUID(); const userB = randomUUID();
const companyA = randomUUID(); const companyB = randomUUID();
const expiration = Math.floor(Date.now() / 1000) + 600;
const jwt = (sub: string, extra = {}) => `e30.${Buffer.from(JSON.stringify({ sub, exp: expiration, role: 'authenticated', ...extra })).toString('base64url')}.mock-signature`;
const jwtA = jwt(userA); const jwtB = jwt(userB);

class MemorySessions implements SessionStore {
  records = new Map<string, UserSession>();
  async save(record: UserSession) { this.records.set(record.principal.credential_id, structuredClone(record)); }
  async byId(id: string) { return this.records.get(id) ?? null; }
  async byToken(token: string) {
    try { const hash = hashPersonalToken(token); return [...this.records.values()].find(record => record.token_hash === hash) ?? null; }
    catch { return null; }
  }
  async list(userId: string) { return [...this.records.values()].filter(record => record.principal.user_id === userId); }
  async revoke(id: string, userId: string) { if (this.records.get(id)?.principal.user_id === userId) this.records.delete(id); }
}

test('cursores: assinatura, identidade, empresa, coleção, busca, expiração e microssegundos', () => {
  let now = Date.now();
  const codec = new CursorCodec('s'.repeat(32), () => now);
  const principal: Principal = { active: true, credential_id: randomUUID(), user_id: userA, company_id: companyA,
    scopes: [...scopes], resource: 'https://mcp.test/mcp', expires_at: Math.floor(now / 1000) + 3600 };
  const position = { id: randomUUID(), created_at: '2026-09-08T12:00:00.123456+00:00' };
  const query = { limit: 25, query: 'Maria' };
  const cursor = codec.encode(position, 'contacts', principal, query);
  assert(cursor.length <= 512);
  assert.deepEqual(codec.decode(cursor, 'contacts', principal, query), position);
  assert.throws(() => codec.decode(`x${cursor.slice(1)}`, 'contacts', principal, query), InvalidCursor);
  for (const altered of [{ ...principal, user_id: userB }, { ...principal, company_id: companyB }, { ...principal, credential_id: randomUUID() }]) {
    assert.throws(() => codec.decode(cursor, 'contacts', altered, query), InvalidCursor);
  }
  assert.throws(() => codec.decode(cursor, 'conversations', principal, query), InvalidCursor);
  assert.throws(() => codec.decode(cursor, 'contacts', principal, { ...query, query: 'Outra' }), InvalidCursor);
  now += 901000;
  assert.throws(() => codec.decode(cursor, 'contacts', principal, query), InvalidCursor);
});

test('sessões: criptografia autenticada não permite trocar conteúdo entre chaves', () => {
  const cipher = new SessionCipher('af'.repeat(32));
  const record: UserSession = { principal: { active: true, credential_id: randomUUID(), user_id: userA, company_id: companyA,
    scopes: [...scopes], resource: 'https://mcp.test/mcp', expires_at: expiration }, access_token: jwtA,
    token_hash: 'a'.repeat(64), label: 'Teste', created_at: Math.floor(Date.now() / 1000) };
  const encrypted = cipher.encrypt(record, 'key-a');
  assert(!encrypted.includes(jwtA));
  assert(!encrypted.includes(userA));
  assert.deepEqual(cipher.decrypt(encrypted, 'key-a'), record);
  assert.throws(() => cipher.decrypt(encrypted, 'key-b'));
  const parts = encrypted.split('.'); parts[2] = `x${parts[2]!.slice(1)}`;
  assert.throws(() => cipher.decrypt(parts.join('.'), 'key-a'));
  assert.throws(() => new SessionCipher('too-short'));
});

test('cliente Supabase recusa secret key e service_role', () => {
  for (const publishableKey of ['sb_secret_not-allowed', jwt(userA, { role: 'service_role' })]) {
    assert.throws(() => new SupabaseUserApi({ url: 'https://supabase.test', publishableKey, timeoutMs: 1000, maxResponseBytes: 10000 }));
  }
});

test('API completa: login verificado, emissão UUID, consultas via JWT do usuário, revogação e fronteiras', async t => {
  const requests: { url: string; authorization: string | undefined; apikey: string | string[] | undefined; body: Record<string, unknown> }[] = [];
  const identities = new Map([[jwtA, { user_id: userA, company_id: companyA }], [jwtB, { user_id: userB, company_id: companyB }]]);
  const oauthJwt = jwt(userA, { client_id: randomUUID() });
  identities.set(oauthJwt, { user_id: userA, company_id: companyA });
  const upstream = createServer(async (req, res) => {
    const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const text = Buffer.concat(chunks).toString(); const body = text ? JSON.parse(text) : {};
    requests.push({ url: req.url!, authorization: req.headers.authorization, apikey: req.headers.apikey, body });
    const identity = identities.get(req.headers.authorization?.slice(7) ?? '');
    res.setHeader('content-type', 'application/json');
    if (!identity) { res.writeHead(401); res.end('{}'); return; }
    if (req.url === '/auth/v1/user') { res.end(JSON.stringify({ id: identity.user_id })); return; }
    if (req.url === '/rest/v1/rpc/mcp_identity') { res.end(JSON.stringify(identity)); return; }
    if (req.url === '/rest/v1/rpc/mcp_read_page') {
      if (body.p_company_id !== identity.company_id) { res.writeHead(403); res.end('{}'); return; }
      const id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
      res.end(JSON.stringify({ items: [{ id, name: 'Contato permitido pela RLS' }],
        next_position: body.p_after_id ? null : { id, created_at: '2026-09-08T12:00:00.123456+00:00' } })); return;
    }
    res.writeHead(404); res.end('{}');
  });
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  t.after(async () => { upstream.closeAllConnections(); await new Promise<void>(resolve => upstream.close(() => resolve())); });
  const address = upstream.address(); assert(address && typeof address !== 'string');
  const api = new SupabaseUserApi({ url: `http://127.0.0.1:${address.port}`, publishableKey: 'sb_publishable_test', timeoutMs: 1000, maxResponseBytes: 10000 });
  const sessions = new MemorySessions();
  const resource = 'http://localhost:3000/mcp';
  const gateway = new RlsSaasGateway(sessions, api, new CursorCodec('c'.repeat(32)), resource);
  const limiter = { async consume() { return { allowed: true, retryAfter: 60 }; }, async ready() { return true; } };
  const config = readConfig({ NODE_ENV: 'test', PUBLIC_URL: 'http://localhost:3000', OAUTH_ISSUER: 'https://auth.test',
    SAAS_API_URL: 'https://api.test', SAAS_API_KEY: 's'.repeat(32), REDIS_URL: 'redis://localhost:6379', ALLOWED_HOSTS: 'localhost:3000' });
  const app = createApp(config, { gateway, limiter, apiRouter: createApiRouter(gateway, limiter, config.SAAS_API_KEY) }, () => {});
  const http = app.listen(0, '127.0.0.1'); await once(http, 'listening');
  t.after(async () => { http.closeAllConnections(); await new Promise<void>(resolve => http.close(() => resolve())); });
  const appAddress = http.address(); assert(appAddress && typeof appAddress !== 'string');
  config.allowedHosts.push(`127.0.0.1:${appAddress.port}`);
  const base = `http://127.0.0.1:${appAddress.port}`;
  const request = (path: string, token: string, method = 'GET', body?: unknown) => fetch(`${base}${path}`, {
    method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream' }, body: body === undefined ? undefined : JSON.stringify(body),
  });
  assert.equal((await request('/api/mcp-tokens', 'forged', 'POST', {})).status, 401);
  assert.equal((await request('/api/mcp-tokens', jwtA.replace('mock-signature', 'forged-signature'), 'POST', {})).status, 401);
  assert.equal((await request('/api/mcp-tokens', oauthJwt, 'POST', {})).status, 401);
  assert.equal((await request('/api/mcp-tokens', jwtA, 'POST', { user_id: userB })).status, 400);
  const issued = await request('/api/mcp-tokens', jwtA, 'POST', { label: 'Claude teste', scopes: ['contacts:read'] });
  assert.equal(issued.status, 201);
  const credential = await issued.json();
  assert.match(credential.token, /^[a-f0-9-]{36}$/);
  assert(credential.expires_at <= expiration);
  assert(!JSON.stringify(credential).includes(jwtA));
  assert.equal((await request('/api/mcp-tokens', credential.token)).status, 401);
  const listed = await (await request('/api/mcp-tokens', jwtA)).json();
  assert.equal(listed.items.length, 1);
  assert(!JSON.stringify(listed).includes(credential.token));
  assert(!JSON.stringify(listed).includes(jwtA));
  assert.deepEqual((await (await request('/api/mcp-tokens', jwtB)).json()).items, []);
  const toolsCall = (args: unknown = {}, name = 'search_contacts') => ({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } });
  let response = await request('/mcp', credential.token, 'POST', toolsCall());
  assert.equal(response.status, 200);
  const first = await response.json();
  assert.equal(first.result.structuredContent.items[0].name, 'Contato permitido pela RLS');
  const cursor = first.result.structuredContent.next_cursor;
  response = await request('/mcp', credential.token, 'POST', toolsCall({ cursor }));
  assert.equal((await response.json()).result.structuredContent.next_cursor, null);
  const callRequests = requests.filter(r => r.url === '/rest/v1/rpc/mcp_read_page');
  assert(callRequests.every(r => r.authorization === `Bearer ${jwtA}` && r.apikey === 'sb_publishable_test'));
  assert.equal(callRequests.at(-1)?.body.p_after_created_at, '2026-09-08T12:00:00.123456+00:00');
  assert(!JSON.stringify(requests).includes(credential.token));
  response = await request('/mcp', credential.token, 'POST', toolsCall({}, 'search_opportunities'));
  assert.equal((await response.json()).result.isError, true);
  assert.equal((await request('/internal/mcp/introspect', 'wrong-service', 'POST', { token: credential.token, resource })).status, 401);
  assert.equal((await request('/internal/mcp/introspect', config.SAAS_API_KEY, 'POST', { token: credential.token, resource })).status, 200);
  response = await request('/internal/mcp/read/contacts', config.SAAS_API_KEY, 'POST', {
    context: { credential_id: credential.credential_id, user_id: userA, company_id: companyB }, limit: 25,
  });
  assert.equal(response.status, 403);
  await request(`/api/mcp-tokens/${credential.credential_id}`, jwtB, 'DELETE');
  assert.equal((await request('/mcp', credential.token, 'POST', toolsCall())).status, 200);
  identities.set(jwtA, { user_id: userA, company_id: companyB });
  assert.equal((await request('/mcp', credential.token, 'POST', toolsCall())).status, 401);
  identities.set(jwtA, { user_id: userA, company_id: companyA });
  assert.equal((await request(`/api/mcp-tokens/${credential.credential_id}`, jwtA, 'DELETE')).status, 204);
  assert.equal((await request('/mcp', credential.token, 'POST', toolsCall())).status, 401);
});
