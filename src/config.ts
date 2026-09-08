import { z } from 'zod';

const integer = (fallback: number, max: number) => z.coerce.number().int().min(1).max(max).default(fallback);
const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: integer(3000, 65535),
  HOST: z.string().default('127.0.0.1'),
  PUBLIC_URL: z.string().url(),
  OAUTH_ISSUER: z.string().url(),
  SAAS_API_URL: z.string().url().optional(),
  SAAS_API_KEY: z.string().min(32),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(16).optional(),
  SESSION_ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/).optional(),
  MCP_CURSOR_SECRET: z.string().min(32).optional(),
  REDIS_URL: z.string().url(),
  ALLOWED_ORIGINS: z.string().default(''),
  ALLOWED_HOSTS: z.string().min(1),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(3).default(0),
  USER_REQUESTS_PER_MINUTE: integer(120, 100000),
  COMPANY_REQUESTS_PER_MINUTE: integer(3000, 1000000),
  IP_REQUESTS_PER_MINUTE: integer(30000, 1000000),
  MAX_INFLIGHT_PER_INSTANCE: integer(200, 10000),
  API_TIMEOUT_MS: integer(8000, 30000),
  MAX_API_RESPONSE_BYTES: integer(1048576, 10485760),
});
export type Config = ReturnType<typeof readConfig>;
export function readConfig(env: NodeJS.ProcessEnv) {
  const c = configSchema.parse(env);
  const publicUrl = new URL(c.PUBLIC_URL);
  if (publicUrl.pathname !== '/' || publicUrl.search || publicUrl.hash || publicUrl.username || publicUrl.password) {
    throw new Error('PUBLIC_URL deve ser uma origem, sem caminho ou credenciais');
  }
  for (const value of [c.PUBLIC_URL, c.OAUTH_ISSUER, c.SAAS_API_URL, c.SUPABASE_URL].filter((v): v is string => Boolean(v))) {
    const url = new URL(value);
    const local = c.NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) {
      throw new Error('URLs precisam de HTTPS; HTTP somente em loopback fora de produção');
    }
  }
  if (!['redis:', 'rediss:'].includes(new URL(c.REDIS_URL).protocol)) throw new Error('REDIS_URL inválida');
  if (c.SUPABASE_URL || c.SUPABASE_PUBLISHABLE_KEY || c.SESSION_ENCRYPTION_KEY || c.MCP_CURSOR_SECRET) {
    if (!c.SUPABASE_URL || !c.SUPABASE_PUBLISHABLE_KEY || !c.SESSION_ENCRYPTION_KEY || !c.MCP_CURSOR_SECRET) {
      throw new Error('Configure URL, publishable key, encryption key e cursor secret para usar a API Supabase');
    }
    if (new URL(c.SUPABASE_URL).pathname !== '/') throw new Error('SUPABASE_URL deve ser a origem do projeto');
  } else if (!c.SAAS_API_URL) throw new Error('Configure Supabase ou SAAS_API_URL');
  if (c.SAAS_API_KEY.startsWith('replace-') || c.SAAS_API_URL?.includes('example.com') || c.OAUTH_ISSUER.includes('example.com')) {
    throw new Error('Configure a API real e o provedor OAuth antes de iniciar');
  }
  return {
    ...c,
    publicOrigin: publicUrl.origin,
    resource: `${publicUrl.origin}/mcp`,
    allowedOrigins: c.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean),
    allowedHosts: c.ALLOWED_HOSTS.split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
  };
}
