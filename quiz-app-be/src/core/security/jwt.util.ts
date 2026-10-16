import * as crypto from 'crypto';

export interface AccessTokenPayload {
  sub: number;
  email: string;
  role_id: number;
  iat: number;
  exp: number;
}

/** Sign an HS256 JWT (the app's hand-rolled format: base64url header.payload.signature). */
export function signHs256(
  payload: object,
  secret: string,
  expiresInSeconds: number,
  nowMs = Date.now(),
): string {
  const iat = Math.floor(nowMs / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
  ).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({ ...payload, iat, exp: iat + expiresInSeconds }),
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

export type VerifyFailure = 'format' | 'signature' | 'payload' | 'expired';

/**
 * Verify an HS256 JWT. The signature is compared with crypto.timingSafeEqual
 * (constant time) so response timing leaks nothing about the expected value.
 */
export function verifyHs256(
  token: string | undefined | null,
  secret: string,
  nowMs = Date.now(),
):
  | { ok: true; payload: AccessTokenPayload }
  | { ok: false; reason: VerifyFailure } {
  const parts = (token ?? '').split('.');
  if (parts.length !== 3) return { ok: false, reason: 'format' };
  const [header, body, signature] = parts;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest();
  const given = Buffer.from(signature, 'base64url');
  if (
    given.length !== expected.length ||
    !crypto.timingSafeEqual(given, expected)
  ) {
    return { ok: false, reason: 'signature' };
  }

  let payload: AccessTokenPayload;
  try {
    payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as AccessTokenPayload;
  } catch {
    return { ok: false, reason: 'payload' };
  }
  if (
    typeof payload?.exp !== 'number' ||
    payload.exp < Math.floor(nowMs / 1000)
  ) {
    return { ok: false, reason: 'expired' };
  }
  return { ok: true, payload };
}
