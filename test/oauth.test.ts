import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createHmac, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { createClient } from 'redis';
import { OAuthBroker, OAuthError, digest, pkce, secret } from '../src/oauth/broker.js';
import { RedisOAuthStore, type OAuthStore, type Stored, type Write } from '../src/oauth/store.js';
import { SupabaseOAuth, type OAuthUpstream, type UpstreamSession } from '../src/oauth/upstream.js';
import { createOAuthRouter } from '../src/oauth/router.js';
import { createApp } from '../src/create-app.js';
import { readConfig } from '../src/config.js';
import { SupabaseUserApi } from '../src/api/supabase.js';
import { CursorCodec } from '../src/api/cursor.js';
import { AccessDenied, DependencyUnavailable, scopes, type Principal } from '../src/contracts.js';
import { readToolNames, type ReadToolName } from '../src/tools/read-catalog.js';

class MemoryOAuth implements OAuthStore {
  records = new Map<string, { value: unknown; version: string; expiry: number }>();
  async get<T>(key: string): Promise<Stored<T> | null> {
    const record = this.records.get(key);
    return record && record.expiry > Date.now() ? { value: structuredClone(record.value) as T, version: record.version } : null;
  }
  async commit(key: string, version: string | null, value: unknown | null, ttl: number, writes: Write[] = []) {
    const record = this.records.get(key);
    const existing = record && record.expiry > Date.now() ? record.version : null;
    if (existing !== version) return false;
    if (value === null) this.records.delete(key);
    else this.records.set(key, { value: structuredClone(value), version: randomUUID(), expiry: Date.now() + ttl * 1000 });
    for (const w of writes) this.records.set(w.key, { value: structuredClone(w.value), version: randomUUID(), expiry: Date.now() + w.ttl * 1000 });
    return true;
  }
}
const resource = 'https://mcp.test/mcp';
const redirect = 'https://claude.ai/api/mcp/auth_callback';
const time = () => Math.floor(Date.now() / 1000);
test('configuração OAuth em produção exige cliente Supabase e issuer próprio', () => {
  const env = { NODE_ENV: 'production', PUBLIC_URL: 'https://mcp.test', OAUTH_ISSUER: 'https://mcp.test',
    SAAS_API_KEY: 's'.repeat(32), SUPABASE_URL: 'https://supabase.test', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    SESSION_ENCRYPTION_KEY: 'ab'.repeat(32), MCP_CURSOR_SECRET: 's'.repeat(32), REDIS_URL: 'redis://localhost', ALLOWED_HOSTS: 'mcp.test' };
  assert.throws(() => readConfig(env), /SUPABASE_OAUTH_CLIENT/);
  const configured = { ...env, SUPABASE_OAUTH_CLIENT_ID: randomUUID(), SUPABASE_OAUTH_CLIENT_SECRET: 's'.repeat(32) };
  assert.equal(readConfig(configured).OAUTH_ACCESS_TOKEN_SECONDS, 900);
  assert.throws(() => readConfig({ ...configured, OAUTH_ISSUER: 'https://supabase.test/auth/v1' }), /OAUTH_ISSUER/);
  assert.throws(() => readConfig({ ...configured, OAUTH_ALLOWED_REDIRECT_URIS: 'https://evil.test/*' }), /Callbacks/);
});
function fixture(store: OAuthStore = new MemoryOAuth()) {
  const users = [randomUUID(), randomUUID()]; const companies = [randomUUID(), randomUUID()];
  const identities = new Map<string, { user_id: string; company_id: string }>();
  const sessions = users.map((user_id, i): UpstreamSession => {
    const session = { user_id, company_id: companies[i]!, access_token: `supabase-private-${i}`, refresh_token: `supabase-refresh-${i}`, expires_at: time() + 3600 };
    identities.set(session.access_token, { user_id, company_id: session.company_id }); return session;
  });
  class Api extends SupabaseUserApi {
    constructor() { super({ url: 'https://supabase.test', publishableKey: 'sb_publishable_test', timeoutMs: 1000, maxResponseBytes: 10000 }); }
    override async identity(token: string) { const identity = identities.get(token); if (!identity) throw new AccessDenied(); return identity; }
    override async validateLogin(token: string) { const identity = await this.identity(token); return { userId: identity.user_id, expiresAt: time() + 3600 }; }
    override async read(token: string, company: string) {
      const identity = await this.identity(token); if (identity.company_id !== company) throw new AccessDenied();
      return { items: [{ owner: identity.user_id, company }], next_position: null };
    }
    override async executeRead(token: string, context: Pick<Principal, 'company_id' | 'user_id'>, name: ReadToolName, _input: unknown) {
      const identity = await this.identity(token);
      assert.deepEqual(context, identity);
      await new Promise(resolve => setTimeout(resolve, 2));
      return { data: { owner: identity.user_id, company: identity.company_id, tool: name } };
    }
  }
  let refreshes = 0;
  const upstream: OAuthUpstream = {
    authorize(state, challenge) { const url = new URL('https://supabase.test/auth/v1/oauth/authorize'); url.search = new URLSearchParams({ state, code_challenge: challenge }).toString(); return url.href; },
    async exchange(code) { const session = sessions[Number(code)]; if (!session) throw new AccessDenied(); return structuredClone(session); },
    async refresh(session) { refreshes++; await new Promise(resolve => setTimeout(resolve, 10)); return { ...session, expires_at: time() + 3600 }; },
  };
  const api = new Api();
  const options = { resource, allowedRedirects: [redirect], accessSeconds: 900, connectionSeconds: 86400 };
  const broker = new OAuthBroker(store, upstream, api, new CursorCodec('c'.repeat(32)), options);
  async function begin(user: number, scope = 'contacts:read') {
    const client = await broker.register('Claude', [redirect]); const verifier = secret(); const browser = secret();
    const url = new URL(await broker.authorize({ client_id: client.client_id, redirect_uri: redirect, resource, code_challenge: pkce(verifier), state: 'client-state', scope }, browser));
    const state = url.searchParams.get('state')!;
    const callback = await broker.callback(state, String(user), browser); assert(callback.consentId);
    const consent = await broker.consent(callback.consentId, browser);
    const result = new URL(await broker.decide(callback.consentId, consent.value.csrf, browser, true));
    assert.equal(result.searchParams.get('state'), 'client-state'); assert.equal(result.searchParams.get('iss'), 'https://mcp.test');
    return { client, verifier, code: result.searchParams.get('code')!, browser };
  }
  async function connect(user: number, scope?: string) {
    const flow = await begin(user, scope);
    return { ...flow, tokens: await broker.exchange(flow.code, flow.client.client_id, redirect, flow.verifier, resource) };
  }
  return { broker, options, api, upstream, store, users, companies, identities, sessions, begin, connect, get refreshes() { return refreshes; } };
}

