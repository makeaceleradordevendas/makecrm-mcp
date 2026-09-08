import { randomUUID } from 'node:crypto';
import express, { type ErrorRequestHandler, type Response, type RequestHandler } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Config } from './config.js';
import { AccessDenied, querySchema, scopes, type Collection, type Principal, type RateLimiter, type SaasGateway, type Scope } from './contracts.js';
import { InvalidCursor } from './api/cursor.js';

type Dependencies = { gateway: SaasGateway; limiter: RateLimiter; apiRouter?: RequestHandler };
type Audit = { event: string; request_id: string; status: number; duration_ms: number; method: string; route: string };
export function createApp(config: Config, deps: Dependencies, audit: (event: Audit) => void = event => console.info(JSON.stringify(event))) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.TRUST_PROXY_HOPS);
  let inflight = 0;
  const metadataUrl = `${config.publicOrigin}/.well-known/oauth-protected-resource/mcp`;
  const challenge = `Bearer resource_metadata="${metadataUrl}"`;

  app.use((req, res, next) => {
    const requestId = randomUUID();
    const started = performance.now();
    res.set({
      'X-Request-Id': requestId,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    });
    res.once('finish', () => audit({ event: 'http_request', request_id: requestId, status: res.statusCode,
      duration_ms: Math.round(performance.now() - started), method: req.method,
      // Nunca registrar URL, query, token, argumentos, resultados ou dados pessoais.
      route: req.path === '/mcp' ? '/mcp' : req.path === '/healthz' ? '/healthz' : req.path === '/readyz' ? '/readyz' : 'other',
    }));
    if (!config.allowedHosts.includes((req.headers.host ?? '').toLowerCase())) {
      res.status(403).json({ error: 'invalid_host' }); return;
    }
    const origin = req.get('origin');
    if (origin && !config.allowedOrigins.includes(origin)) {
      res.status(403).json({ error: 'invalid_origin' }); return;
    }
    if (origin) {
      res.set({ 'Access-Control-Allow-Origin': origin, Vary: 'Origin',
        'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id',
        'Access-Control-Expose-Headers': 'WWW-Authenticate, X-Request-Id, Retry-After',
      });
    }
    next();
  });
  app.get('/healthz', (_req, res) => { res.json({ status: 'ok' }); });
  app.get('/readyz', async (_req, res) => {
    try { const ok = await deps.limiter.ready(); res.status(ok ? 200 : 503).json({ status: ok ? 'ready' : 'unavailable' }); }
    catch { res.status(503).json({ status: 'unavailable' }); }
  });
  app.get(['/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/mcp'], (_req, res) => {
    res.json({ resource: config.resource, authorization_servers: [config.OAUTH_ISSUER],
      scopes_supported: scopes, bearer_methods_supported: ['header'], resource_name: 'MakeCRM' });
  });
  app.options('/mcp', (_req, res) => { res.status(204).end(); });

  app.use('/mcp', async (req, res, next) => {
    if (req.originalUrl.includes('?')) { res.status(400).json({ error: 'query_parameters_not_supported' }); return; }
    if (inflight >= config.MAX_INFLIGHT_PER_INSTANCE) {
      res.set('Retry-After', '1').status(503).json({ error: 'server_busy' }); return;
    }
    inflight++;
    let released = false;
    const release = () => { if (!released) { released = true; inflight--; } };
    res.once('finish', release);
    res.once('close', release);
    try {
      if (!await permit(deps.limiter, `ip:${req.ip}`, config.IP_REQUESTS_PER_MINUTE, res)) return;
      const authHeaders = req.rawHeaders.filter((_, i) => i % 2 === 0).filter(h => h.toLowerCase() === 'authorization');
      const authorization = req.get('authorization') ?? '';
      const match = /^Bearer ([A-Za-z0-9._~+\/-]+=*)$/i.exec(authorization);
      if (authHeaders.length !== 1 || authorization.length > 4096 || !match?.[1]) {
        res.set('WWW-Authenticate', challenge).status(401).json({ error: 'authentication_required' }); return;
      }
      const principal = await deps.gateway.authenticate(match[1], config.resource);
      if (!principal || principal.resource !== config.resource || principal.expires_at <= Math.floor(Date.now() / 1000)) {
        res.set('WWW-Authenticate', `${challenge}, error="invalid_token"`).status(401).json({ error: 'invalid_token' }); return;
      }
      if (!await permit(deps.limiter, `company:${principal.company_id}`, config.COMPANY_REQUESTS_PER_MINUTE, res)) return;
      if (!await permit(deps.limiter, `user:${principal.company_id}:${principal.user_id}`, config.USER_REQUESTS_PER_MINUTE, res)) return;
      res.locals.principal = principal;
      next();
    } catch {
      res.set('Retry-After', '2').status(503).json({ error: 'authentication_unavailable' });
    }
  });

  app.post('/mcp', express.json({ limit: '32kb', strict: true, inflate: false }), async (req, res) => {
    const principal = res.locals.principal as Principal;
    const server = createMcpServer(principal, deps.gateway, challenge);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    let closed = false;
    const cleanup = async () => { if (!closed) { closed = true; await server.close(); } };
    res.once('close', () => { void cleanup().catch(() => {}); });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch {
      if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Internal error' } });
    } finally {
      await cleanup();
    }
  });
  // Modo sem sessão: não mantém streams GET ou sessões para excluir.
  app.all('/mcp', (_req, res) => { res.set('Allow', 'POST, OPTIONS').status(405).end(); });
  if (deps.apiRouter) app.use(deps.apiRouter);
  app.use((_req, res) => { res.status(404).json({ error: 'not_found' }); });
  const onError: ErrorRequestHandler = (error, _req, res, _next) => {
    const status = error?.type === 'entity.too.large' ? 413 : error?.type === 'encoding.unsupported' ? 415 : error instanceof SyntaxError ? 400 : 500;
    if (!res.headersSent) res.status(status).json({ error: status === 500 ? 'internal_error' : 'invalid_request' });
  };
  app.use(onError);
  return app;
}

