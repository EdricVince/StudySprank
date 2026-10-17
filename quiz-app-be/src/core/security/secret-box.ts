import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

// AES-256-GCM for secrets kept in the database (e.g. the Anthropic API key).
// The key is derived from JWT_SECRET, so a database dump alone does not reveal them.

const VERSION = 'v1';

function keyFrom(secret: string): Buffer {
  return createHash('sha256').update(`studyspark-settings:${secret}`).digest();
}

/** Encrypt → "v1:<iv>:<tag>:<ciphertext>" (base64 parts). */
export function seal(plain: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFrom(secret), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [
    VERSION,
    iv.toString('base64'),
    cipher.getAuthTag().toString('base64'),
    data.toString('base64'),
  ].join(':');
}

/** Decrypt a value from seal(); null if it is malformed or the secret changed. */
export function open(sealed: string, secret: string): string | null {
  const [version, iv, tag, data] = sealed.split(':');
  if (version !== VERSION || !iv || !tag || !data) return null;
  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      keyFrom(secret),
      Buffer.from(iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(data, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}
