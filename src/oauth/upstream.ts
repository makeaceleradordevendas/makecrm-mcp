import { z } from 'zod';
import { AccessDenied, DependencyUnavailable } from '../contracts.js';
import { SupabaseUserApi } from '../api/supabase.js';

export type UpstreamSession = { access_token: string; refresh_token: string; expires_at: number; user_id: string; company_id: string; email?: string };
export interface OAuthUpstream {
  authorize(state: string, challenge: string): string;
  exchange(code: string, verifier: string): Promise<UpstreamSession>;
  refresh(session: UpstreamSession): Promise<UpstreamSession>;
}

export class SupabaseOAuth implements OAuthUpstream {
  constructor(private readonly options: { url: string; clientId: string; clientSecret: string; callback: string; timeoutMs: number }, private readonly api: SupabaseUserApi) {}
  authorize(state: string, challenge: string) {
    const url = new URL('/auth/v1/oauth/authorize', this.options.url);
    // OAuth access/refresh tokens suffice: identity is verified via /auth/v1/user.
    // Requesting openid would also require an ID token, which Supabase cannot sign with HS256.
    url.search = new URLSearchParams({ response_type: 'code', client_id: this.options.clientId,
      redirect_uri: this.options.callback, scope: 'email', state, code_challenge: challenge, code_challenge_method: 'S256' }).toString();
    return url.href;
  }
  private async request(fields: Record<string, string>): Promise<UpstreamSession> {
    const operation = 'supabase_oauth_token';
    let body: unknown;
    try {
      const response = await fetch(new URL('/auth/v1/oauth/token', this.options.url), {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(this.options.timeoutMs),
        headers: { 'content-type': 'application/x-www-form-urlencoded', authorization: `Basic ${Buffer.from(`${encodeURIComponent(this.options.clientId)}:${encodeURIComponent(this.options.clientSecret)}`).toString('base64')}` },
        body: new URLSearchParams(fields),
      });
      if (!response.ok) {
        await response.body?.cancel();
        const diagnostic = { operation, reason: 'http_error', upstream_status: response.status } as const;
        if (response.status === 400 || response.status === 401) throw new AccessDenied(diagnostic);
        throw new DependencyUnavailable(diagnostic);
      }
      const reader = response.body?.getReader(); if (!reader) throw new DependencyUnavailable({ operation, reason: 'invalid_response' });
      const chunks: Uint8Array[] = []; let length = 0;
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        length += value.length; if (length > 32768) { await reader.cancel(); throw new DependencyUnavailable({ operation, reason: 'invalid_response' }); }
        chunks.push(value);
      }
      body = JSON.parse(Buffer.concat(chunks).toString());
    } catch (error) {
      if (error instanceof AccessDenied || error instanceof DependencyUnavailable) throw error;
      throw new DependencyUnavailable({ operation, reason: error instanceof SyntaxError ? 'invalid_response'
        : error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'network_error' });
    }
    const tokens = z.object({ access_token: z.string().min(1).max(8192), refresh_token: z.string().min(1).max(8192), token_type: z.string().regex(/^bearer$/i) }).safeParse(body);
    if (!tokens.success) throw new DependencyUnavailable({ operation, reason: 'invalid_response' });
    const verified = await this.api.validateOAuth(tokens.data.access_token, this.options.clientId);
    const identity = await this.api.identity(tokens.data.access_token);
    if (verified.userId !== identity.user_id) throw new AccessDenied();
    return { access_token: tokens.data.access_token, refresh_token: tokens.data.refresh_token, expires_at: verified.expiresAt, ...identity, ...(verified.email ? { email: verified.email } : {}) };
  }
  exchange(code: string, verifier: string) {
    return this.request({ grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: this.options.callback });
  }
  async refresh(session: UpstreamSession) {
    const next = await this.request({ grant_type: 'refresh_token', refresh_token: session.refresh_token });
    if (next.user_id !== session.user_id || next.company_id !== session.company_id) throw new AccessDenied();
    return next;
  }
}