test('OAuth: duas empresas, scopes, audiência e revogação pelo dono da conexão', async () => {
  const f = fixture(); const a = await f.connect(0); const b = await f.connect(1);
  const pa = await f.broker.authenticate(a.tokens.access_token, resource); const pb = await f.broker.authenticate(b.tokens.access_token, resource);
  assert(pa && pb); assert.equal(pa.user_id, f.users[0]); assert.equal(pb.company_id, f.companies[1]);
  assert.equal(await f.broker.authenticate(a.tokens.access_token, 'https://other.test/mcp'), null);
  assert.equal(await f.broker.authenticate(f.sessions[0]!.access_token, resource), null);
  await assert.rejects(f.broker.read('opportunities', pa, { limit: 25 }), AccessDenied);
  await assert.rejects(f.broker.read('contacts', { ...pa, user_id: pb.user_id }, { limit: 25 }), AccessDenied);
  const outcomes = await Promise.all(Array.from({ length: 100 }, async (_, i) => {
    const p = i % 2 ? pa : pb; const data = await f.broker.read('contacts', p, { limit: 25 });
    assert.equal(data.items[0]!.owner, p.user_id); return data;
  })); assert.equal(outcomes.length, 100);
  const listed = await f.broker.list(pa.user_id); assert.equal(listed.length, 1);
  assert(!JSON.stringify(listed).includes(a.tokens.access_token)); assert(!JSON.stringify(listed).includes('supabase-private'));
  await f.broker.revokeGrant(pa.credential_id, pb.user_id); assert(await f.broker.authenticate(a.tokens.access_token, resource));
  await f.broker.revokeGrant(pa.credential_id, pa.user_id); assert.equal(await f.broker.authenticate(a.tokens.access_token, resource), null);
  await assert.rejects(f.broker.refresh(a.tokens.refresh_token, a.client.client_id), OAuthError);
  assert(await f.broker.authenticate(b.tokens.access_token, resource));
});

