import { AccessDenied, DependencyUnavailable, principalSchema, type Collection, type Principal, type ReadQuery, type SaasGateway } from './contracts.js';

// Este contrato é uma API interna proposta, não presume rotas existentes do SaaS.
export class HttpSaasGateway implements SaasGateway {
  constructor(private readonly options: {
    baseUrl: string; apiKey: string; timeoutMs: number; maxResponseBytes: number;
  }) {}

  private async request(path: string, body: unknown, signal?: AbortSignal): Promise<unknown> {
    const timeout = AbortSignal.timeout(this.options.timeoutMs);
    try {
      const response = await fetch(new URL(path, this.options.baseUrl.endsWith('/') ? this.options.baseUrl : `${this.options.baseUrl}/`), {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.options.apiKey}` },
        body: JSON.stringify(body),
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        redirect: 'error',
      });
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 403) throw new AccessDenied();
        throw new DependencyUnavailable();
      }
      const reader = response.body?.getReader();
      if (!reader) throw new DependencyUnavailable();
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > this.options.maxResponseBytes) {
          await reader.cancel();
          throw new DependencyUnavailable();
        }
        chunks.push(value);
      }
      return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
    } catch (error) {
      if (error instanceof AccessDenied) throw error;
      throw new DependencyUnavailable();
    }
  }

  async authenticate(token: string, resource: string): Promise<Principal | null> {
    // O token só vai para o endpoint de validação de credenciais, nunca para uma API de dados.
    const data = await this.request('introspect', { token, resource });
    if (typeof data === 'object' && data !== null && 'active' in data && data.active === false) return null;
    const result = principalSchema.safeParse(data);
    if (!result.success) throw new DependencyUnavailable();
    if (result.data.resource !== resource || result.data.expires_at <= Math.floor(Date.now() / 1000)) return null;
    return Object.freeze({ ...result.data, scopes: Object.freeze([...result.data.scopes]) as unknown as Principal['scopes'] });
  }

  async read(collection: Collection, principal: Principal, query: ReadQuery, signal?: AbortSignal) {
    const data = await this.request(`read/${collection}`, {
      ...query,
      // Identidade definida pelo servidor, fora dos argumentos controlados pela IA.
      context: { credential_id: principal.credential_id, user_id: principal.user_id, company_id: principal.company_id },
    }, signal);
    if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new DependencyUnavailable();
    const result = data as Record<string, unknown>;
    if (!Array.isArray(result.items) || result.items.length > query.limit ||
      !(result.next_cursor === null || typeof result.next_cursor === 'string') ||
      (typeof result.next_cursor === 'string' && result.next_cursor.length > 512)) throw new DependencyUnavailable();
    return { items: result.items, next_cursor: result.next_cursor };
  }
}
