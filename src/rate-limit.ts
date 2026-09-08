import { createHash } from 'node:crypto';
import type { createClient } from 'redis';
import type { RateLimiter } from './contracts.js';

// INCR + expiração atômicos. Uma janela começa na primeira chamada e é comum às réplicas.
export const consumeScript = `
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('PEXPIRE', KEYS[1], 60000) end
return {n, redis.call('PTTL', KEYS[1])}
`;
export class RedisRateLimiter implements RateLimiter {
  constructor(private readonly redis: ReturnType<typeof createClient>, private readonly connecting?: Promise<unknown>) {}
  private async awaitConnection() {
    if (this.redis.isReady) return;
    if (!this.connecting) throw new Error('Redis unavailable');
    let deadline: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([this.connecting, new Promise<never>((_resolve, reject) => {
        deadline = setTimeout(() => reject(new Error('Redis connection timeout')), 2000);
      })]);
      if (!this.redis.isReady) throw new Error('Redis unavailable');
    } finally { if (deadline) clearTimeout(deadline); }
  }
  async consume(key: string, limit: number) {
    await this.awaitConnection();
    const hash = createHash('sha256').update(key).digest('hex');
    const result = await this.redis.withCommandOptions({ timeout: 2000 }).eval(consumeScript, { keys: [`mcp:rate:${hash}`], arguments: [] }) as number[];
    return { allowed: result[0]! <= limit, retryAfter: Math.max(1, Math.ceil(result[1]! / 1000)) };
  }
  async ready() { return this.redis.isReady && await this.redis.withCommandOptions({ timeout: 2000 }).ping() === 'PONG'; }
}
