import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { AccessDenied, DependencyUnavailable, scopes, type Collection, type Principal, type ReadQuery, type SaasGateway, type Scope } from '../contracts.js';
import { SupabaseUserApi } from '../api/supabase.js';
import { CursorCodec } from '../api/cursor.js';
import type { OAuthStore, Stored, Write } from './store.js';
import type { OAuthUpstream, UpstreamSession } from './upstream.js';
import { readTool, type ReadToolName } from '../tools/read-catalog.js';

export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const pkce = (value: string) => createHash('sha256').update(value).digest('base64url');
export const secret = () => randomBytes(32).toString('base64url');
const equal = (a: string, b: string) => timingSafeEqual(Buffer.from(digest(a), 'hex'), Buffer.from(digest(b), 'hex'));
const now = () => Math.floor(Date.now() / 1000);
export class OAuthError extends Error {
  constructor(readonly code: string, readonly status = 400) { super(code); }
}
type Client = { client_id: string; client_name: string; redirect_uris: string[]; token_endpoint_auth_method: 'none'; grant_types: string[]; response_types: string[] };
export type Authorization = { client_id: string; redirect_uri: string; code_challenge: string; resource: string; scope?: string; state?: string };
type Request = Authorization & { scopes: Scope[]; client_name: string; browser_hash: string; verifier: string };
type Consent = { request: Request; session: UpstreamSession; csrf: string };
type Grant = { id: string; user_id: string; company_id: string; client_id: string; client_name: string; scopes: Scope[]; resource: string;
  session: UpstreamSession; refresh_hash: string; created_at: number; expires_at: number; refreshing?: { id: string; deadline: number } };
type Code = { grant_id: string; client_id: string; redirect_uri: string; challenge: string; resource: string };
type TokenIndex = { grant_id: string; client_id: string; expires_at: number };
type UserIndex = { ids: { id: string; expires_at: number }[] };
export type BrokerOptions = { resource: string; allowedRedirects: string[]; accessSeconds: number; connectionSeconds: number };

export class OAuthBroker implements SaasGateway {
  constructor(readonly store: OAuthStore, private readonly upstream: OAuthUpstream, readonly api: SupabaseUserApi,
    private readonly cursors: CursorCodec, readonly options: BrokerOptions) {}