test('OAuth tools migradas: isola empresas, exige escopos concedidos, renova JWT e aplica revogação', async () => {
  const f = fixture(); const a = await f.connect(0, scopes.join(' ')); const b = await f.connect(1, scopes.join(' '));
  const old = await f.connect(0);
  const pa = await f.broker.authenticate(a.tokens.access_token, resource); const pb = await f.broker.authenticate(b.tokens.access_token, resource);
  const po = await f.broker.authenticate(old.tokens.access_token, resource); assert(pa && pb && po);
  await assert.rejects(f.broker.executeRead('list_users', po, {}), AccessDenied);
  await assert.rejects(f.broker.executeRead('list_users', { ...po, scopes: [...scopes] }, {}), AccessDenied);
  await assert.rejects(f.broker.executeRead('get_contact_full_context_v2', po, { identifiers: ['x@example.test'] }), AccessDenied);
  await assert.rejects(f.broker.executeRead('list_users', { ...pa, user_id: pb.user_id }, {}), AccessDenied);
  await assert.rejects(f.broker.executeRead('list_users', { ...pa, company_id: pb.company_id }, {}), AccessDenied);
  await assert.rejects(f.broker.executeRead('list_users', { ...pa, credential_id: pb.credential_id }, {}), AccessDenied);
  await assert.rejects(f.broker.executeRead('list_users', { ...pa, resource: 'https://other.test/mcp' }, {}), AccessDenied);
  await assert.rejects(f.broker.executeRead('list_users', { ...pa, expires_at: 1 }, {}), AccessDenied);
  await Promise.all(Array.from({ length: 32 }, async (_, i) => {
    const principal = i % 2 ? pa : pb; const name = readToolNames[i % readToolNames.length]!;
    const result = await f.broker.executeRead(name, principal, name === 'get_contact_full_context_v2' ? { identifiers: ['x@example.test'] } : {});
    assert.deepEqual(result.data, { owner: principal.user_id, company: principal.company_id, tool: name });
  }));
  const renewedOld = await f.broker.refresh(old.tokens.refresh_token, old.client.client_id);
  assert.equal(renewedOld.scope, 'contacts:read');
  const refreshedOld = await f.broker.authenticate(renewedOld.access_token, resource); assert(refreshedOld);
  await assert.rejects(f.broker.executeRead('list_users', refreshedOld, {}), AccessDenied);

  f.upstream.refresh = async session => {
    const access_token = 'rotated-private-user-0';
    f.identities.set(access_token, { user_id: session.user_id, company_id: session.company_id });
    return { ...session, access_token, expires_at: time() + 3600 };
  };
  const record = await f.store.get<any>(`grant:${pa.credential_id}`); assert(record);
  record.value.session.expires_at = time() - 1;
  await f.store.commit(`grant:${pa.credential_id}`, record.version, record.value, 86400);
  const originalExecute = f.api.executeRead.bind(f.api);
  f.api.executeRead = async (token, ...args) => { assert.equal(token, 'rotated-private-user-0'); return originalExecute(token, ...args); };
  await f.broker.executeRead('list_users', pa, {});
  f.identities.set('rotated-private-user-0', { user_id: pa.user_id, company_id: pb.company_id });
  await assert.rejects(f.broker.executeRead('list_users', pa, {}), AccessDenied);
  await f.broker.revokeGrant(pb.credential_id, pb.user_id);
  await assert.rejects(f.broker.executeRead('list_users', pb, {}), AccessDenied);
});

