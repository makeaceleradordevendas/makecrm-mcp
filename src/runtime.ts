import { createClient } from 'redis';
import { createApp } from './create-app.js';
import { readConfig } from './config.js';
import { HttpSaasGateway } from './gateway.js';
import { RedisRateLimiter } from './rate-limit.js';
import { SupabaseUserApi } from './api/supabase.js';
import { RedisSessionStore, SessionCipher } from './api/sessions.js';
import { CursorCodec } from './api/cursor.js';
import { RlsSaasGateway } from './api/rls-gateway.js';
import { createApiRouter } from './api/router.js';
import { RedisOAuthStore } from './oauth/store.js';
import { SupabaseOAuth } from './oauth/upstream.js';
import { OAuthBroker } from './oauth/broker.js';
import { createOAuthRouter } from './oauth/router.js';

export function createRuntime() {
  const config = readConfig(process.env);
  const redis = createClient({ url: config.REDIS_URL, disableOfflineQueue: true,
    socket: { connectTimeout: 2000, reconnectStrategy: retries => Math.min(100 * 2 ** Math.min(retries, 5), 3000) },
  });
  redis.on('error', () => console.error(JSON.stringify({ event: 'redis_unavailable' })));
  // Uma conexão compartilhada por instância. Sem estado de autenticação em memória.
  const connecting = redis.connect();
  void connecting.catch(() => console.error(JSON.stringify({ event: 'redis_connection_failed' })));
  const limiter = new RedisRateLimiter(redis, connecting);
  if (config.SUPABASE_URL) {
    const api = new SupabaseUserApi({ url: config.SUPABASE_URL, publishableKey: config.SUPABASE_PUBLISHABLE_KEY!,
      timeoutMs: config.API_TIMEOUT_MS, maxResponseBytes: config.MAX_API_RESPONSE_BYTES,
      timeZone: config.MCP_TIME_ZONE, pipelineRpcDateShiftMinutes: config.PIPELINE_RPC_DATE_SHIFT_MINUTES });
    if (config.AUTH_MODE === 'oauth') {
      const upstream = new SupabaseOAuth({ url: config.SUPABASE_URL, clientId: config.SUPABASE_OAUTH_CLIENT_ID!,
        clientSecret: config.SUPABASE_OAUTH_CLIENT_SECRET!, callback: `${config.publicOrigin}/oauth/supabase/callback`, timeoutMs: config.API_TIMEOUT_MS }, api);
      const gateway = new OAuthBroker(new RedisOAuthStore(redis, config.SESSION_ENCRYPTION_KEY!), upstream, api,
        new CursorCodec(config.MCP_CURSOR_SECRET!), { resource: config.resource, allowedRedirects: config.oauthRedirects,
          accessSeconds: config.OAUTH_ACCESS_TOKEN_SECONDS, connectionSeconds: config.OAUTH_CONNECTION_SECONDS });
      return { config, redis, app: createApp(config, { limiter, gateway, oauthRouter: createOAuthRouter(config, gateway, limiter) }) };
    }
    const sessions = new RedisSessionStore(redis, new SessionCipher(config.SESSION_ENCRYPTION_KEY!));
    const gateway = new RlsSaasGateway(sessions, api, new CursorCodec(config.MCP_CURSOR_SECRET!), config.resource);
    return { config, redis, app: createApp(config, { limiter, gateway, apiRouter: createApiRouter(gateway, limiter, config.SAAS_API_KEY) }) };
  }
  const gateway = new HttpSaasGateway({ baseUrl: config.SAAS_API_URL!, apiKey: config.SAAS_API_KEY,
    timeoutMs: config.API_TIMEOUT_MS, maxResponseBytes: config.MAX_API_RESPONSE_BYTES });
  return { config, redis, app: createApp(config, { limiter, gateway }) };
}
