import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { createStartupApp } from '../src/bootstrap.js';
import { readConfig } from '../src/config.js';

test('Vercel detecta uma única entrada Express com default export executável', () => {
  const root = new URL('../', import.meta.url);
  const candidates = ['', 'src/'].flatMap(dir => readdirSync(new URL(dir, root))
    .filter(file => /^(app|index|server|main)\.(js|cjs|mjs|ts|cts|mts)$/.test(file))
    .map(file => `${dir}${file}`));
  const expressEntrypoints = candidates.filter(file => {
    const source = ts.createSourceFile(file, readFileSync(new URL(file, root), 'utf8'), ts.ScriptTarget.Latest);
    return source.statements.some(statement => ts.isImportDeclaration(statement)
      && ts.isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text === 'express'
      && !statement.importClause?.isTypeOnly);
  });
  assert.deepEqual(expressEntrypoints, ['src/index.ts'], 'Entrada precisa importar Express diretamente, sem factories concorrentes');
  // Processo isolado sem credenciais: importar a entrada precisa exportar Express,
  // inclusive quando a configuração ainda estiver incompleta.
  const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e',
    `const {default: app} = await import("./src/index.ts");
     if (typeof app !== "function" || typeof app.listen !== "function") process.exit(2);
     const server = app.listen(0, "127.0.0.1");
     await new Promise(resolve => server.once("listening", resolve));
     try {
       const response = await fetch("http://127.0.0.1:" + server.address().port + "/");
       if (response.status !== 503 || (await response.json()).error !== "startup_failed") process.exitCode = 3;
     } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }`],
  { cwd: fileURLToPath(root), env: { NODE_ENV: 'production', PATH: process.env.PATH }, encoding: 'utf8', timeout: 10000 });
  assert.equal(child.status, 0, child.stderr);
});

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