test('OAuth HTTP: anuncia 11 tools e rejeita identidade injetada antes de consultar', async t => {
  const f = fixture(); const a = await f.connect(0, scopes.join(' ')); const old = await f.connect(1);
  const config = readConfig({ NODE_ENV: 'test', PUBLIC_URL: 'https://mcp.test', OAUTH_ISSUER: 'https://mcp.test', SAAS_API_KEY: 's'.repeat(32),
    SUPABASE_URL: 'https://supabase.test', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test', SESSION_ENCRYPTION_KEY: 'ab'.repeat(32),
    MCP_CURSOR_SECRET: 's'.repeat(32), SUPABASE_OAUTH_CLIENT_ID: randomUUID(), SUPABASE_OAUTH_CLIENT_SECRET: 's'.repeat(32), REDIS_URL: 'redis://localhost', ALLOWED_HOSTS: 'mcp.test' });
  const limiter = { async consume() { return { allowed: true, retryAfter: 60 }; }, async ready() { return true; } };
  const http = createApp(config, { gateway: f.broker, limiter, oauthRouter: createOAuthRouter(config, f.broker, limiter) }, () => {}).listen(0, '127.0.0.1');
  await once(http, 'listening'); t.after(() => { http.closeAllConnections(); http.close(); });
  const address = http.address(); assert(address && typeof address !== 'string');
  config.allowedHosts.push(`127.0.0.1:${address.port}`);
  const post = async (method: string, params?: unknown, token = a.tokens.access_token) => {
    const response = await fetch(`http://127.0.0.1:${address.port}/mcp`, { method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
    assert.equal(response.status, 200); return response.json();
  };
  const list = await post('tools/list'); assert.equal(list.result.tools.length, 11);
  for (const tool of list.result.tools) {
    assert(tool.annotations.readOnlyHint); assert(!tool.inputSchema.properties.company_id); assert(!tool.inputSchema.properties.user_id);
  }
  for (const name of readToolNames) {
    const result = await post('tools/call', { name, arguments: name === 'get_contact_full_context_v2' ? { identifiers: ['x@example.test'] } : {} });
    assert(!result.result.isError); assert.equal(result.result.structuredContent.data.owner, f.users[0]);
  }
  const denied = await post('tools/call', { name: 'list_users', arguments: {} }, old.tokens.access_token);
  assert(denied.result.isError); assert(denied.result._meta['mcp/www_authenticate'][0].includes('catalog:read'));
  const injected = await post('tools/call', { name: 'list_users', arguments: { company_id: f.companies[1] } });
  assert(injected.error || injected.result.isError); assert(!injected.result?.structuredContent);
});

test('OAuth: troca valida PKCE, cliente, callback, recurso e código de uso único', async () => {
  const f = fixture(); const a = await f.begin(0);
  for (const args of [
    [a.code, randomUUID(), redirect, a.verifier, resource], [a.code, a.client.client_id, 'https://evil.test', a.verifier, resource],
    [a.code, a.client.client_id, redirect, secret(), resource], [a.code, a.client.client_id, redirect, a.verifier, 'https://other.test/mcp'],
  ]) await assert.rejects(f.broker.exchange(...args as [string, string, string, string, string]), OAuthError);
  const tokens = await f.broker.exchange(a.code, a.client.client_id, redirect, a.verifier, resource);
  assert(await f.broker.authenticate(tokens.access_token, resource));
  await assert.rejects(f.broker.exchange(a.code, a.client.client_id, redirect, a.verifier, resource), OAuthError);
  assert.equal(await f.broker.authenticate(tokens.access_token, resource), null);
});

test('OAuth: state, cookie e CSRF obrigatórios; recusa não emite tokens', async () => {
  const f = fixture(); const client = await f.broker.register('<script>alert(1)</script>', [redirect]);
  await assert.rejects(f.broker.register('Bad', ['https://evil.test/callback']), OAuthError);
  const request = { client_id: client.client_id, redirect_uri: redirect, resource, code_challenge: pkce(secret()) };
  await assert.rejects(f.broker.authorize({ ...request, scope: 'contacts:write' }, secret()), OAuthError);
  const browser = secret(); const url = new URL(await f.broker.authorize(request, browser)); const state = url.searchParams.get('state')!;
  await assert.rejects(f.broker.callback(state, '0', secret()), OAuthError);
  const callback = await f.broker.callback(state, '0', browser); assert(callback.consentId);
  await assert.rejects(f.broker.callback(state, '0', browser), OAuthError);
  await assert.rejects(f.broker.consent(callback.consentId, secret()), OAuthError);
  await assert.rejects(f.broker.decide(callback.consentId, 'wrong-csrf', browser, true), OAuthError);
  const consent = await f.broker.consent(callback.consentId, browser);
  const result = new URL(await f.broker.decide(callback.consentId, consent.value.csrf, browser, false));
  assert.equal(result.searchParams.get('error'), 'access_denied'); assert.equal(result.searchParams.has('code'), false);
  assert.deepEqual(await f.broker.list(f.users[0]!), []);
});

test('OAuth: rotação mantém identidade, rejeita outro cliente e detecta replay', async () => {
  const f = fixture(); const a = await f.connect(0); const b = await f.connect(1);
  await assert.rejects(f.broker.refresh(a.tokens.refresh_token, b.client.client_id), OAuthError);
  await assert.rejects(f.broker.refresh(a.tokens.refresh_token, a.client.client_id, 'https://other.test/mcp'), OAuthError);
  const next = await f.broker.refresh(a.tokens.refresh_token, a.client.client_id, resource);
  assert.notEqual(next.refresh_token, a.tokens.refresh_token); assert.notEqual(next.access_token, a.tokens.access_token);
  assert.equal((await f.broker.authenticate(next.access_token, resource))?.user_id, f.users[0]);
  await assert.rejects(f.broker.refresh(a.tokens.refresh_token, a.client.client_id), OAuthError);
  assert.equal(await f.broker.authenticate(next.access_token, resource), null);
  assert(await f.broker.authenticate(b.tokens.access_token, resource));
});

test('OAuth: Supabase renova uma vez entre réplicas e não ressuscita conexão revogada', async () => {
  const f = fixture(); const a = await f.connect(0);
  const principal = await f.broker.authenticate(a.tokens.access_token, resource); assert(principal);
  const key = `grant:${principal.credential_id}`;
  // Force only the upstream session to expire; MCP token is still valid.
  const grant = await f.store.get<any>(key); assert(grant); grant.value.session.expires_at = time() - 1;
  await f.store.commit(key, grant.version, grant.value, 86400);
  const replica = new OAuthBroker(f.store, f.upstream, f.api, new CursorCodec('c'.repeat(32)), f.options);
  const results = await Promise.allSettled([f.broker.authenticate(a.tokens.access_token, resource), replica.authenticate(a.tokens.access_token, resource)]);
  assert.equal(f.refreshes, 1); assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await replica.authenticate(a.tokens.access_token, resource))?.user_id, f.users[0]);
  const updated = await f.store.get<any>(key); assert(updated); updated.value.session.expires_at = time() - 1;
  await f.store.commit(key, updated.version, updated.value, 86400);
  const renewing = f.broker.authenticate(a.tokens.access_token, resource);
  await new Promise(resolve => setTimeout(resolve, 2));
  await replica.revokeGrant(principal.credential_id, principal.user_id); await renewing;
  assert.equal(await f.store.get(key), null);
});

test('OAuth: mudança de empresa ou sessão upstream inválida interrompe acesso', async () => {
  const f = fixture(); const a = await f.connect(0);
  f.identities.set(f.sessions[0]!.access_token, { user_id: f.users[0]!, company_id: f.companies[1]! });
  assert.equal(await f.broker.authenticate(a.tokens.access_token, resource), null);
  await assert.rejects(f.broker.refresh(a.tokens.refresh_token, a.client.client_id), AccessDenied);
  assert.equal(await f.broker.authenticate(a.tokens.access_token, resource), null);
});

