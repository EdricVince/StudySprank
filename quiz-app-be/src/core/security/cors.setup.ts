import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type OriginCallback = (err: Error | null, allow?: boolean) => void;

/** Parse the CORS_ORIGINS allow-list (comma-separated). */
export function parseAllowedOrigins(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Shared origin check for REST and Socket.IO: requests without an Origin header
 * (server-to-server, curl, same-origin) pass; browsers must be on the allow-list.
 */
export function checkOrigin(
  requestOrigin: string | undefined,
  allowed: string[],
  callback: OriginCallback,
): void {
  if (!requestOrigin || allowed.includes(requestOrigin))
    return callback(null, true);
  callback(new Error('Not allowed by CORS'));
}

/**
 * Socket.IO gateway `cors.origin`. Reads CORS_ORIGINS at handshake time (the
 * decorator is evaluated before ConfigModule has loaded .env).
 */
export function wsCorsOrigin(
  requestOrigin: string | undefined,
  callback: OriginCallback,
): void {
  checkOrigin(
    requestOrigin,
    parseAllowedOrigins(process.env.CORS_ORIGINS),
    callback,
  );
}

export function setupCors(app: INestApplication) {
  const configService = app.get(ConfigService);
  const allowedOrigins = parseAllowedOrigins(
    configService.get<string>('CORS_ORIGINS'),
  );

  app.enableCors({
    origin: (requestOrigin: string | undefined, callback: OriginCallback) =>
      checkOrigin(requestOrigin, allowedOrigins, callback),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
}
