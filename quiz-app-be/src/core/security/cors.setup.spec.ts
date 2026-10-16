import { checkOrigin, parseAllowedOrigins, wsCorsOrigin } from './cors.setup';

describe('CORS allow-list (shared by REST and Socket.IO)', () => {
  const run = (fn: (cb: (e: Error | null, ok?: boolean) => void) => void) => {
    let result: { err: Error | null; ok?: boolean } | undefined;
    fn((err, ok) => {
      result = { err, ok };
    });
    return result!;
  };

  it('parses a comma-separated list, trimming blanks', () => {
    expect(parseAllowedOrigins(' https://a.app , https://b.app ,,')).toEqual([
      'https://a.app',
      'https://b.app',
    ]);
    expect(parseAllowedOrigins(undefined)).toEqual([]);
  });

  it('accepts listed origins and requests without an Origin header; rejects others', () => {
    const allowed = ['https://studyspark-web.onrender.com'];
    expect(
      run((cb) =>
        checkOrigin('https://studyspark-web.onrender.com', allowed, cb),
      ).ok,
    ).toBe(true);
    expect(run((cb) => checkOrigin(undefined, allowed, cb)).ok).toBe(true);
    expect(
      run((cb) => checkOrigin('https://evil.example', allowed, cb)).err,
    ).toBeInstanceOf(Error);
  });

  it('WebSocket gateways read CORS_ORIGINS at handshake time (no more origin: true)', () => {
    const prev = process.env.CORS_ORIGINS;
    process.env.CORS_ORIGINS = 'http://localhost:5173';
    try {
      expect(run((cb) => wsCorsOrigin('http://localhost:5173', cb)).ok).toBe(
        true,
      );
      expect(
        run((cb) => wsCorsOrigin('https://evil.example', cb)).err,
      ).toBeInstanceOf(Error);
    } finally {
      process.env.CORS_ORIGINS = prev;
    }
  });
});