test('OAuth HTTP: descoberta, registro, consentimento seguro, MCP e gestão', async t => {
  const f = fixture();
  const config = readConfig({ NODE_ENV: 'test', PUBLIC_URL: 'https://mcp.test', OAUTH_ISSUER: 'https://mcp.test', SAAS_API_KEY: 's'.repeat(32),
    SUPABASE_URL: 'https://supabase.test', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test', SESSION_ENCRYPTION_KEY: 'ab'.repeat(32),
    MCP_CURSOR_SECRET: 's'.repeat(32), SUPABASE_OAUTH_CLIENT_ID: randomUUID(), SUPABASE_OAUTH_CLIENT_SECRET: 's'.repeat(32),
    REDIS_URL: 'redis://localhost', ALLOWED_HOSTS: 'mcp.test', ALLOWED_ORIGINS: 'https://app.test' });
  const limiter = { async consume() { return { allowed: true, retryAfter: 60 }; }, async ready() { return true; } };
  const app = createApp(config, { gateway: f.broker, limiter, oauthRouter: createOAuthRouter(config, f.broker, limiter) }, () => {});
  const http = app.listen(0, '127.0.0.1'); await once(http, 'listening');
  t.after(() => { http.closeAllConnections(); http.close(); });
  const address = http.address(); assert(address && typeof address !== 'string'); const base = `http://127.0.0.1:${address.port}`;
  config.allowedHosts.push(`127.0.0.1:${address.port}`);
  const request = (path: string, init: RequestInit = {}) => fetch(base + path, { redirect: 'manual', ...init });
  const metadata = await (await request('/.well-known/oauth-authorization-server')).json();
  assert.equal((await request('/healthz')).headers.get('referrer-policy'), 'no-referrer');
  assert.equal(metadata.authorization_response_iss_parameter_supported, true);
  assert.deepEqual(metadata.code_challenge_methods_supported, ['S256']);
  const registered = await request('/oauth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client_name: '<script>evil</script>', redirect_uris: [redirect] }) });
  assert.equal(registered.status, 201); const client = await registered.json();
  const verifier = secret();
  const url = '/oauth/authorize?' + new URLSearchParams({ response_type: 'code', client_id: client.client_id, redirect_uri: redirect, resource,
    code_challenge: pkce(verifier), code_challenge_method: 'S256', scope: 'contacts:read', state: 'original' });
  const auth = await request(url); assert.equal(auth.status, 302);
  const cookie = auth.headers.get('set-cookie')!.split(';')[0]!;
  const state = new URL(auth.headers.get('location')!).searchParams.get('state')!;
  const cb = await request('/oauth/supabase/callback?' + new URLSearchParams({ state, code: '0' }), { headers: { cookie } }); assert.equal(cb.status, 303);
  const location = cb.headers.get('location')!;
  assert.equal((await request(location)).status, 400);
  const consent = await request(location, { headers: { cookie } }); const html = await consent.text();
  assert(!html.includes('<script>evil</script>')); assert(html.includes('&lt;script&gt;'));
  assert(consent.headers.get('content-security-policy')?.includes("form-action 'self' https://claude.ai;"));
  assert(!consent.headers.get('content-security-policy')?.includes('https://app.test'));
  assert.equal(consent.headers.get('referrer-policy'), 'strict-origin');
  const id = new URL(location, base).searchParams.get('id')!; const csrf = /name="csrf" value="([^"]+)"/.exec(html)![1]!;
  const form = { method: 'POST', headers: { cookie, 'content-type': 'application/x-www-form-urlencoded', origin: 'https://mcp.test' }, body: new URLSearchParams({ id, csrf, decision: 'approve' }) };
  for (const origin of ['null', 'https://evil.test', 'http://mcp.test']) {
    const blocked = await request('/oauth/consent', { ...form, headers: { ...form.headers, origin } });
    assert.equal(blocked.status, 403); assert.deepEqual(await blocked.json(), { error: 'invalid_origin' });
  }
  // An allowed SaaS CORS origin still cannot submit the MCP consent form.
  const foreign = await request('/oauth/consent', { ...form, headers: { ...form.headers, origin: 'https://app.test' } });
  assert.equal(foreign.status, 400);
  const missing = await request('/oauth/consent', { ...form, headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' } });
  assert.equal(missing.status, 400);
  const badCsrf = await request('/oauth/consent', { ...form, body: new URLSearchParams({ id, csrf: 'wrong-csrf', decision: 'approve' }) });
  assert.equal(badCsrf.status, 400);
  const approved = await request('/oauth/consent', form); assert.equal(approved.status, 303);
  assert.equal(approved.headers.get('referrer-policy'), 'no-referrer');
  const code = new URL(approved.headers.get('location')!).searchParams.get('code')!;
  const tokenResponse = await request('/oauth/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', client_id: client.client_id, code, redirect_uri: redirect, code_verifier: verifier, resource }) });
  assert.equal(tokenResponse.status, 200); const tokens = await tokenResponse.json();
  assert(!JSON.stringify(tokens).includes('supabase-'));
  const mcp = await request('/mcp', { method: 'POST', headers: { authorization: `Bearer ${tokens.access_token}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'search_contacts', arguments: {} } }) });
  assert.equal(mcp.status, 200); assert.equal((await mcp.json()).result.structuredContent.items[0].owner, f.users[0]);
  const management = await request('/api/mcp-connections', { headers: { authorization: `Bearer ${f.sessions[0]!.access_token}` } });
  assert.equal(management.status, 200); const list = await management.json(); assert.equal(list.items.length, 1);
  await request(`/api/mcp-connections/${list.items[0].id}`, { method: 'DELETE', headers: { authorization: `Bearer ${f.sessions[0]!.access_token}` } });
  assert.equal(await f.broker.authenticate(tokens.access_token, resource), null);
});

test('Supabase OAuth: troca real HTTP usa Basic, JWT validado no Auth e client_id específico', async t => {
  const user = randomUUID(); const company = randomUUID(); const clientId = randomUUID(); let jwt = ''; let origin = ''; let accepted = '';
  const upstream = createServer(async (req, res) => {
    res.setHeader('content-type', 'application/json');
    if (req.url === '/auth/v1/oauth/token') {
      const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const fields = new URLSearchParams(Buffer.concat(chunks).toString());
      assert.match(req.headers.authorization!, /^Basic /); assert.equal(fields.get('grant_type'), 'authorization_code');
      res.end(JSON.stringify({ token_type: 'bearer', access_token: jwt, refresh_token: 'refresh-private' })); return;
    }
    if (req.headers.authorization !== `Bearer ${accepted}`) { res.writeHead(401); res.end('{}'); return; }
    if (req.url === '/auth/v1/user') { res.end(JSON.stringify({ id: user })); return; }
    if (req.url === '/rest/v1/rpc/mcp_identity') { res.end(JSON.stringify({ user_id: user, company_id: company })); return; }
    res.writeHead(404); res.end('{}');
  });
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  t.after(() => { upstream.closeAllConnections(); upstream.close(); });
  const address = upstream.address(); assert(address && typeof address !== 'string'); origin = `http://127.0.0.1:${address.port}`;
  const makeJwt = (claims = {}) => `e30.${Buffer.from(JSON.stringify({ sub: user, exp: time() + 3600, role: 'authenticated', iss: origin + '/auth/v1', aud: 'authenticated', client_id: clientId, ...claims })).toString('base64url')}.valid-signature`;
  jwt = accepted = makeJwt();
  const api = new SupabaseUserApi({ url: origin, publishableKey: 'sb_publishable_test', timeoutMs: 1000, maxResponseBytes: 10000 });
  const oauth = new SupabaseOAuth({ url: origin, clientId, clientSecret: 's'.repeat(32), callback: resource + '/callback', timeoutMs: 1000 }, api);
  assert.equal((await oauth.exchange('code', secret())).user_id, user);
  await assert.rejects(api.validateLogin(jwt), AccessDenied);
  for (const claims of [{ client_id: randomUUID() }, { aud: 'wrong' }, { iss: 'https://evil.test' }, { sub: randomUUID() }, { role: 'service_role' }, { exp: time() - 10 }]) {
    jwt = accepted = makeJwt(claims); await assert.rejects(oauth.exchange('code', secret()), AccessDenied);
  }
  jwt = makeJwt(); accepted = 'different-token'; await assert.rejects(oauth.exchange('code', secret()), AccessDenied);
});

test('Supabase OAuth: email sem openid mantém HS256, sessão individual e refresh sem ID token', async t => {
  const user = randomUUID(); const company = randomUUID(); const clientId = randomUUID();
  const signingSecret = 'only-in-the-fake-supabase-server';
  let origin = ''; let requestedScope = ''; let issued = 0; let validated = 0;
  const upstream = createServer(async (req, res) => {
    res.setHeader('content-type', 'application/json');
    if (req.url === '/auth/v1/oauth/token') {
      // Reproduce the observed production failure if openid is requested again.
      if (requestedScope.split(' ').includes('openid')) {
        res.writeHead(500); res.end(JSON.stringify({ error: 'HS256 is not supported for ID token signing' })); return;
      }
      assert.equal(req.headers.authorization, 'Basic ' + Buffer.from(`${clientId}:client-secret`).toString('base64'));
      const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const fields = new URLSearchParams(Buffer.concat(chunks).toString());
      if (issued === 0) {
        assert.equal(fields.get('grant_type'), 'authorization_code');
        assert.equal(fields.get('redirect_uri'), resource + '/callback');
        assert(fields.get('code_verifier'));
      } else {
        assert.equal(fields.get('grant_type'), 'refresh_token');
        assert.equal(fields.get('refresh_token'), `refresh-${issued}`);
      }
      issued++;
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ sub: user, exp: time() + 3600, role: 'authenticated',
        iss: origin + '/auth/v1', aud: 'authenticated', client_id: clientId, scope: requestedScope, jti: String(issued) })).toString('base64url');
      const input = `${header}.${payload}`;
      const jwt = `${input}.${createHmac('sha256', signingSecret).update(input).digest('base64url')}`;
      res.end(JSON.stringify({ token_type: 'bearer', access_token: jwt, refresh_token: `refresh-${issued}`, scope: requestedScope })); return;
    }
    assert.equal(req.headers.apikey, 'sb_publishable_test');
    const [header, payload, signature] = (req.headers.authorization ?? '').replace(/^Bearer /, '').split('.');
    const expected = createHmac('sha256', signingSecret).update(`${header}.${payload}`).digest('base64url');
    if (signature !== expected) { res.writeHead(401); res.end('{}'); return; }
    if (req.url === '/auth/v1/user') { validated++; res.end(JSON.stringify({ id: user, email: 'account@example.test' })); return; }
    assert.equal(req.url, '/rest/v1/rpc/mcp_identity');
    res.end(JSON.stringify({ user_id: user, company_id: company }));
  });
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  t.after(() => { upstream.closeAllConnections(); upstream.close(); });
  const address = upstream.address(); assert(address && typeof address !== 'string'); origin = `http://127.0.0.1:${address.port}`;
  const api = new SupabaseUserApi({ url: origin, publishableKey: 'sb_publishable_test', timeoutMs: 1000, maxResponseBytes: 10000 });
  const oauth = new SupabaseOAuth({ url: origin, clientId, clientSecret: 'client-secret', callback: resource + '/callback', timeoutMs: 1000 }, api);
  const verifier = secret(); const state = secret();
  const params = new URL(oauth.authorize(state, pkce(verifier))).searchParams;
  requestedScope = params.get('scope')!;
  assert.equal(requestedScope, 'email'); assert.equal(params.get('state'), state);
  assert.equal(params.get('code_challenge'), pkce(verifier)); assert.equal(params.get('code_challenge_method'), 'S256');
  assert.equal(params.get('client_id'), clientId); assert.equal(params.get('response_type'), 'code');
  const session = await oauth.exchange('code', verifier);
  assert.equal(session.user_id, user); assert.equal(session.company_id, company);
  const refreshed = await oauth.refresh(session);
  assert.equal(refreshed.user_id, user); assert.equal(refreshed.company_id, company);
  assert.notEqual(refreshed.refresh_token, session.refresh_token); assert.equal(validated, 2);
  const parts = refreshed.access_token.split('.'); parts[2] = 'invalid-signature';
  await assert.rejects(api.validateOAuth(parts.join('.'), clientId), AccessDenied);
});