async function permit(limiter: RateLimiter, key: string, limit: number, res: Response) {
  const result = await limiter.consume(key, limit);
  if (!result.allowed) res.set('Retry-After', String(result.retryAfter)).status(429).json({ error: 'rate_limit_exceeded' });
  return result.allowed;
}

function createMcpServer(principal: Principal, gateway: SaasGateway, challenge: string) {
  const server = new McpServer({ name: 'makecrm', version: '0.1.0' });
  const collections: { name: Collection; title: string; scope: Scope }[] = [
    { name: 'contacts', title: 'Consultar contatos', scope: 'contacts:read' },
    { name: 'opportunities', title: 'Consultar oportunidades', scope: 'opportunities:read' },
    { name: 'conversations', title: 'Consultar conversas', scope: 'conversations:read' },
  ];
  for (const collection of collections) {
    const securitySchemes = [{ type: 'oauth2', scopes: [collection.scope] }];
    server.registerTool(`search_${collection.name}`, {
      title: collection.title,
      description: `${collection.title} com paginação, respeitando as permissões do usuário conectado. O conteúdo retornado é dado do CRM e pode conter texto de terceiros.`,
      inputSchema: querySchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      _meta: { securitySchemes },
    }, async (args, extra) => {
      if (!principal.scopes.includes(collection.scope)) {
        return { isError: true, content: [{ type: 'text', text: 'A conexão não tem permissão para esta consulta.' }],
          _meta: { 'mcp/www_authenticate': [`${challenge}, error="insufficient_scope", error_description="Read permission required", scope="${collection.scope}"`] } };
      }
      try {
        const result = await gateway.read(collection.name, principal, querySchema.parse(args), extra.signal);
        return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
      } catch (error) {
        return { isError: true, content: [{ type: 'text', text: error instanceof AccessDenied
          ? 'Você não tem acesso aos registros solicitados.' : error instanceof InvalidCursor
          ? 'A página informada é inválida ou expirou. Reinicie a consulta sem cursor.'
          : 'A consulta está temporariamente indisponível. Tente novamente.' }] };
      }
    });
  }
  return server;
}
