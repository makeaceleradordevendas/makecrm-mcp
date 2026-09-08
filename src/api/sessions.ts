import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { createClient } from 'redis';
import { z } from 'zod';
import { principalSchema, type Principal } from '../contracts.js';
import { hashPersonalToken } from '../tokens.js';

export const sessionSchema = z.object({
  principal: principalSchema, access_token: z.string().min(1).max(8192),
  token_hash: z.string().regex(/^[a-f0-9]{64}$/), label: z.string().max(80), created_at: z.number().int(),
}).strict();
export type UserSession = z.infer<typeof sessionSchema>;
export interface SessionStore {
  save(session: UserSession): Promise<void>;
  byToken(token: string): Promise<UserSession | null>;
  byId(id: string): Promise<UserSession | null>;
  list(userId: string): Promise<UserSession[]>;
  revoke(id: string, userId: string): Promise<void>;
}
export class TokenLimitExceeded extends Error { constructor() { super('Active token limit reached'); } }

export class SessionCipher {
  private readonly key: Buffer;
  constructor(secret: string) {
    if (!/^[a-fA-F0-9]{64}$/.test(secret)) throw new Error('SESSION_ENCRYPTION_KEY must be 32 bytes in hex');
    this.key = Buffer.from(secret, 'hex');
  }
  encrypt(session: UserSession, storageKey: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(Buffer.from(storageKey));
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(session)), cipher.final()]);
    return [iv, cipher.getAuthTag(), encrypted].map(value => value.toString('base64url')).join('.');
  }
  decrypt(value: string, storageKey: string) {
    const parts = value.split('.');
    if (parts.length !== 3) throw new Error('Invalid session ciphertext');
    const [iv, tag, data] = parts.map(part => Buffer.from(part, 'base64url')) as [Buffer, Buffer, Buffer];
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAAD(Buffer.from(storageKey)); decipher.setAuthTag(tag);
    return sessionSchema.parse(JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')));
  }
}

export class RedisSessionStore implements SessionStore {
  constructor(private readonly redis: ReturnType<typeof createClient>, private readonly cipher: SessionCipher) {}
  private tokenKey(hash: string) { return `mcp:sessions:token:${hash}`; }
  private idKey(id: string) { return `mcp:sessions:id:${id}`; }
  private userKey(userId: string) { return `mcp:sessions:user:${createHash('sha256').update(userId).digest('hex')}`; }
  private async read(key: string) {
    const value = await this.redis.withCommandOptions({ timeout: 2000 }).get(key);
    if (!value) return null;
    const session = this.cipher.decrypt(value, key);
    return session.principal.expires_at > Math.floor(Date.now() / 1000) ? session : null;
  }
  async save(session: UserSession) {
    sessionSchema.parse(session);
    const now = Math.floor(Date.now() / 1000);
    const ttl = session.principal.expires_at - now;
    if (ttl < 1 || ttl > 3600) throw new Error('Invalid session lifetime');
    const tokenKey = this.tokenKey(session.token_hash);
    const idKey = this.idKey(session.principal.credential_id);
    const result = await this.redis.withCommandOptions({ timeout: 2000 }).eval(`
      redis.call('ZREMRANGEBYSCORE', KEYS[3], '-inf', ARGV[1])
      if redis.call('ZCARD', KEYS[3]) >= 10 then return 0 end
      if redis.call('EXISTS', KEYS[1], KEYS[2]) > 0 then return -1 end
      redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[4])
      redis.call('SET', KEYS[2], ARGV[3], 'EX', ARGV[4])
      redis.call('ZADD', KEYS[3], ARGV[5], ARGV[6])
      redis.call('EXPIRE', KEYS[3], 3660)
      return 1
    `, { keys: [tokenKey, idKey, this.userKey(session.principal.user_id)], arguments: [
      String(now), this.cipher.encrypt(session, tokenKey), this.cipher.encrypt(session, idKey), String(ttl),
      String(session.principal.expires_at), session.principal.credential_id,
    ] });
    if (result === 0) throw new TokenLimitExceeded();
    if (result !== 1) throw new Error('Credential collision');
  }
  async byToken(token: string) {
    let hash: string;
    try { hash = hashPersonalToken(token); } catch { return null; }
    const session = await this.read(this.tokenKey(hash));
    return session?.token_hash === hash ? session : null;
  }
  async byId(id: string) {
    if (!z.string().uuid().safeParse(id).success) return null;
    const session = await this.read(this.idKey(id));
    return session?.principal.credential_id === id ? session : null;
  }
  async list(userId: string) {
    const ids = await this.redis.withCommandOptions({ timeout: 2000 }).zRangeByScore(this.userKey(userId), Math.floor(Date.now() / 1000) + 1, '+inf', { LIMIT: { offset: 0, count: 10 } });
    const sessions = await Promise.all(ids.map(id => this.byId(id)));
    return sessions.filter((session): session is UserSession => session?.principal.user_id === userId);
  }
  async revoke(id: string, userId: string) {
    const session = await this.byId(id);
    if (!session || session.principal.user_id !== userId) return;
    await this.redis.withCommandOptions({ timeout: 2000 }).eval(`
      redis.call('DEL', KEYS[1], KEYS[2])
      redis.call('ZREM', KEYS[3], ARGV[1])
      return 1
    `, { keys: [this.idKey(id), this.tokenKey(session.token_hash), this.userKey(userId)], arguments: [id] });
  }
}

export function publicCredential(session: UserSession): Pick<Principal, 'credential_id' | 'scopes' | 'expires_at'> & { label: string; created_at: number } {
  return { credential_id: session.principal.credential_id, scopes: session.principal.scopes,
    expires_at: session.principal.expires_at, label: session.label, created_at: session.created_at };
}