test('OAuth: diagnóstico diferencia token, Auth e RPC sem propagar corpos confidenciais', async t => {
  const user = randomUUID(); const company = randomUUID(); const clientId = randomUUID();
  let origin = ''; let failedPath = ''; let status = 500; let responseBody = 'private-code-and-token';
  const upstream = createServer((req, res) => {
    if (req.url === failedPath) { res.writeHead(status); res.end(responseBody); return; }
    res.setHeader('content-type', 'application/json');
    if (req.url === '/auth/v1/oauth/token') {
      const jwt = `e30.${Buffer.from(JSON.stringify({ sub: user, exp: time() + 3600, role: 'authenticated',
        iss: origin + '/auth/v1', aud: 'authenticated', client_id: clientId })).toString('base64url')}.signature`;
      res.end(JSON.stringify({ token_type: 'bearer', access_token: jwt, refresh_token: 'private-refresh' })); return;
    }
    if (req.url === '/auth/v1/user') { res.end(JSON.stringify({ id: user })); return; }
    res.end(JSON.stringify({ user_id: user, company_id: company }));
  });
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  t.after(() => { upstream.closeAllConnections(); upstream.close(); });
  const address = upstream.address(); assert(address && typeof address !== 'string'); origin = `http://127.0.0.1:${address.port}`;
  const api = new SupabaseUserApi({ url: origin, publishableKey: 'sb_publishable_test', timeoutMs: 1000, maxResponseBytes: 10000 });
  const oauth = new SupabaseOAuth({ url: origin, clientId, clientSecret: 'private-client-secret', callback: resource + '/callback', timeoutMs: 1000 }, api);
  for (const [path, operation, failureStatus] of [
    ['/auth/v1/oauth/token', 'supabase_oauth_token', 500],
    ['/auth/v1/user', 'supabase_user', 503],
    ['/rest/v1/rpc/mcp_identity', 'supabase_identity', 404],
  ] as const) {
    failedPath = path; status = failureStatus;
    await assert.rejects(oauth.exchange('private-code', secret()), error => {
      assert(error instanceof DependencyUnavailable);
      assert.deepEqual(error.diagnostic, { operation, reason: 'http_error', upstream_status: status });
      assert(!JSON.stringify(error).includes('private')); return true;
    });
  }
  failedPath = '/auth/v1/oauth/token'; status = 401;
  await assert.rejects(oauth.exchange('private-code', secret()), error => {
    assert(error instanceof AccessDenied); assert.equal(error.diagnostic?.upstream_status, 401); return true;
  });
  status = 200;
  for (responseBody of ['invalid JSON private-token', '{"unexpected":"private-token"}']) {
    await assert.rejects(oauth.exchange('private-code', secret()), error => {
      assert(error instanceof DependencyUnavailable);
      assert.deepEqual(error.diagnostic, { operation: 'supabase_oauth_token', reason: 'invalid_response' }); return true;
    });
  }
});

