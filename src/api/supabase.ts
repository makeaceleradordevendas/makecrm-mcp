import { z } from 'zod';
import { AccessDenied, DependencyUnavailable, type Collection, type ReadQuery } from '../contracts.js';
import { positionSchema, type Position } from './cursor.js';

const identitySchema = z.object({ user_id: z.string().uuid(), company_id: z.string().uuid() }).strict();
const pageSchema = z.object({ items: z.array(z.record(z.unknown())).max(100), next_position: positionSchema.nullable() }).strict();
const claimsSchema = z.object({ sub: z.string().uuid(), exp: z.number().int().positive(), role: z.literal('authenticated'), client_id: z.unknown().optional() });

export class SupabaseUserApi {
  constructor(private readonly options: { url: string; publishableKey: string; timeoutMs: number; maxResponseBytes: number }) {
    if (options.publishableKey.startsWith('sb_secret_')) throw new Error('Use a publishable/anon key, never a Supabase secret key');
    // Impedir também a chave legada service_role por engano.
    const payload = options.publishableKey.split('.')[1];
    if (payload) {
      try { if (JSON.parse(Buffer.from(payload, 'base64url').toString()).role === 'service_role') throw new AccessDenied(); }
      catch (error) { if (error instanceof AccessDenied) throw new Error('service_role is not allowed'); }
    }
  }
  private async request(path: string, userJwt: string, body?: unknown, signal?: AbortSignal): Promise<unknown> {
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
        if (response.status === 401 || response.status === 403) throw new AccessDenied();
        throw new DependencyUnavailable();
      }
      const reader = response.body?.getReader();
      if (!reader) throw new DependencyUnavailable();
      let size = 0;
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > this.options.maxResponseBytes) { await reader.cancel(); throw new DependencyUnavailable(); }
        chunks.push(value);
      }
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch (error) {
      if (error instanceof AccessDenied) throw error;
      throw new DependencyUnavailable();
    }
  }
  async validateLogin(userJwt: string) {
    // O filtro local só rejeita formatos inadequados; não autentica o usuário.
    // Em particular, um UUID MCP não deve ser repassado ao Supabase Auth.
    let claims: z.infer<typeof claimsSchema>;
    try {
      if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(userJwt)) throw new AccessDenied();
      claims = claimsSchema.parse(JSON.parse(Buffer.from(userJwt.split('.')[1] ?? '', 'base64url').toString()));
    }
    catch { throw new AccessDenied(); }
    if (claims.exp <= Date.now() / 1000 || claims.client_id !== undefined) throw new AccessDenied();
    // Só a validação no Auth autoriza a sessão, inclusive assinatura e emissor.
    const user = z.object({ id: z.string().uuid(), is_anonymous: z.boolean().optional() })
      .safeParse(await this.request('/auth/v1/user', userJwt));
    if (!user.success || user.data.is_anonymous || claims.sub !== user.data.id) throw new AccessDenied();
    return { userId: user.data.id, expiresAt: claims.exp };
  }
  async identity(userJwt: string, signal?: AbortSignal) {
    const result = identitySchema.safeParse(await this.request('/rest/v1/rpc/mcp_identity', userJwt, {}, signal));
    if (!result.success) throw new DependencyUnavailable();
    return result.data;
  }
  async read(userJwt: string, companyId: string, collection: Collection, query: ReadQuery, after: Position | null, signal?: AbortSignal) {
    const result = pageSchema.safeParse(await this.request('/rest/v1/rpc/mcp_read_page', userJwt, {
      p_collection: collection, p_company_id: companyId, p_query: query.query ?? '', p_limit: query.limit,
      p_after_created_at: after?.created_at ?? null, p_after_id: after?.id ?? null,
    }, signal));
    if (!result.success || result.data.items.length > query.limit) throw new DependencyUnavailable();
    return result.data;
  }
}
