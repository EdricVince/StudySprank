# StudySpark

An English-learning platform with AI-generated practice, spaced-repetition flashcards,
real-time quizzes and a teacher portal. Graduation project.

| Part | Stack | Folder |
|---|---|---|
| Web app | Vue 3.5, TypeScript, Pinia, vue-i18n (en / vi / zh), Tailwind 4, Vite 7 | [quiz-app-fe](quiz-app-fe/) |
| API | NestJS 11, TypeORM 0.3, PostgreSQL, Socket.IO, Anthropic Claude | [quiz-app-be](quiz-app-be/) |
| Database | PostgreSQL 16 (Supabase in production) | schema in [quiz-app-be/src/migrations](quiz-app-be/src/migrations) |

## Features

**Students**
- Flashcard decks with SM-2 spaced repetition (due cards, "why this card" reasons), CSV import/export.
- Quiz modes: multiple choice, true/false, speed round, matching pairs, word scramble, typing, idioms, 1-vs-1 battle.
- AI skill practice: reading, listening (browser TTS), writing (band-score feedback), speaking (speech recognition + feedback).
- AI entrance exam (IELTS / TOEIC / TOEFL format) and AI monthly study planner.
- XP, levels, streaks, goals, achievements, leaderboard.
- Classes: join by code, see assigned tests, vocabulary sets, lessons, videos and handouts; live quizzes.

**Teachers** — classes, tests (with results), lessons, vocabulary sets, videos, assignments, live quiz hosting,
AI-assisted content generation.

**Admin** — user management, teacher accounts, Anthropic API key (dashboard protected by `ADMIN_SECRET`).

Every AI result is labelled "AI-generated" in the UI. Without an Anthropic key the AI endpoints answer `503`
and the rest of the app keeps working.

## Quick start (local)

Requirements: Node 22, pnpm 10, a PostgreSQL database (local or Supabase).

```bash
pnpm install
cp quiz-app-be/.env.example quiz-app-be/.env   # fill in DB_* and JWT_SECRET, ADMIN_SECRET
cp quiz-app-fe/.env.example quiz-app-fe/.env   # VITE_API_BASE_URL (defaults to localhost:3000)
pnpm dev                                       # API on :3000, web on :5173
```

The API applies the database migrations on start-up, so an empty database is ready after the first boot
(the three roles STUDENT / TEACHER / ADMIN are seeded by the baseline migration). Create a teacher with
`pnpm --filter quiz-app-be create-teacher` or from the admin dashboard (`/admin`).

## Tests & checks

| Command | What it runs |
|---|---|
| `pnpm --filter quiz-app-be test` | API unit tests (Jest, no database) |
| `pnpm --filter quiz-app-be test:e2e` | API end-to-end tests (Supertest) against a real PostgreSQL — set `DB_*`, `DB_SSL=false` |
| `pnpm --filter quiz-app-be lint:ci` | ESLint + Prettier for the API |
| `pnpm --filter quiz-app-fe test` | Web unit/component tests (Vitest) |
| `pnpm --filter quiz-app-fe lint` / `build` | ESLint / type-check (vue-tsc) + production build |

GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs all of the above on every push,
with a PostgreSQL 16 service for the e2e job.

## Deployment

Render blueprint ([render.yaml](render.yaml)): the API as a Docker web service, the web app as a static site,
Supabase as the database. Step-by-step guide: [DEPLOYMENT.md](DEPLOYMENT.md).
`docker compose up --build` runs both containers locally.

## Repository layout

```
quiz-app-be/        NestJS API (modules/, core/ security + AI client + database, migrations/)
quiz-app-fe/        Vue SPA (pages/, components/, stores/, composables/, i18n/locales/)
render.yaml         Render blueprint
docker-compose.yml  Local container setup
DEPLOYMENT.md       Deployment guide
```