test('OAuth HTTP: erro no callback tem request ID nos logs, sem código, estado ou erro bruto', async t => {
  const f = fixture(); const events: unknown[] = [];
  const config = readConfig({ NODE_ENV: 'test', PUBLIC_URL: 'https://mcp.test', OAUTH_ISSUER: 'https://mcp.test', SAAS_API_KEY: 's'.repeat(32),
    SUPABASE_URL: 'https://supabase.test', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test', SESSION_ENCRYPTION_KEY: 'ab'.repeat(32),
    MCP_CURSOR_SECRET: 's'.repeat(32), SUPABASE_OAUTH_CLIENT_ID: randomUUID(), SUPABASE_OAUTH_CLIENT_SECRET: 's'.repeat(32),
    REDIS_URL: 'redis://localhost', ALLOWED_HOSTS: 'mcp.test' });
  let redisFailed = false;
  const limiter = { async consume() { if (redisFailed) throw new Error('private-redis-url'); return { allowed: true, retryAfter: 60 }; }, async ready() { return true; } };
  const app = createApp(config, { gateway: f.broker, limiter, oauthRouter: createOAuthRouter(config, f.broker, limiter, e => events.push(e)) }, () => {});
  const http = app.listen(0, '127.0.0.1'); await once(http, 'listening');
  t.after(() => { http.closeAllConnections(); http.close(); });
  const address = http.address(); assert(address && typeof address !== 'string');
  config.allowedHosts.push(`127.0.0.1:${address.port}`);
  const client = await f.broker.register('Claude', [redirect]);
  const begin = async () => {
    const browser = secret();
    const url = new URL(await f.broker.authorize({ client_id: client.client_id, redirect_uri: redirect, resource, code_challenge: pkce(secret()) }, browser));
    return { state: url.searchParams.get('state')!, browser };
  };
  const call = ({ state, browser }: { state: string; browser: string }) => fetch(`http://127.0.0.1:${address.port}/oauth/supabase/callback?` + new URLSearchParams({ state, code: 'private-code' }),
    { redirect: 'manual', headers: { cookie: `mcp-oauth=${browser}` } });
  const flow = await begin();
  f.upstream.exchange = async () => { throw new DependencyUnavailable({ operation: 'supabase_identity', reason: 'http_error', upstream_status: 404 }); };
  const response = await call(flow);
  assert.equal(response.status, 503); assert.deepEqual(await response.json(), { error: 'temporarily_unavailable' });
  assert.deepEqual(events.pop(), { event: 'oauth_failure', request_id: response.headers.get('x-request-id'),
    operation: 'supabase_identity', reason: 'http_error', upstream_status: 404 });
  // Consumed authorization requests cannot be replayed after a failed exchange.
  assert.equal((await call(flow)).status, 400);
  const storeFlow = await begin();
  f.store.get = async () => { throw new Error('private-ciphertext-and-redis-url'); };
  const storage = await call(storeFlow); assert.equal(storage.status, 503);
  assert.deepEqual(events.pop(), { event: 'oauth_failure', request_id: storage.headers.get('x-request-id'), operation: 'oauth_request_read', reason: 'storage_error' });
  redisFailed = true;
  const limited = await call(flow); assert.equal(limited.status, 503);
  assert.deepEqual(events.pop(), { event: 'oauth_failure', request_id: limited.headers.get('x-request-id'), operation: 'oauth_rate_limit', reason: 'storage_error' });
});

