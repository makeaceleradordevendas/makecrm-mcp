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
      timeoutMs: config.API_TIMEOUT_MS, maxResponseBytes: config.MAX_API_RESPONSE_BYTES });
    const sessions = new RedisSessionStore(redis, new SessionCipher(config.SESSION_ENCRYPTION_KEY!));
    const gateway = new RlsSaasGateway(sessions, api, new CursorCodec(config.MCP_CURSOR_SECRET!), config.resource);
    return { config, redis, app: createApp(config, { limiter, gateway, apiRouter: createApiRouter(gateway, limiter, config.SAAS_API_KEY) }) };
  }
  const gateway = new HttpSaasGateway({ baseUrl: config.SAAS_API_URL!, apiKey: config.SAAS_API_KEY,
    timeoutMs: config.API_TIMEOUT_MS, maxResponseBytes: config.MAX_API_RESPONSE_BYTES });
  return { config, redis, app: createApp(config, { limiter, gateway }) };
}
