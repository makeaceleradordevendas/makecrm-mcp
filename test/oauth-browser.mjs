// Optional browser regression: build first, then set PLAYWRIGHT_MODULE to an installed
// Playwright module and CHROME_EXECUTABLE to a local Chrome/Chromium executable.
// All OAuth data is synthetic. The client callback runs on a second local HTTPS server.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createApp } from '../dist/create-app.js';
import { readConfig } from '../dist/config.js';
import { createOAuthRouter } from '../dist/oauth/router.js';
import { OAuthBroker, pkce, secret } from '../dist/oauth/broker.js';
import { CursorCodec } from '../dist/api/cursor.js';

assert(process.env.PLAYWRIGHT_MODULE && process.env.CHROME_EXECUTABLE, 'Configure the browser test runtime');
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const records = new Map();
const store = {
  async get(key) { return records.get(key) ?? null; },
  async commit(key, version, value, _ttl, writes = []) {
    if ((records.get(key)?.version ?? null) !== version) return false;
    if (value === null) records.delete(key);
    else records.set(key, { value, version: randomUUID() });
    for (const w of writes) records.set(w.key, { value: w.value, version: randomUUID() });
    return true;
  },
};
const user_id = randomUUID(); const company_id = randomUUID();
const api = { async identity() { return { user_id, company_id }; } };
const http = createServer();
const certificateDir = mkdtempSync(join(tmpdir(), 'mcp-browser-test-'));
let browser; let callbackServer;
try {
  const keyPath = join(certificateDir, 'key.pem'); const certPath = join(certificateDir, 'cert.pem');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', keyPath,
    '-out', certPath, '-days', '1', '-subj', '/CN=localhost'], { stdio: 'ignore' });
  callbackServer = createHttpsServer({ key: readFileSync(keyPath), cert: readFileSync(certPath) }, (_req, res) => {
    res.setHeader('Content-Type', 'text/plain'); res.end('Local client callback');
  });
  callbackServer.listen(0, '127.0.0.1'); await once(callbackServer, 'listening');
  http.listen(0, '127.0.0.1'); await once(http, 'listening');
  const origin = `http://127.0.0.1:${http.address().port}`;
  const redirect = `https://127.0.0.1:${callbackServer.address().port}/client/callback`;
  const resource = origin + '/mcp';
  const config = readConfig({ NODE_ENV: 'test', PUBLIC_URL: origin, OAUTH_ISSUER: origin,
    SAAS_API_KEY: 's'.repeat(32), SUPABASE_URL: 'https://supabase.test', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    SESSION_ENCRYPTION_KEY: 'ab'.repeat(32), MCP_CURSOR_SECRET: 'c'.repeat(32),
    SUPABASE_OAUTH_CLIENT_ID: randomUUID(), SUPABASE_OAUTH_CLIENT_SECRET: 's'.repeat(32),
    REDIS_URL: 'redis://localhost', ALLOWED_HOSTS: new URL(origin).host });
  const upstream = {
    authorize(state) { return origin + '/oauth/supabase/callback?' + new URLSearchParams({ state, code: 'fixture-code' }); },
    async exchange() { return { user_id, company_id, access_token: 'fixture-access', refresh_token: 'fixture-refresh', expires_at: Math.floor(Date.now() / 1000) + 3600 }; },
  };
  const broker = new OAuthBroker(store, upstream, api, new CursorCodec('c'.repeat(32)),
    { resource, allowedRedirects: [redirect], accessSeconds: 900, connectionSeconds: 86400 });
  const limiter = { async consume() { return { allowed: true, retryAfter: 60 }; }, async ready() { return true; } };
  const app = createApp(config, { gateway: broker, limiter, oauthRouter: createOAuthRouter(config, broker, limiter, () => {}) }, () => {});
  let legacy = false; const posts = [];
  http.on('request', (req, res) => {
    if (req.method === 'POST' && req.url === '/oauth/consent') {
      posts.push({ origin: req.headers.origin, referer: req.headers.referer });
    }
    if (legacy && req.method === 'GET' && req.url.startsWith('/oauth/consent?')) {
      const set = res.setHeader.bind(res);
      res.setHeader = (name, value) => set(name, name.toLowerCase() === 'referrer-policy' ? 'no-referrer' : value);
    }
    app(req, res);
  });
  browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE, headless: true });
  for (const scenario of ['legacy-approve', 'fixed-approve', 'fixed-deny']) {
    legacy = scenario.startsWith('legacy');
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    const client = await broker.register('Browser fixture', [redirect]);
    const url = origin + '/oauth/authorize?' + new URLSearchParams({ response_type: 'code', client_id: client.client_id,
      redirect_uri: redirect, resource, code_challenge: pkce(secret()), code_challenge_method: 'S256', state: 'client-state' });
    await page.goto(url);
    await page.getByRole('button', { name: 'Autorizar', exact: true }).waitFor();
    const pending = page.waitForResponse(r => r.request().method() === 'POST' && r.url() === origin + '/oauth/consent', { timeout: 10000 });
    await page.getByRole('button', { name: scenario.endsWith('deny') ? 'Recusar' : 'Autorizar', exact: true }).click();
    const response = await pending; const posted = posts.at(-1);
    if (legacy) {
      assert.equal(response.status(), 403); assert.equal(posted.origin, 'null');
      assert.deepEqual(await response.json(), { error: 'invalid_origin' });
    } else {
      assert.equal(response.status(), 303); assert.equal(posted.origin, origin);
      assert.equal(posted.referer, origin + '/');
      const target = new URL(response.headers().location);
      assert.equal(target.origin + target.pathname, redirect);
      assert.equal(target.searchParams.get('state'), 'client-state');
      if (scenario.endsWith('deny')) { assert.equal(target.searchParams.get('error'), 'access_denied'); assert(!target.searchParams.has('code')); }
      else assert(target.searchParams.has('code'));
      await page.waitForURL(url => url.origin + url.pathname === redirect, { timeout: 10000 });
      assert.equal(await page.locator('body').innerText(), 'Local client callback');
    }
    console.log(JSON.stringify({ scenario, status: response.status(), origin: posted.origin }));
    await context.close();
  }
} finally {
  await browser?.close(); http.closeAllConnections(); http.close();
  callbackServer?.closeAllConnections(); callbackServer?.close();
  rmSync(certificateDir, { recursive: true, force: true });
}
