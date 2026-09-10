import express from 'express';
import { z } from 'zod';
import { AccessDenied, DependencyUnavailable, scopes, type RateLimiter } from '../contracts.js';
import type { Config } from '../config.js';
import { OAuthBroker, OAuthError, secret } from './broker.js';
import { MAKECRM_FAVICON_URL } from '../branding.js';

const string = z.string().min(1).max(2048);
const authorization = z.object({ response_type: z.literal('code'), client_id: z.string().uuid(), redirect_uri: string.url(),
  resource: string.url(), code_challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/), code_challenge_method: z.literal('S256'),
  scope: z.string().max(256).optional(), state: z.string().max(512).optional() });
const escape = (text: string) => text.replace(/[&<>"']/g, value => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[value]!);
const page = (title: string, body: string) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} — MakeCRM</title><link rel="icon" type="image/png" href="${escape(MAKECRM_FAVICON_URL)}"><style>body{font:17px/1.6 system-ui;background:#f5f7fb;color:#182336;max-width:600px;margin:8vh auto;padding:24px}main{background:white;padding:32px;border:1px solid #dde3ed;border-radius:16px}h1{font-size:25px}button{font:inherit;padding:10px 18px;border-radius:8px;border:1px solid #cbd5e1;cursor:pointer;margin:8px 8px 0 0}button[value=approve]{background:#2563eb;color:white;border-color:#2563eb}small{overflow-wrap:anywhere;color:#475569}</style></head><body><main><h1>${escape(title)}</h1>${body}</main></body></html>`;

type OAuthFailure = { event: 'oauth_failure'; request_id: string; operation: string; reason: string; upstream_status?: number };
export function createOAuthRouter(config: Config, broker: OAuthBroker, limiter: RateLimiter,
  audit: (event: OAuthFailure) => void = event => console.error(JSON.stringify(event))) {
  const router = express.Router();
  const failure = (res: express.Response, operation: string, reason: string, upstream_status?: number) => {
    audit({ event: 'oauth_failure', request_id: String(res.getHeader('X-Request-Id') ?? ''), operation, reason,
      ...(upstream_status === undefined ? {} : { upstream_status }) });
  };
  const cookieName = config.NODE_ENV === 'production' ? '__Host-mcp-oauth' : 'mcp-oauth';
  const browser = (req: express.Request) => {
    const matches = (req.headers.cookie ?? '').split(';').map(x => x.trim()).filter(x => x.startsWith(`${cookieName}=`));
    return matches.length === 1 ? matches[0]!.slice(cookieName.length + 1) : '';
  };
  const html = (res: express.Response, title: string, content: string, callback: string) => {
    // Native form POSTs under no-referrer can send Origin: null.
    // Keep the origin for CSRF checks without exposing the consent ID in Referer.
    res.set('Referrer-Policy', 'strict-origin');
    // Chromium applies form-action to the POST's redirect as well. This callback
    // was checked against the broker allowlist; allow only its origin in this page.
    const callbackOrigin = new URL(callback).origin;
    res.set('Content-Security-Policy', `default-src 'none'; img-src 'self' ${MAKECRM_FAVICON_URL}; style-src 'unsafe-inline'; form-action 'self' ${callbackOrigin}; frame-ancestors 'none'; base-uri 'none'`);
    res.type('html').send(page(title, content));
  };
  router.get('/.well-known/oauth-authorization-server', (_req, res) => {
    res.json({ issuer: config.publicOrigin, authorization_endpoint: `${config.publicOrigin}/oauth/authorize`,
      token_endpoint: `${config.publicOrigin}/oauth/token`, registration_endpoint: `${config.publicOrigin}/oauth/register`,
      revocation_endpoint: `${config.publicOrigin}/oauth/revoke`, response_types_supported: ['code'],
      authorization_response_iss_parameter_supported: true,
      grant_types_supported: ['authorization_code', 'refresh_token'], token_endpoint_auth_methods_supported: ['none'],
      revocation_endpoint_auth_methods_supported: ['none'], code_challenge_methods_supported: ['S256'], scopes_supported: scopes });
  });
  router.use(['/oauth', '/api/mcp-connections'], async (req, res, next) => {
    try {
      const quota = await limiter.consume(`oauth-ip:${req.ip}`, 120);
      if (!quota.allowed) { res.set('Retry-After', String(quota.retryAfter)).status(429).json({ error: 'rate_limit_exceeded' }); return; }
      if (req.method === 'OPTIONS') { res.status(204).end(); return; }
      next();
    } catch { failure(res, 'oauth_rate_limit', 'storage_error'); res.status(503).json({ error: 'temporarily_unavailable' }); }
  });
  router.post('/oauth/register', express.json({ limit: '8kb', inflate: false }), async (req, res, next) => {
    try {
      const quota = await limiter.consume(`oauth-registration:${req.ip}`, 5);
      const global = await limiter.consume('oauth-registration:global', 60);
      if (!quota.allowed || !global.allowed) throw new OAuthError('rate_limit_exceeded', 429);
      const body = z.object({ client_name: z.string().trim().min(1).max(80).default('Cliente de IA'),
        redirect_uris: z.array(string.url()).min(1).max(4), token_endpoint_auth_method: z.literal('none').default('none'),
        grant_types: z.array(z.enum(['authorization_code', 'refresh_token'])).optional(), response_types: z.array(z.literal('code')).optional(),
      }).parse(req.body);
      res.status(201).json(await broker.register(body.client_name, body.redirect_uris));
    } catch (error) { next(error); }
  });
  router.get('/oauth/authorize', async (req, res, next) => {
    try {
      const input = authorization.parse(req.query);
      const nonce = secret();
      const location = await broker.authorize(input, nonce);
      res.cookie(cookieName, nonce, { httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 900000 });
      res.redirect(302, location);
    } catch (error) { next(error); }
  });
  router.get('/oauth/supabase/callback', async (req, res, next) => {
    try {
      const input = z.object({ state: z.string().regex(/^[A-Za-z0-9_-]{43}$/), code: string.optional(), error: string.optional() }).parse(req.query);
      if ((!input.code && !input.error) || (input.code && input.error)) throw new OAuthError('invalid_request');
      const result = await broker.callback(input.state, input.code, browser(req));
      res.redirect(303, result.redirect ?? `/oauth/consent?id=${result.consentId}`);
    } catch (error) { next(error); }
  });
  router.get('/oauth/consent', async (req, res, next) => {
    try {
      const { id } = z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).parse(req.query);
      const { value } = await broker.consent(id, browser(req));
      const names = { 'contacts:read': 'Consultar contatos', 'opportunities:read': 'Consultar oportunidades e totais por etapa', 'conversations:read': 'Consultar conversas',
        'catalog:read': 'Consultar usuários, funis, produtos, origens e campanhas', 'contacts:context:read': 'Consultar contexto completo dos contatos e informações relacionadas visíveis à sua conta' };
      html(res, 'Autorizar conexão', `<p><strong>${escape(value.request.client_name)}</strong> solicita acesso ao seu MakeCRM.</p><p>Destino da autorização: <strong>${escape(new URL(value.request.redirect_uri).hostname)}</strong></p><p>Permissões:</p><ul>${value.request.scopes.map(s => `<li>${names[s]}</li>`).join('')}</ul><p>As consultas respeitam suas permissões atuais no CRM. Você pode desconectar esta integração pelo SaaS.</p><p>Conta conectada: <strong>${escape(value.session.email ?? value.session.user_id)}</strong>. O acesso será limitado à empresa vinculada a esta conta.</p><form method="post" action="/oauth/consent"><input type="hidden" name="id" value="${id}"><input type="hidden" name="csrf" value="${value.csrf}"><button name="decision" value="approve">Autorizar</button><button name="decision" value="deny">Recusar</button></form>`, value.request.redirect_uri);
    } catch (error) { next(error); }
  });
  router.post('/oauth/consent', express.urlencoded({ extended: false, limit: '4kb', inflate: false }), async (req, res, next) => {
    try {
      if (req.get('origin') !== config.publicOrigin) throw new OAuthError('invalid_request');
      const body = z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{43}$/), csrf: string, decision: z.enum(['approve', 'deny']) }).strict().parse(req.body);
      const location = await broker.decide(body.id, body.csrf, browser(req), body.decision === 'approve');
      res.clearCookie(cookieName, { secure: config.NODE_ENV === 'production', sameSite: 'lax', httpOnly: true, path: '/' });
      res.redirect(303, location);
    } catch (error) { next(error); }
  });
  router.post('/oauth/token', express.urlencoded({ extended: false, limit: '16kb', inflate: false }), async (req, res, next) => {
    try {
      if (!req.is('application/x-www-form-urlencoded') || req.get('authorization')) throw new OAuthError('invalid_request');
      const body = z.discriminatedUnion('grant_type', [
        z.object({ grant_type: z.literal('authorization_code'), client_id: z.string().uuid(), code: string, redirect_uri: string.url(), resource: string.url(), code_verifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/) }),
        z.object({ grant_type: z.literal('refresh_token'), client_id: z.string().uuid(), refresh_token: string, resource: string.url().optional(), scope: z.string().max(256).optional() }),
      ]).parse(req.body);
      const response = body.grant_type === 'authorization_code'
        ? await broker.exchange(body.code, body.client_id, body.redirect_uri, body.code_verifier, body.resource)
        : await broker.refresh(body.refresh_token, body.client_id, body.resource, body.scope);
      res.set('Pragma', 'no-cache').json(response);
    } catch (error) { next(error); }
  });
  router.post('/oauth/revoke', express.urlencoded({ extended: false, limit: '8kb', inflate: false }), async (req, res, next) => {
    try {
      if (!req.is('application/x-www-form-urlencoded') || req.get('authorization')) throw new OAuthError('invalid_request');
      const body = z.object({ token: string, client_id: z.string().uuid() }).parse(req.body);
      await broker.revoke(body.token, body.client_id); res.status(200).end();
    } catch (error) { next(error); }
  });
  router.use('/api/mcp-connections', async (req, res, next) => {
    try {
      if (req.originalUrl.includes('?')) throw new OAuthError('invalid_request');
      const headers = req.rawHeaders.filter((_, i) => i % 2 === 0).filter(h => h.toLowerCase() === 'authorization');
      const match = /^Bearer ([A-Za-z0-9._-]{1,8192})$/i.exec(req.get('authorization') ?? '');
      if (headers.length !== 1 || !match?.[1]) throw new OAuthError('invalid_token', 401);
      const login = await broker.api.validateLogin(match[1]);
      const quota = await limiter.consume(`oauth-management:${login.userId}`, 30);
      if (!quota.allowed) throw new OAuthError('rate_limit_exceeded', 429);
      res.locals.userId = login.userId; next();
    } catch (error) { next(error); }
  });
  router.get('/api/mcp-connections', async (_req, res, next) => {
    try { res.json({ items: await broker.list(res.locals.userId) }); } catch (error) { next(error); }
  });
  router.delete('/api/mcp-connections/:id', async (req, res, next) => {
    try { await broker.revokeGrant(z.string().uuid().parse(req.params.id), res.locals.userId); res.status(204).end(); } catch (error) { next(error); }
  });
  router.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) { next(error); return; }
    if (error instanceof OAuthError) { res.status(error.status).json({ error: error.code }); return; }
    if (error instanceof z.ZodError || error instanceof SyntaxError) { res.status(400).json({ error: 'invalid_request' }); return; }
    // Only internal diagnostic labels and HTTP status; never error messages, bodies or callback URLs.
    const diagnostic = error instanceof AccessDenied || error instanceof DependencyUnavailable ? error.diagnostic : undefined;
    failure(res, diagnostic?.operation ?? 'oauth_handler', diagnostic?.reason ?? (error instanceof AccessDenied ? 'access_denied' : 'unexpected_error'), diagnostic?.upstream_status);
    if (error instanceof AccessDenied) { res.status(400).json({ error: 'invalid_grant' }); return; }
    res.set('Retry-After', '2').status(503).json({ error: 'temporarily_unavailable' });
  });
  return router;
}
