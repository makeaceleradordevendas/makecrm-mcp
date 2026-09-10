import { z } from 'zod';
import type { ReadToolName } from './tools/read-catalog.js';

export const scopes = ['contacts:read', 'opportunities:read', 'conversations:read', 'catalog:read', 'contacts:context:read'] as const;
export const scopeSchema = z.enum(scopes);
export type Scope = z.infer<typeof scopeSchema>;
export const principalSchema = z.object({
  active: z.literal(true),
  credential_id: z.string().uuid(),
  user_id: z.string().uuid(),
  company_id: z.string().uuid(),
  scopes: z.array(scopeSchema).min(1),
  resource: z.string().url(),
  expires_at: z.number().int().positive(),
}).strict();
export type Principal = Readonly<z.infer<typeof principalSchema>>;
export const querySchema = z.object({
  query: z.string().trim().max(200).optional(),
  cursor: z.string().max(512).optional(),
  limit: z.number().int().min(1).max(100).default(25),
}).strict();
export type ReadQuery = z.infer<typeof querySchema>;
export type Collection = 'contacts' | 'opportunities' | 'conversations';

export interface SaasGateway {
  authenticate(token: string, resource: string): Promise<Principal | null>;
  read(collection: Collection, principal: Principal, query: ReadQuery, signal?: AbortSignal): Promise<Record<string, unknown>>;
  executeRead?(name: ReadToolName, principal: Principal, input: unknown, signal?: AbortSignal): Promise<Record<string, unknown>>;
}

export type DependencyDiagnostic = {
  operation: 'supabase_oauth_token' | 'supabase_user' | 'supabase_identity' | 'supabase_read'
    | 'oauth_request_read' | 'oauth_request_consume' | 'oauth_consent_save';
  reason: 'http_error' | 'invalid_response' | 'timeout' | 'network_error' | 'storage_error';
  upstream_status?: number;
};
export class DependencyUnavailable extends Error {
  constructor(readonly diagnostic?: DependencyDiagnostic) { super('Dependency unavailable'); }
}
export class AccessDenied extends Error {
  constructor(readonly diagnostic?: DependencyDiagnostic) { super('Access denied'); }
}

export interface RateLimiter {
  consume(key: string, limit: number): Promise<{ allowed: boolean; retryAfter: number }>;
  ready(): Promise<boolean>;
}
