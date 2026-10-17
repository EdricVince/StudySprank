import { extname, join } from 'path';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

// `.ts` under ts-node/Jest, `.js` in the compiled dist/ — never both, so the
// emitted `.d.ts` files are not mistaken for migrations.
const EXT = extname(__filename);

/** src/migrations (or dist/src/migrations once compiled). */
export const MIGRATIONS = [
  join(__dirname, '..', '..', 'migrations', `*${EXT}`),
];

/** Every entity file — only the CLI needs this; the app uses autoLoadEntities. */
export const ENTITIES = [join(__dirname, '..', '..', '**', `*.entity${EXT}`)];

/**
 * Connection settings shared by the Nest app and the TypeORM CLI.
 * The schema is owned by migrations (run automatically on boot); DB_SYNCHRONIZE=true
 * is only a local-development shortcut and must stay off in production.
 */
export function databaseOptions(
  get: (key: string) => string | undefined,
): PostgresConnectionOptions {
  return {
    // Only PostgreSQL is supported (Supabase in prod, postgres:16 in CI).
    type: 'postgres',
    host: get('DB_HOST'),
    port: Number(get('DB_PORT') ?? 5432),
    username: get('DB_USERNAME'),
    password: get('DB_PASSWORD'),
    database: get('DB_NAME'),
    synchronize: get('DB_SYNCHRONIZE') === 'true',
    migrations: MIGRATIONS,
    migrationsRun: get('DB_MIGRATIONS_RUN') !== 'false',
    // Supabase requires SSL. `rejectUnauthorized: false` avoids the
    // "self-signed certificate in chain" error managed hosts (Render) hit
    // against the Supabase pooler. DB_SSL=false is only for a local/CI Postgres.
    ssl: get('DB_SSL') === 'false' ? false : { rejectUnauthorized: false },
  };
}
