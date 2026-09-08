import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createStartupApp } from '../src/bootstrap.js';
import { readConfig } from '../src/config.js';

test('ambiente incompleto responde 503 em todas as rotas sem expor valores', async t => {
  const events: unknown[] = [];
  const secret = 'sensitive-invalid-url';
  const app = createStartupApp(() => {
    readConfig({ NODE_ENV: 'production', PUBLIC_URL: secret });
    throw new Error('unreachable');
  }, event => events.push(event));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); return new Promise<void>(resolve => server.close(() => resolve())); });
  const address = server.address();
  assert(address && typeof address !== 'string');
  for (const [method, path] of [['GET', '/'], ['GET', '/healthz'], ['GET', '/readyz'],
    ['POST', '/mcp'], ['POST', '/api/mcp-tokens'], ['POST', '/internal/mcp/introspect']] as const) {
    const response: Response = await fetch(`http://127.0.0.1:${address.port}${path}`, { method });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.text();
    assert.equal(JSON.parse(body).error, 'startup_failed');
    assert(!body.includes(secret));
  }
  assert.equal(events.length, 1);
  assert(JSON.stringify(events).includes('PUBLIC_URL'));
  assert(!JSON.stringify(events).includes(secret));
});

test('erros inesperados na inicialização não registram mensagens com segredos', () => {
  const events: unknown[] = [];
  createStartupApp(() => { throw new Error('redis://user:secret@private-host'); }, event => events.push(event));
  assert.deepEqual(events, [{ event: 'startup_failed' }]);
});
