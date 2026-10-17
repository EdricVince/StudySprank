# Deploying StudySpark to Render

StudySpark ships a **Render Blueprint** (`render.yaml`) that provisions both
services in one apply:

| Service | Type | URL (default) |
|---|---|---|
| `studyspark-api` | Docker web service (NestJS) | `https://studyspark-api.onrender.com` |
| `studyspark-web` | Static site (Vue 3 SPA) | `https://studyspark-web.onrender.com` |

The database is **external Supabase PostgreSQL** — Render does not host it.

---

## 1. Prerequisites

- A **Render** account (https://render.com) — free tier is enough.
- This repo on GitHub (already pushed to `EdricVince/final-project`).
- Your **Supabase** connection details (Project → Settings → Database):
  host, port, user, password, database name. Use the **Session pooler**
  (port `5432`) or the pooler host it gives you.
- (Optional) an **Anthropic API key** (`sk-ant-…`) for the AI features.
- (Optional) Gmail **App Password** for password-reset email.
- (Optional) Supabase URL + anon/service keys for Google/Facebook OAuth.

---

## 2. Deploy (one apply)

1. Push the latest code to GitHub (the branch you want to deploy).
2. Render Dashboard → **New** → **Blueprint**.
3. Select this repository and the branch → Render reads `render.yaml`.
4. It shows two services (`studyspark-api`, `studyspark-web`). For every env
   var marked *"sync: false"* Render asks for a value — fill in at least:
   - **API:** `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
     (from Supabase), and `ANTHROPIC_API_KEY` if you want AI features.
   - Leave `SMTP_*`, `SUPABASE_*`, `VITE_SUPABASE_*` blank if you don't need
     password-reset email / OAuth — the app degrades gracefully.
   - `JWT_SECRET` and `ADMIN_SECRET` are auto-generated — nothing to enter.
5. Click **Apply**. First build takes a few minutes (Docker image for the API,
   Vite build for the web).

---

## 3. If Render assigns different URLs

Render URLs come from the service **name**. If `studyspark-api` /
`studyspark-web` are taken, Render appends a suffix (e.g.
`studyspark-api-abcd.onrender.com`) and the two services won't find each other.
After the first deploy, fix these to the **real** URLs and redeploy:

- **API** → env vars `CORS_ORIGINS` and `APP_URL` = the real **Web** URL.
- **Web** → env var `VITE_API_BASE_URL` = the real **API** URL + `/api/v1`.
  (This is baked at build time, so save → **Manual Deploy / Clear build cache**
  to rebuild.)

To avoid this entirely, rename the services to something unique in `render.yaml`
before applying, and update the three URLs to match.

---

## 4. Verify

- **API health:** open `https://<api-url>/` → should return a small JSON/200.
- **Web:** open `https://<web-url>/` → the login page loads.
- Register a student, log in, open the dashboard. Create a teacher via the
  admin dashboard (or `pnpm --filter quiz-app-be create-teacher`); the role,
  not the email domain, decides which portal a user lands in after login.
- If the API log shows a **database SSL** error, confirm your Supabase host is
  correct; the app already connects with `ssl: { rejectUnauthorized: false }`.

---

## 5. Notes & gotchas

- **Free tier sleeps.** The free API spins down after ~15 min idle; the first
  request afterwards cold-starts (a few seconds). Fine for a demo.
- **Schema = migrations.** `quiz-app-be/src/migrations` owns the schema and the
  migrations run automatically when the API boots (`DB_MIGRATIONS_RUN`, default on).
  Keep `DB_SYNCHRONIZE=false` in production. The baseline migration detects a
  database that was created earlier by `synchronize` and only records itself
  (plus seeds the three roles), so switching an existing Supabase DB is safe.
- **Changing an entity:** run `pnpm --filter quiz-app-be migration:generate src/migrations/<Name>`
  against a local/dev DB, review the generated SQL, commit it; the next deploy applies it.
- **Secrets** are entered in the Render dashboard, never committed. `.env`
  stays untracked.

---

## 6. Self-host alternative (Docker Compose)

Not using Render? `docker compose up --build` runs both containers locally
(API `:3000`, Web `:8080`); the DB still points at remote Supabase via
`quiz-app-be/.env`. See `docker-compose.yml`.
