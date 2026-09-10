import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { createClient } from 'redis';

export type Stored<T> = { value: T; version: string };
export type Write = { key: string; value: unknown; ttl: number };
export interface OAuthStore {
  get<T>(key: string): Promise<Stored<T> | null>;
  // Compare-and-swap + related writes form one atomic transaction. Null means absent.
  commit(key: string, version: string | null, value: unknown | null, ttl: number, writes?: Write[]): Promise<boolean>;
}

export class RedisOAuthStore implements OAuthStore {
  private readonly secret: Buffer;
  constructor(private readonly redis: ReturnType<typeof createClient>, secret: string, private readonly prefix = 'mcp:oauth:') {
    if (!/^[a-fA-F0-9]{64}$/.test(secret)) throw new Error('Invalid OAuth encryption key');
    this.secret = Buffer.from(secret, 'hex');
  }
  private encrypt(key: string, value: unknown) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.secret, iv);
    cipher.setAAD(Buffer.from(this.prefix + key));
    const data = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
    return [iv, cipher.getAuthTag(), data].map(x => x.toString('base64url')).join('.');
  }
  async get<T>(key: string): Promise<Stored<T> | null> {
    const raw = await this.redis.withCommandOptions({ timeout: 2000 }).get(this.prefix + key);
    if (!raw) return null;
    const parts = raw.split('.');
    if (parts.length !== 3) throw new Error('Invalid OAuth ciphertext');
    const [iv, tag, data] = parts.map(x => Buffer.from(x, 'base64url')) as [Buffer, Buffer, Buffer];
    const cipher = createDecipheriv('aes-256-gcm', this.secret, iv);
    cipher.setAAD(Buffer.from(this.prefix + key)); cipher.setAuthTag(tag);
    return { version: raw, value: JSON.parse(Buffer.concat([cipher.update(data), cipher.final()]).toString()) as T };
  }
  async commit(key: string, version: string | null, value: unknown | null, ttl: number, writes: Write[] = []) {
    for (const lifetime of [ttl, ...writes.map(w => w.ttl)]) {
      if (!Number.isInteger(lifetime) || lifetime < 1 || lifetime > 366 * 86400) throw new Error('Invalid OAuth TTL');
    }
    const result = await this.redis.withCommandOptions({ timeout: 2000 }).eval(`
      local previous = redis.call('GET', KEYS[1])
      if (previous or '') ~= ARGV[1] then return 0 end
      if ARGV[2] == '' then redis.call('DEL', KEYS[1])
      else redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3]) end
      for i = 2, #KEYS do
        redis.call('SET', KEYS[i], ARGV[2*i], 'EX', ARGV[2*i+1])
      end
      return 1
    `, { keys: [key, ...writes.map(w => w.key)].map(k => this.prefix + k), arguments: [
      version ?? '', value === null ? '' : this.encrypt(key, value), String(ttl),
      ...writes.flatMap(w => [this.encrypt(w.key, w.value), String(w.ttl)]),
    ] });
    return result === 1;
  }
}
