import { createHash, randomUUID } from 'node:crypto';

/** Use no backend autenticado do SaaS. Nunca importe em código Vite/browser. */
export function issuePersonalToken() {
  const token = randomUUID();
  return { token, tokenHash: hashPersonalToken(token) };
}

export function hashPersonalToken(token: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
    throw new Error('Token deve ser UUID v4 aleatório');
  }
  return createHash('sha256').update(token.toLowerCase()).digest('hex');
}
