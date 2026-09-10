import { z } from 'zod';
import { AccessDenied, DependencyUnavailable, type Collection, type ReadQuery, type Principal } from '../contracts.js';
import { prepareRead, type ReadToolName, type DateOptions } from '../tools/read-catalog.js';
import { positionSchema, type Position } from './cursor.js';

const identitySchema = z.object({ user_id: z.string().uuid(), company_id: z.string().uuid() }).strict();
const pageSchema = z.object({ items: z.array(z.record(z.unknown())).max(100), next_position: positionSchema.nullable() }).strict();
const claimsSchema = z.object({ sub: z.string().uuid(), exp: z.number().int().positive(), role: z.literal('authenticated'), client_id: z.unknown().optional() });

export class SupabaseUserApi {
  constructor(private readonly options: { url: string; publishableKey: string; timeoutMs: number; maxResponseBytes: number } & Omit<DateOptions, 'now'>) {
    if (options.publishableKey.startsWith('sb_secret_')) throw new Error('Use a publishable/anon key, never a Supabase secret key');
    // Impedir também a chave legada service_role por engano.
    const payload = options.publishableKey.split('.')[1];
    if (payload) {
      try { if (JSON.parse(Buffer.from(payload, 'base64url').toString()).role === 'service_role') throw new AccessDenied(); }
      catch (error) { if (error instanceof AccessDenied) throw new Error('service_role is not allowed'); }
    }
  }
  private async request(path: string, userJwt: string, body?: unknown, signal?: AbortSignal): Promise<unknown> {
    const operation = path === '/auth/v1/user' ? 'supabase_user' : path === '/rest/v1/rpc/mcp_identity' ? 'supabase_identity' : 'supabase_read';
    try {
      const timeout = AbortSignal.timeout(this.options.timeoutMs);
      const response = await fetch(new URL(path, this.options.url), {
        method: body === undefined ? 'GET' : 'POST',
        headers: { apikey: this.options.publishableKey, authorization: `Bearer ${userJwt}`, 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: 'error', signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
      if (!response.ok) {
        await response.body?.cancel();
        const diagnostic = { operation, reason: 'http_error', upstream_status: response.status } as const;
        if (response.status === 401 || response.status === 403) throw new AccessDenied(diagnostic);
        throw new DependencyUnavailable(diagnostic);
      }
      const reader = response.body?.getReader();
      if (!reader) throw new DependencyUnavailable({ operation, reason: 'invalid_response' });
      let size = 0;
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > this.options.maxResponseBytes) { await reader.cancel(); throw new DependencyUnavailable({ operation, reason: 'invalid_response' }); }
        chunks.push(value);
      }
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch (error) {
      if (error instanceof AccessDenied || error instanceof DependencyUnavailable) throw error;
      throw new DependencyUnavailable({ operation, reason: error instanceof SyntaxError ? 'invalid_response'
        : error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'network_error' });
    }
  }
  async validateLogin(userJwt: string) {
    return this.validateSession(userJwt);
  }
  async validateOAuth(userJwt: string, clientId: string) {
    return this.validateSession(userJwt, clientId);
  }
  private async validateSession(userJwt: string, clientId?: string) {
    // O filtro local só rejeita formatos inadequados; não autentica o usuário.
    // Em particular, um UUID MCP não deve ser repassado ao Supabase Auth.
    let claims: z.infer<typeof claimsSchema>;
    try {
      if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(userJwt)) throw new AccessDenied();
      claims = claimsSchema.parse(JSON.parse(Buffer.from(userJwt.split('.')[1] ?? '', 'base64url').toString()));
    }
    catch { throw new AccessDenied(); }
    if (claims.exp <= Date.now() / 1000 || (clientId ? claims.client_id !== clientId : claims.client_id !== undefined)) throw new AccessDenied();
    if (clientId) {
      const raw = JSON.parse(Buffer.from(userJwt.split('.')[1]!, 'base64url').toString());
      if (raw.iss !== new URL('/auth/v1', this.options.url).href || raw.aud !== 'authenticated') throw new AccessDenied();
    }
    // Só a validação no Auth autoriza a sessão, inclusive assinatura e emissor.
    const user = z.object({ id: z.string().uuid(), email: z.string().optional(), is_anonymous: z.boolean().optional() })
      .safeParse(await this.request('/auth/v1/user', userJwt));
    if (!user.success || user.data.is_anonymous || claims.sub !== user.data.id) throw new AccessDenied();
    return { userId: user.data.id, expiresAt: claims.exp, ...(user.data.email ? { email: user.data.email } : {}) };
  }
  async identity(userJwt: string, signal?: AbortSignal) {
    const result = identitySchema.safeParse(await this.request('/rest/v1/rpc/mcp_identity', userJwt, {}, signal));
    if (!result.success) throw new DependencyUnavailable({ operation: 'supabase_identity', reason: 'invalid_response' });
    return result.data;
  }
  async executeRead(userJwt: string, identity: Pick<Principal, 'company_id' | 'user_id'>, name: ReadToolName, input: unknown, signal?: AbortSignal): Promise<Record<string, unknown>> {
    const request = prepareRead(name, input, identity, this.options);
    const data = await this.request(request.path, userJwt, request.body, signal);
    const invalid = () => new DependencyUnavailable({ operation: 'supabase_read', reason: 'invalid_response' });
    if (request.kind === 'table') {
      const rows = z.array(z.record(z.unknown())).max(request.limit! + 1).safeParse(data);
      if (!rows.success || rows.data.some(row => row.company_id !== identity.company_id)) throw invalid();
      const more = rows.data.length > request.limit!;
      return { items: rows.data.slice(0, request.limit), next_offset: more && request.offset! + request.limit! <= 10000 ? request.offset! + request.limit! : null,
        pagination_limit_reached: more && request.offset! + request.limit! > 10000 };
    }
    if (request.kind === 'page') {
      const result = z.object({ data: z.array(z.record(z.unknown())).max(request.limit!) }).passthrough().safeParse(data);
      if (!result.success) throw invalid();
      return { ...result.data, ...(request.date_filter ? { date_filter: request.date_filter } : {}) };
    }
    // Existing RPCs have heterogeneous result shapes. Bound response bytes in request()
    // and retain their JSON structure, without inventing fields or forwarding raw errors.
    if (data !== null && (typeof data !== 'object' || (Array.isArray(data) && data.some(row => row === null || typeof row !== 'object' || Array.isArray(row))))) throw invalid();
    return { data, ...(request.date_filter ? { date_filter: request.date_filter } : {}) };
  }
  async read(userJwt: string, companyId: string, collection: Collection, query: ReadQuery, after: Position | null, signal?: AbortSignal) {
    const result = pageSchema.safeParse(await this.request('/rest/v1/rpc/mcp_read_page', userJwt, {
      p_collection: collection, p_company_id: companyId, p_query: query.query ?? '', p_limit: query.limit,
      p_after_created_at: after?.created_at ?? null, p_after_id: after?.id ?? null,
    }, signal));
    if (!result.success || result.data.items.length > query.limit) throw new DependencyUnavailable({ operation: 'supabase_read', reason: 'invalid_response' });
    return result.data;
  }
}