  async register(name: string, redirects: string[]) {
    if (!redirects.length || redirects.some(uri => !this.options.allowedRedirects.includes(uri))) throw new OAuthError('invalid_redirect_uri');
    const client: Client = { client_id: randomUUID(), client_name: name, redirect_uris: [...new Set(redirects)],
      token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'] };
    if (!await this.store.commit(`client:${client.client_id}`, null, client, 365 * 86400)) throw new DependencyUnavailable();
    return client;
  }
  async authorize(input: Authorization, browserSecret: string) {
    const client = await this.store.get<Client>(`client:${input.client_id}`);
    if (!client || !client.value.redirect_uris.includes(input.redirect_uri) || !this.options.allowedRedirects.includes(input.redirect_uri)) throw new OAuthError('invalid_client');
    if (input.resource !== this.options.resource) throw new OAuthError('invalid_target');
    const requested = [...new Set((input.scope ?? scopes.join(' ')).split(' ').filter(Boolean))];
    if (!requested.length || requested.some(s => !scopes.includes(s as Scope))) throw new OAuthError('invalid_scope');
    const state = secret(); const verifier = secret();
    const request: Request = { ...input, scopes: requested as Scope[], client_name: client.value.client_name, browser_hash: digest(browserSecret), verifier };
    if (!await this.store.commit(`request:${digest(state)}`, null, request, 600)) throw new DependencyUnavailable();
    return this.upstream.authorize(state, pkce(verifier));
  }
  async callback(state: string, code: string | undefined, browserSecret: string) {
    const key = `request:${digest(state)}`;
    const request = await this.store.get<Request>(key).catch(() => {
      throw new DependencyUnavailable({ operation: 'oauth_request_read', reason: 'storage_error' });
    });
    if (!request || !equal(request.value.browser_hash, digest(browserSecret))) throw new OAuthError('invalid_request');
    if (!await this.store.commit(key, request.version, null, 1).catch(() => {
      throw new DependencyUnavailable({ operation: 'oauth_request_consume', reason: 'storage_error' });
    })) throw new OAuthError('invalid_grant');
    if (!code) return { redirect: this.redirect(request.value, { error: 'access_denied' }) };
    const session = await this.upstream.exchange(code, request.value.verifier);
    const consentId = secret();
    const consent: Consent = { request: request.value, session, csrf: secret() };
    if (!await this.store.commit(`consent:${digest(consentId)}`, null, consent, 300).catch(() => {
      throw new DependencyUnavailable({ operation: 'oauth_consent_save', reason: 'storage_error' });
    })) throw new DependencyUnavailable({ operation: 'oauth_consent_save', reason: 'storage_error' });
    return { consentId };
  }
  async consent(id: string, browserSecret: string) {
    const record = await this.store.get<Consent>(`consent:${digest(id)}`);
    if (!record || !equal(record.value.request.browser_hash, digest(browserSecret))) throw new OAuthError('invalid_request');
    return record;
  }
  async decide(id: string, csrf: string, browserSecret: string, approve: boolean) {
    const record = await this.consent(id, browserSecret);
    if (!equal(record.value.csrf, csrf)) throw new OAuthError('invalid_request');
    if (!await this.store.commit(`consent:${digest(id)}`, record.version, null, 1)) throw new OAuthError('invalid_grant');
    const { request, session } = record.value;
    if (!approve) return this.redirect(request, { error: 'access_denied' });
    const identity = await this.api.identity(session.access_token);
    if (identity.user_id !== session.user_id || identity.company_id !== session.company_id) throw new AccessDenied();
    const grant: Grant = { id: randomUUID(), user_id: session.user_id, company_id: session.company_id, client_id: request.client_id,
      client_name: request.client_name, scopes: request.scopes, resource: request.resource, session, refresh_hash: '', created_at: now(), expires_at: now() + this.options.connectionSeconds };
    const code = secret();
    const codeRecord: Code = { grant_id: grant.id, client_id: request.client_id, redirect_uri: request.redirect_uri, challenge: request.code_challenge, resource: request.resource };
    // Index limit, grant and authorization code are committed together across replicas.
    const indexKey = `user:${digest(grant.user_id)}`;
    for (let attempt = 0; attempt < 5; attempt++) {
      const index = await this.store.get<UserIndex>(indexKey);
      const candidates = (index?.value.ids ?? []).filter(item => item.expires_at > now());
      const active = await Promise.all(candidates.map(item => this.store.get<Grant>(`grant:${item.id}`)));
      const ids = candidates.filter((_, i) => active[i] !== null);
      if (ids.length >= 10) throw new OAuthError('connection_limit', 409);
      ids.push({ id: grant.id, expires_at: grant.expires_at });
      const indexTtl = Math.max(1, ...ids.map(item => item.expires_at - now()));
      if (await this.store.commit(indexKey, index?.version ?? null, { ids }, indexTtl, [
        { key: `grant:${grant.id}`, value: grant, ttl: 120 },
        { key: `code:${digest(code)}`, value: codeRecord, ttl: 120 },
      ])) return this.redirect(request, { code });
    }
    throw new DependencyUnavailable();
  }
  private redirect(request: Authorization, fields: Record<string, string>) {
    const uri = new URL(request.redirect_uri);
    uri.searchParams.set('iss', new URL(this.options.resource).origin);
    for (const [key, value] of Object.entries(fields)) uri.searchParams.set(key, value);
    if (request.state !== undefined) uri.searchParams.set('state', request.state);
    return uri.href;
  }
  async exchange(code: string, clientId: string, redirect: string, verifier: string, resource: string) {
    const key = `code:${digest(code)}`;
    const record = await this.store.get<Code & { used?: boolean }>(key);
    const c = record?.value;
    if (!record || !c || c.client_id !== clientId || c.redirect_uri !== redirect || c.resource !== resource || !equal(c.challenge, pkce(verifier))) throw new OAuthError('invalid_grant');
    if (c.used) { await this.revokeGrant(c.grant_id); throw new OAuthError('invalid_grant'); }
    if (!await this.store.commit(key, record.version, { ...c, used: true }, 120)) throw new OAuthError('invalid_grant');
    const grant = await this.store.get<Grant>(`grant:${c.grant_id}`);
    if (!grant || grant.value.expires_at <= now()) throw new OAuthError('invalid_grant');
    return this.tokens(grant);
  }
  private async tokens(record: Stored<Grant>) {
    const grant = record.value;
    const ttl = grant.expires_at - now(); if (ttl < 1) throw new OAuthError('invalid_grant');
    const accessToken = randomUUID(); const refreshToken = secret();
    const accessTtl = Math.min(this.options.accessSeconds, ttl);
    const next = { ...grant, refreshing: undefined, refresh_hash: digest(refreshToken) };
    const index = (expiry: number): TokenIndex => ({ grant_id: grant.id, client_id: grant.client_id, expires_at: expiry });
    const writes: Write[] = [
      { key: `access:${digest(accessToken)}`, value: index(now() + accessTtl), ttl: accessTtl },
      { key: `refresh:${digest(refreshToken)}`, value: index(grant.expires_at), ttl },
    ];
    if (!await this.store.commit(`grant:${grant.id}`, record.version, next, ttl, writes)) throw new OAuthError('invalid_grant');
    return { access_token: accessToken, token_type: 'Bearer', expires_in: accessTtl, refresh_token: refreshToken, scope: grant.scopes.join(' ') };
  }
  async refresh(token: string, clientId: string, resource?: string, scope?: string) {
    const index = await this.store.get<TokenIndex>(`refresh:${digest(token)}`);
    if (!index || index.value.client_id !== clientId || index.value.expires_at <= now()) throw new OAuthError('invalid_grant');
    const record = await this.store.get<Grant>(`grant:${index.value.grant_id}`);
    if (!record || record.value.client_id !== clientId || record.value.expires_at <= now()) throw new OAuthError('invalid_grant');
    if (resource !== undefined && resource !== record.value.resource) throw new OAuthError('invalid_target');
    if (scope !== undefined && scope !== record.value.scopes.join(' ')) throw new OAuthError('invalid_scope');
    if (!equal(record.value.refresh_hash, digest(token))) {
      await this.revokeGrant(record.value.id); throw new OAuthError('invalid_grant');
    }
    const locked = await this.lock(record);
    try {
      const session = locked.value.session.expires_at <= now() + 60 ? await this.upstream.refresh(locked.value.session) : locked.value.session;
      const identity = await this.api.identity(session.access_token);
      if (session.user_id !== locked.value.user_id || session.company_id !== locked.value.company_id || identity.user_id !== locked.value.user_id || identity.company_id !== locked.value.company_id) throw new AccessDenied();
      return await this.tokens({ ...locked, value: { ...locked.value, session } });
    } catch (error) { await this.removeLocked(locked); throw error; }
  }
  private async lock(record: Stored<Grant>): Promise<Stored<Grant>> {
    if (record.value.refreshing) {
      if (record.value.refreshing.deadline <= now()) { await this.removeLocked(record); throw new AccessDenied(); }
      throw new DependencyUnavailable();
    }
    const marker = randomUUID();
    const next = { ...record.value, refreshing: { id: marker, deadline: now() + 60 } };
    if (!await this.store.commit(`grant:${next.id}`, record.version, next, Math.max(1, next.expires_at - now()))) throw new DependencyUnavailable();
    const locked = await this.store.get<Grant>(`grant:${next.id}`);
    if (!locked || locked.value.refreshing?.id !== marker) throw new AccessDenied();
    return locked;
  }
  private async removeLocked(record: Stored<Grant>) {
    await this.store.commit(`grant:${record.value.id}`, record.version, null, 1);
  }
  private async liveGrant(id: string): Promise<Grant | null> {
    const record = await this.store.get<Grant>(`grant:${id}`);
    if (!record || record.value.expires_at <= now()) return null;
    if (record.value.refreshing) {
      if (record.value.refreshing.deadline <= now()) { await this.removeLocked(record); return null; }
      throw new DependencyUnavailable();
    }
    if (record.value.session.expires_at > now() + 60) return record.value;
    const locked = await this.lock(record);
    try {
      const session = await this.upstream.refresh(locked.value.session);
      if (session.user_id !== locked.value.user_id || session.company_id !== locked.value.company_id) throw new AccessDenied();
      const next = { ...locked.value, session, refreshing: undefined };
      if (!await this.store.commit(`grant:${id}`, locked.version, next, Math.max(1, next.expires_at - now()))) throw new AccessDenied();
      return next;
    } catch (error) { await this.removeLocked(locked); throw error; }
  }
  async authenticate(token: string, resource: string): Promise<Principal | null> {
    if (resource !== this.options.resource) return null;
    const index = await this.store.get<TokenIndex>(`access:${digest(token)}`);
    if (!index || index.value.expires_at <= now()) return null;
    try {
      const grant = await this.liveGrant(index.value.grant_id);
      if (!grant || grant.resource !== resource || grant.client_id !== index.value.client_id) return null;
      const identity = await this.api.identity(grant.session.access_token);
      if (identity.user_id !== grant.user_id || identity.company_id !== grant.company_id) return null;
      return Object.freeze({ active: true, credential_id: grant.id, user_id: grant.user_id, company_id: grant.company_id,
        resource, scopes: [...grant.scopes], expires_at: Math.min(index.value.expires_at, grant.expires_at) });
    } catch (error) { if (error instanceof AccessDenied) return null; throw error; }
  }
  async read(collection: Collection, principal: Principal, query: ReadQuery, signal?: AbortSignal) {
    const grant = await this.liveGrant(principal.credential_id);
    if (!grant || principal.expires_at <= now() || grant.user_id !== principal.user_id || grant.company_id !== principal.company_id ||
      grant.resource !== this.options.resource || principal.resource !== grant.resource || !grant.scopes.includes(`${collection}:read` as Scope)) throw new AccessDenied();
    const after = this.cursors.decode(query.cursor, collection, principal, query);
    const result = await this.api.read(grant.session.access_token, grant.company_id, collection, query, after, signal);
    return { items: result.items, next_cursor: result.next_position ? this.cursors.encode(result.next_position, collection, principal, query) : null };
  }
  async executeRead(name: ReadToolName, principal: Principal, input: unknown, signal?: AbortSignal) {
    const tool = readTool(name);
    const args = tool.schema.parse(input);
    const grant = await this.liveGrant(principal.credential_id);
    if (!grant || principal.expires_at <= now() || grant.user_id !== principal.user_id || grant.company_id !== principal.company_id ||
      grant.resource !== this.options.resource || principal.resource !== grant.resource ||
      !principal.scopes.includes(tool.scope) || !grant.scopes.includes(tool.scope)) throw new AccessDenied();
    const identity = await this.api.identity(grant.session.access_token, signal);
    if (identity.user_id !== grant.user_id || identity.company_id !== grant.company_id) throw new AccessDenied();
    return this.api.executeRead(grant.session.access_token, identity, name, args, signal);
  }
  async revoke(token: string, clientId: string) {
    const index = await this.store.get<TokenIndex>(`refresh:${digest(token)}`) ?? await this.store.get<TokenIndex>(`access:${digest(token)}`);
    if (index?.value.client_id === clientId) await this.revokeGrant(index.value.grant_id);
  }
  async revokeGrant(id: string, userId?: string) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const record = await this.store.get<Grant>(`grant:${id}`);
      if (!record || (userId !== undefined && record.value.user_id !== userId)) return;
      if (await this.store.commit(`grant:${id}`, record.version, null, 1)) return;
    }
    throw new DependencyUnavailable();
  }
  async list(userId: string) {
    const index = await this.store.get<UserIndex>(`user:${digest(userId)}`);
    const grants = await Promise.all((index?.value.ids ?? []).filter(x => x.expires_at > now()).map(x => this.store.get<Grant>(`grant:${x.id}`)));
    return grants.flatMap(r => r && r.value.user_id === userId && r.value.expires_at > now() ? [{ id: r.value.id, client_name: r.value.client_name,
      scopes: r.value.scopes, created_at: r.value.created_at, expires_at: r.value.expires_at }] : []);
  }
}
