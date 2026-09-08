import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createClient } from 'redis';
import { RedisRateLimiter } from '../src/rate-limit.js';
import { RedisSessionStore, SessionCipher, TokenLimitExceeded, type UserSession } from '../src/api/sessions.js';
import { issuePersonalToken } from '../src/tokens.js';

test('Redis real: limite atômico entre duas conexões/réplicas', { skip: !process.env.TEST_REDIS_URL }, async t => {
  const first = createClient({ url: process.env.TEST_REDIS_URL });
  const second = createClient({ url: process.env.TEST_REDIS_URL });
  first.on('error', () => {}); second.on('error', () => {});
  t.after(() => { if (first.isOpen) first.destroy(); if (second.isOpen) second.destroy(); });
  const connections = [first.connect(), second.connect()];
  const limiters = [new RedisRateLimiter(first, connections[0]), new RedisRateLimiter(second, connections[1])];
  const key = `integration-test:${randomUUID()}`;
  const responses = await Promise.all(Array.from({ length: 100 }, (_, i) => limiters[i % 2]!.consume(key, 10)));
  assert.equal(responses.filter(r => r.allowed).length, 10);
  assert(responses.every(r => r.retryAfter > 0 && r.retryAfter <= 60));
  // A chave de teste é expirada automaticamente após 60s.
});

test('Redis real: sessões criptografadas, limite de tokens atômico e revogação entre réplicas', { skip: !process.env.TEST_REDIS_URL }, async t => {
  const first = createClient({ url: process.env.TEST_REDIS_URL });
  const second = createClient({ url: process.env.TEST_REDIS_URL });
  first.on('error', () => {}); second.on('error', () => {});
  t.after(() => { if (first.isOpen) first.destroy(); if (second.isOpen) second.destroy(); });
  await Promise.all([first.connect(), second.connect()]);
  const stores = [new RedisSessionStore(first, new SessionCipher('a1'.repeat(32))), new RedisSessionStore(second, new SessionCipher('a1'.repeat(32)))];
  const user = randomUUID(); const company = randomUUID();
  const issued = issuePersonalToken();
  const record: UserSession = { principal: { active: true, credential_id: randomUUID(), user_id: user, company_id: company,
    scopes: ['contacts:read'], resource: 'https://mcp.test/mcp', expires_at: Math.floor(Date.now() / 1000) + 30 },
    access_token: 'supabase-session-secret', token_hash: issued.tokenHash, label: 'Test', created_at: Math.floor(Date.now() / 1000) };
  await stores[0]!.save(record);
  assert.deepEqual(await stores[1]!.byToken(issued.token), record);
  const raw = await second.get(`mcp:sessions:token:${issued.tokenHash}`);
  assert(raw && !raw.includes('supabase-session-secret') && !raw.includes(user));
  await stores[1]!.revoke(record.principal.credential_id, randomUUID());
  assert(await stores[0]!.byToken(issued.token));
  const outcomes = await Promise.allSettled(Array.from({ length: 20 }, (_, i) => stores[i % 2]!.save({ ...record,
    principal: { ...record.principal, credential_id: randomUUID() }, token_hash: issuePersonalToken().tokenHash,
  })));
  assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 9);
  assert(outcomes.filter(result => result.status === 'rejected').every(result => result.reason instanceof TokenLimitExceeded));
  assert.equal((await stores[0]!.list(user)).length, 10);
  await stores[1]!.revoke(record.principal.credential_id, user);
  assert.equal(await stores[0]!.byToken(issued.token), null);
  assert.equal(await stores[0]!.byId(record.principal.credential_id), null);
  for (const session of await stores[0]!.list(user)) await stores[0]!.revoke(session.principal.credential_id, user);
});
