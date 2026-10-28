# StudySpark API (quiz-app-be)

NestJS 11 + TypeORM + PostgreSQL. REST under `/api/v1`, Socket.IO for battles.
Swagger UI at `/api/docs` when `NODE_ENV=development`.

## Run

```bash
cp .env.example .env        # see "Configuration"
pnpm install                # from the repo root
pnpm start:dev              # http://localhost:3000
```

## Configuration

| Variable | Required | Notes |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | yes | PostgreSQL (Supabase session pooler in production) |
| `DB_SSL` | | `false` only for a local Postgres without TLS |
| `DB_MIGRATIONS_RUN` | | default `true` — apply pending migrations on boot |
| `DB_SYNCHRONIZE` | | keep `false`; `true` is a local-only shortcut |
| `JWT_SECRET` | yes | HS256 signing key (long random string) |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | | default `15m` / `7d`; refresh tokens rotate and are stored hashed |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | first run | creates the first administrator (role 3) if no account has that email; sign in at `/login` |
| `CORS_ORIGINS` | yes | comma-separated web origins |
| `APP_URL` | | web base URL for password-reset links |
| `ANTHROPIC_API_KEY` | | enables AI features (otherwise AI endpoints return 503) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | | only for Google/Facebook login |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | | password-reset email (the link is logged if unset) |
| `THROTTLE_AUTH_LIMIT` | | auth rate limit per window (relaxed in CI) |

## Database & migrations

The schema lives in [src/migrations](src/migrations) and is applied automatically on start-up.

```bash
pnpm migration:show                                   # applied / pending
pnpm migration:run                                    # apply manually (uses .env)
pnpm migration:generate src/migrations/AddSomething   # after changing an entity — review the SQL, then commit
pnpm migration:revert                                 # undo the last migration
```

The baseline migration (`InitialSchema`) creates all tables on an empty database. On a database that was
created earlier with `synchronize` it skips the tables and only records itself, so existing deployments can
switch to migrations without data loss. Both cases seed the roles (1 STUDENT, 2 TEACHER, 3 ADMIN).

An Anthropic key saved from the admin dashboard is stored AES-256-GCM-encrypted in `app_settings`
(key derived from `JWT_SECRET`), loaded on boot and takes precedence over `ANTHROPIC_API_KEY`.
If `JWT_SECRET` changes, enter the key again.

XP from practice games is self-reported by the browser, so the API limits it: one XP-earning
activity per 20 s and at most 400 XP per day; daily-challenge rewards are paid only after the
server checks the day's counters (`POST /progress/challenges/:id/claim`).

Helper scripts: `pnpm seed` (roles), `pnpm create-teacher`, `pnpm sync:fks` (legacy FK repair for old databases).

## Structure

```
src/core/       security (JWT, guards, rate limit, SSRF guard, CORS, Helmet), ai/anthropic.ts, database/
src/modules/    auth, users, roles, admin, classes, lessons, tests, assignments, vocab-sets,
                flashcard-decks (SM-2), progress, goals, battle, skills (AI exercises saved to skill_materials), entrance-exam (IELTS papers/questions/attempts), schedule, ai
src/migrations/ TypeORM migrations
test/           e2e tests (Supertest)
```

## Tests

```bash
pnpm test          # unit tests (no database)
pnpm test:e2e      # needs a throwaway PostgreSQL: DB_* + DB_SSL=false (the schema is built by the migrations)
pnpm lint:ci       # ESLint + Prettier, no auto-fix
```
