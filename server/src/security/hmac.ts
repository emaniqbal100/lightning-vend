import { createHmac, timingSafeEqual } from 'node:crypto';

export function hmacSha256Hex(key: string, msg: string): string {
  return createHmac('sha256', key).update(msg).digest('hex');
}

/** Constant-time comparison of two hex strings. Returns false on length mismatch. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
