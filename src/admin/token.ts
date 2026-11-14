/** Oddiy HMAC-imzolangan token (qo'shimcha kutubxonasiz). */
import * as crypto from 'crypto';

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function signToken(payload: Record<string, unknown>, secret: string, ttlSec: number): string {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSec };
  const data = b64url(Buffer.from(JSON.stringify(body)));
  const sig = b64url(crypto.createHmac('sha256', secret).update(data).digest());
  return `${data}.${sig}`;
}

export function verifyToken(token: string, secret: string): Record<string, unknown> | null {
  if (!token || !token.includes('.')) return null;
  const [data, sig] = token.split('.');
  const expected = b64url(crypto.createHmac('sha256', secret).update(data).digest());
  // Vaqt-bardosh taqqoslash
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    const body = JSON.parse(
      Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    ) as Record<string, unknown>;
    if (typeof body.exp === 'number' && body.exp < Math.floor(Date.now() / 1000)) return null;
    return body;
  } catch {
    return null;
  }
}
