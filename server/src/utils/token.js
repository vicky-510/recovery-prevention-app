import crypto from 'node:crypto';
import { env } from '../config/env.js';

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

function sign(payload) {
  return crypto.createHmac('sha256', env.HMAC_SECRET).update(payload).digest('base64url');
}

export function issueToken(userId) {
  const payload = Buffer.from(
    JSON.stringify({ userId, exp: Date.now() + TOKEN_TTL_MS })
  ).toString('base64url');

  return `${payload}.${sign(payload)}`;
}

/** Returns the user id, or null if the token is malformed, forged, or expired. */
export function verifyToken(token) {
  if (typeof token !== 'string') return null;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);

  // timingSafeEqual throws on length mismatch, so compare lengths first.
  if (given.length !== wanted.length) return null;
  if (!crypto.timingSafeEqual(given, wanted)) return null;

  try {
    const { userId, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof exp !== 'number' || Date.now() > exp) return null;
    return userId ?? null;
  } catch {
    return null;
  }
}
