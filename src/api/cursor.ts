import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { Collection, Principal, ReadQuery } from '../contracts.js';

export class InvalidCursor extends Error { constructor() { super('Invalid cursor'); } }
export const positionSchema = z.object({ id: z.string().uuid(), created_at: z.string().datetime({ offset: true }) }).strict();
export type Position = z.infer<typeof positionSchema>;
const payloadSchema = z.object({ v: z.literal(1), binding: z.string().length(64), exp: z.number().int(), pos: positionSchema }).strict();

export class CursorCodec {
  constructor(private readonly secret: string, private readonly now = () => Date.now()) {
    if (Buffer.byteLength(secret) < 32) throw new Error('Cursor signing secret must have at least 32 bytes');
  }
  private binding(collection: Collection, identity: Principal, query: ReadQuery) {
    return createHash('sha256').update(JSON.stringify([
      identity.credential_id, identity.user_id, identity.company_id, identity.resource, collection, query.query ?? '',
    ])).digest('hex');
  }
  encode(position: Position, collection: Collection, identity: Principal, query: ReadQuery) {
    const payload = Buffer.from(JSON.stringify({ v: 1, binding: this.binding(collection, identity, query),
      exp: Math.min(identity.expires_at, Math.floor(this.now() / 1000) + 900), pos: positionSchema.parse(position),
    })).toString('base64url');
    return `${payload}.${createHmac('sha256', this.secret).update(payload).digest('base64url')}`;
  }
  decode(cursor: string | undefined, collection: Collection, identity: Principal, query: ReadQuery): Position | null {
    if (!cursor) return null;
    try {
      if (cursor.length > 512 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(cursor)) throw new InvalidCursor();
      const [payload, signature] = cursor.split('.') as [string, string];
      const supplied = Buffer.from(signature, 'base64url');
      const expected = createHmac('sha256', this.secret).update(payload).digest();
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new InvalidCursor();
      const data = payloadSchema.parse(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')));
      if (data.exp <= Math.floor(this.now() / 1000) || data.binding !== this.binding(collection, identity, query)) throw new InvalidCursor();
      return data.pos;
    } catch { throw new InvalidCursor(); }
  }
}
