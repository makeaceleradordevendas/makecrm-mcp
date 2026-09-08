import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { HttpSaasGateway } from '../src/gateway.js';
import { AccessDenied, DependencyUnavailable, type Principal } from '../src/contracts.js';
import { hashPersonalToken, issuePersonalToken } from '../src/tokens.js';

const identity: Principal = { active: true, credential_id: randomUUID(), user_id: randomUUID(), company_id: randomUUID(), scopes: ['contacts:read'], resource: 'https://mcp.test/mcp', expires_at: Math.floor(Date.now() / 1000) + 300 };
test('UUID v4 gerado no servidor; armazenamento usa somente hash', () => {
  const a = issuePersonalToken(); const b = issuePersonalToken();
  assert.notEqual(a.token, b.token);
  assert.notEqual(a.tokenHash, a.token);
  assert.equal(a.tokenHash, hashPersonalToken(a.token));
  assert.equal(a.tokenHash, hashPersonalToken(a.token.toUpperCase()));
  assert.throws(() => hashPersonalToken('00000000-0000-0000-0000-000000000000'));
});

test('API: contexto autenticado, separação de credenciais, revogação e respostas inválidas', async t => {
  let reply: unknown = identity;
  let status = 200;
  const requests: { path: string; auth?: string; body: Record<string, unknown> }[] = [];
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    requests.push({ path: req.url!, auth: req.headers.authorization, body: JSON.parse(Buffer.concat(chunks).toString()) });
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(reply));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
  const address = server.address(); assert(address && typeof address !== 'string');
  const gateway = new HttpSaasGateway({ baseUrl: `http://127.0.0.1:${address.port}/internal/`, apiKey: 'server-credential', timeoutMs: 1000, maxResponseBytes: 2048 });
  assert.deepEqual(await gateway.authenticate('user-token', identity.resource), identity);
  assert.equal(requests[0]?.auth, 'Bearer server-credential');
  assert.equal(requests[0]?.body.token, 'user-token');
  reply = { items: [{ id: 'contact-1' }], next_cursor: null };
  await gateway.read('contacts', identity, { limit: 25 });
  assert.deepEqual(requests[1]?.body.context, { credential_id: identity.credential_id, company_id: identity.company_id, user_id: identity.user_id });
  assert(!JSON.stringify(requests[1]).includes('user-token'));
  reply = { active: false }; assert.equal(await gateway.authenticate('revoked', identity.resource), null);
  reply = { ...identity, resource: 'https://wrong.test' }; assert.equal(await gateway.authenticate('wrong', identity.resource), null);
  reply = { ...identity, expires_at: 1 }; assert.equal(await gateway.authenticate('expired', identity.resource), null);
  reply = { ...identity, scopes: ['admin:write'] }; await assert.rejects(gateway.authenticate('bad-scope', identity.resource), DependencyUnavailable);
  reply = { active: true }; await assert.rejects(gateway.authenticate('bad', identity.resource), DependencyUnavailable);
  reply = { items: Array(26).fill({}), next_cursor: null }; await assert.rejects(gateway.read('contacts', identity, { limit: 25 }), DependencyUnavailable);
  reply = { data: 'x'.repeat(3000) }; await assert.rejects(gateway.authenticate('oversized', identity.resource), DependencyUnavailable);
  status = 403; reply = {}; await assert.rejects(gateway.read('contacts', identity, { limit: 25 }), AccessDenied);
  status = 500; await assert.rejects(gateway.authenticate('failed', identity.resource), DependencyUnavailable);
});

test('API lenta é cancelada por timeout', async t => {
  const server = createServer((_req, _res) => {});
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
  const address = server.address(); assert(address && typeof address !== 'string');
  const gateway = new HttpSaasGateway({ baseUrl: `http://127.0.0.1:${address.port}`, apiKey: 'server-secret', timeoutMs: 20, maxResponseBytes: 1024 });
  await assert.rejects(gateway.authenticate('token', identity.resource), DependencyUnavailable);
});