test('Redis real OAuth: CAS entre réplicas, criptografia e transação com índices', { skip: !process.env.TEST_REDIS_URL }, async t => {
  const redis = createClient({ url: process.env.TEST_REDIS_URL }); redis.on('error', () => {}); await redis.connect();
  t.after(() => { redis.destroy(); }); const prefix = `test:oauth:${randomUUID()}:`;
  const a = new RedisOAuthStore(redis, 'ab'.repeat(32), prefix); const b = new RedisOAuthStore(redis, 'ab'.repeat(32), prefix);
  assert(await a.commit('grant', null, { refresh: 'very-private' }, 60));
  const raw = await redis.get(prefix + 'grant'); assert(raw && !raw.includes('very-private'));
  const record = await b.get('grant'); assert(record);
  const results = await Promise.all([a, b].map((store, i) => store.commit('grant', record.version, { rotated: i }, 60, [{ key: `index-${i}`, value: { i }, ttl: 60 }])));
  assert.equal(results.filter(Boolean).length, 1);
  const winner = results.findIndex(Boolean); assert(await a.get(`index-${winner}`)); assert.equal(await a.get(`index-${1 - winner}`), null);
  await redis.set(prefix + 'copied', raw, { EX: 60 }); await assert.rejects(a.get('copied'));
  // Full grant refresh across two brokers sharing this Redis store.
  const f = fixture(a); const connection = await f.connect(0);
  const replica = new OAuthBroker(b, f.upstream, f.api, new CursorCodec('c'.repeat(32)), f.options);
  const next = await replica.refresh(connection.tokens.refresh_token, connection.client.client_id);
  assert.equal((await f.broker.authenticate(next.access_token, resource))?.user_id, f.users[0]);
  await f.broker.revoke(next.refresh_token, connection.client.client_id); assert.equal(await replica.authenticate(next.access_token, resource), null);
  for await (const keys of redis.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 })) { if (keys.length) await redis.del(keys); }
});
