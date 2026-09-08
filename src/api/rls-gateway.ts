import { randomUUID } from 'node:crypto';
import { AccessDenied, scopes, type Collection, type Principal, type ReadQuery, type SaasGateway, type Scope } from '../contracts.js';
import { issuePersonalToken } from '../tokens.js';
import { CursorCodec } from './cursor.js';
import { type SessionStore, publicCredential } from './sessions.js';
import { SupabaseUserApi } from './supabase.js';

export class RlsSaasGateway implements SaasGateway {
  constructor(readonly sessions: SessionStore, readonly api: SupabaseUserApi, private readonly cursors: CursorCodec, private readonly resource: string) {}

  async issue(userJwt: string, label: string, requestedScopes: Scope[] = [...scopes]) {
    const login = await this.api.validateLogin(userJwt);
    const identity = await this.api.identity(userJwt);
    if (identity.user_id !== login.userId) throw new AccessDenied();
    if (!requestedScopes.length || requestedScopes.some(scope => !scopes.includes(scope))) throw new AccessDenied();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = Math.min(login.expiresAt, now + 3600);
    if (expiresAt - now < 30) throw new AccessDenied();
    const issued = issuePersonalToken();
    const session = {
      principal: { active: true as const, credential_id: randomUUID(), ...identity, scopes: [...new Set(requestedScopes)], resource: this.resource, expires_at: expiresAt },
      token_hash: issued.tokenHash, access_token: userJwt, label, created_at: now,
    };
    await this.sessions.save(session);
    return { token: issued.token, ...publicCredential(session) };
  }

  async authenticate(token: string, resource: string): Promise<Principal | null> {
    if (resource !== this.resource) return null;
    const session = await this.sessions.byToken(token);
    if (!session || session.principal.resource !== resource || session.principal.expires_at <= Date.now() / 1000) return null;
    try {
      // A API executa com JWT de usuário: valida token, vínculo ativo e RLS atuais.
      const identity = await this.api.identity(session.access_token);
      if (identity.user_id !== session.principal.user_id || identity.company_id !== session.principal.company_id) return null;
      return Object.freeze({ ...session.principal, scopes: [...session.principal.scopes] });
    } catch (error) {
      if (error instanceof AccessDenied) return null;
      throw error;
    }
  }

  async read(collection: Collection, principal: Principal, query: ReadQuery, signal?: AbortSignal) {
    return this.readContext(collection, principal, query, signal);
  }

  async readContext(collection: Collection, context: Pick<Principal, 'credential_id' | 'user_id' | 'company_id'>, query: ReadQuery, signal?: AbortSignal) {
    const session = await this.sessions.byId(context.credential_id);
    const p = session?.principal;
    if (!session || !p || p.expires_at <= Date.now() / 1000 || p.resource !== this.resource ||
      p.user_id !== context.user_id || p.company_id !== context.company_id || !p.scopes.includes(`${collection}:read` as Scope)) throw new AccessDenied();
    const after = this.cursors.decode(query.cursor, collection, p, query);
    // O JWT do Supabase pertence ao usuário; o UUID recebido do MCP nunca é enviado ao banco.
    const result = await this.api.read(session.access_token, p.company_id, collection, query, after, signal);
    return { items: result.items, next_cursor: result.next_position ? this.cursors.encode(result.next_position, collection, p, query) : null };
  }
}
