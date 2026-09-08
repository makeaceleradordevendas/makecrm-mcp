import { createHash, timingSafeEqual } from 'node:crypto';
import express from 'express';
import { z } from 'zod';
import { AccessDenied, querySchema, scopeSchema, scopes, type RateLimiter } from '../contracts.js';
import { InvalidCursor } from './cursor.js';
import { RlsSaasGateway } from './rls-gateway.js';
import { publicCredential, TokenLimitExceeded } from './sessions.js';

const contextSchema = z.object({ credential_id: z.string().uuid(), user_id: z.string().uuid(), company_id: z.string().uuid() }).strict();
const readSchema = querySchema.extend({ context: contextSchema });
const issueSchema = z.object({ label: z.string().trim().min(1).max(80).default('Integração MCP'), scopes: z.array(scopeSchema).min(1).max(3).default([...scopes]) }).strict();

export function createApiRouter(gateway: RlsSaasGateway, limiter: RateLimiter, serviceKey: string) {
  const router = express.Router();
  router.options(['/api/mcp-tokens', '/api/mcp-tokens/:id'], (_req, res) => { res.status(204).end(); });
  router.use(['/api/mcp-tokens', '/internal/mcp'], async (req, res, next) => {
    try {
      if (req.originalUrl.includes('?')) { res.status(400).json({ error: 'query_parameters_not_supported' }); return; }
      const management = req.originalUrl.startsWith('/api/mcp-tokens');
      const quota = await limiter.consume(`${management ? 'token-management-ip' : 'api-ip'}:${req.ip}`, management ? 120 : 30000);
      if (!quota.allowed) { res.set('Retry-After', String(quota.retryAfter)).status(429).json({ error: 'rate_limit_exceeded' }); return; }
      const headers = req.rawHeaders.filter((_, i) => i % 2 === 0).filter(h => h.toLowerCase() === 'authorization');
      const match = /^Bearer ([A-Za-z0-9._~+\/-]+=*)$/i.exec(req.get('authorization') ?? '');
      if (headers.length !== 1 || !match?.[1] || match[1].length > 8192) { res.status(401).json({ error: 'authentication_required' }); return; }
      res.locals.bearer = match[1];
      next();
    } catch { res.status(503).json({ error: 'dependency_unavailable' }); }
  });
  router.use('/internal/mcp', (req, res, next) => {
    const actual = createHash('sha256').update(res.locals.bearer).digest();
    const expected = createHash('sha256').update(serviceKey).digest();
    if (!timingSafeEqual(actual, expected)) { res.status(401).json({ error: 'invalid_service_credential' }); return; }
    next();
  });
  router.use('/api/mcp-tokens', async (_req, res, next) => {
    try {
      const login = await gateway.api.validateLogin(res.locals.bearer);
      const quota = await limiter.consume(`token-management:${login.userId}`, 30);
      if (!quota.allowed) { res.set('Retry-After', String(quota.retryAfter)).status(429).json({ error: 'rate_limit_exceeded' }); return; }
      res.locals.userId = login.userId;
      next();
    } catch (error) { res.status(error instanceof AccessDenied ? 401 : 503).json({ error: 'authentication_unavailable_or_invalid' }); }
  });
  router.use(['/api/mcp-tokens', '/internal/mcp'], express.json({ limit: '16kb', inflate: false }));
  router.post('/api/mcp-tokens', async (req, res, next) => {
    try {
      const body = issueSchema.parse(req.body);
      res.status(201).json(await gateway.issue(res.locals.bearer, body.label, body.scopes));
    } catch (error) { next(error); }
  });
  router.get('/api/mcp-tokens', async (_req, res, next) => {
    try { res.json({ items: (await gateway.sessions.list(res.locals.userId)).map(publicCredential) }); }
    catch (error) { next(error); }
  });
  router.delete('/api/mcp-tokens/:id', async (req, res, next) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      await gateway.sessions.revoke(id, res.locals.userId);
      res.status(204).end();
    } catch (error) { next(error); }
  });
  router.post('/internal/mcp/introspect', async (req, res, next) => {
    try {
      const body = z.object({ token: z.string().min(1).max(4096), resource: z.string().url() }).strict().parse(req.body);
      res.json(await gateway.authenticate(body.token, body.resource) ?? { active: false });
    } catch (error) { next(error); }
  });
  router.post('/internal/mcp/read/:collection', async (req, res, next) => {
    try {
      const collection = z.enum(['contacts', 'opportunities', 'conversations']).parse(req.params.collection);
      const body = readSchema.parse(req.body);
      res.json(await gateway.readContext(collection, body.context, querySchema.parse({ query: body.query, cursor: body.cursor, limit: body.limit })));
    } catch (error) { next(error); }
  });
  router.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) { next(error); return; }
    if (error instanceof z.ZodError || error instanceof InvalidCursor) { res.status(400).json({ error: 'invalid_request' }); return; }
    if (error instanceof AccessDenied) { res.status(403).json({ error: 'access_denied' }); return; }
    if (error instanceof TokenLimitExceeded) { res.status(409).json({ error: 'active_token_limit' }); return; }
    if (error instanceof SyntaxError || (typeof error === 'object' && error !== null && 'type' in error)) { next(error); return; }
    res.status(503).json({ error: 'dependency_unavailable' });
  });
  return router;
}
