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
  A word is always asked in the language being learned and answered in a different language (an English interface
  while learning English explains the words in Vietnamese).
- Learning history: every finished flashcard session and quiz game is saved word by word (Flashcards → History,
  Quizzes → History). Open one to see the words and how you did, study them again, or practise only the missed ones.
- AI skill practice: reading, listening (browser TTS), writing (band-score feedback), speaking (speech recognition + feedback).
- AI IELTS mock test (Listening / Reading / Writing) and AI monthly study planner. Every generated paper, its questions
  and each student's attempts are stored in PostgreSQL, so past results can be reviewed and papers retaken.
- XP, levels, streaks, goals, achievements, leaderboard.
- Statistics: a student's own progress only — words practised and learned, accuracy, study time and trends against the previous
  period, activity chart, accuracy per game, words still to practise, class tests and IELTS skills; all computed from what they
  really did (flashcard sessions, quiz games, tests, mock exams).
- Classes: join by code (Quizzes or My Classes page). Each class has its own page with the tests, handouts, lessons, vocabulary sets and flashcard decks its teacher shared — class flashcard decks are visible to that class only.

**Teachers** — Analytics covers only the students who have joined their classes (all classes, or one class chosen in the filter):
activity, test results, who needs attention and a progress row per student. A student who leaves a class disappears from it.
A class page per class (students with progress, tests, assignments, lessons, vocabulary sets, flashcard decks and an activity feed; content can be created from the class page and is linked to it),
AI-assisted content generation.

**Admin** — a normal account with the admin role, working in the same portal as teachers: approves or rejects teacher applications, manages users, sets the Anthropic API key and browses the activity log.

**Teacher onboarding** — teachers apply from the sign-up page with their school and a photo of an ID/certificate; the account stays *pending* (it can sign in but cannot create classes or content) until an admin approves it. Every class, test, assignment, lesson and flashcard deck belongs to exactly one teacher; students join a class with its code. Create/update/delete actions are written to the `activity_logs` table (browse the `activity_feed` and `teacher_overview` views in Supabase).

Every AI result is labelled "AI-generated" in the UI. Without an Anthropic key the AI endpoints answer `503`
and the rest of the app keeps working.

## Quick start (local)

Requirements: Node 22, pnpm 10, a PostgreSQL database (local or Supabase).

```bash
pnpm install
cp quiz-app-be/.env.example quiz-app-be/.env   # fill in DB_* and JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
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

## Where the data lives (Supabase → Table Editor)

Supabase *is* a hosted PostgreSQL database: the tables below are what you see in **Table Editor** (schema
`public`). Everything is written by the API; nothing important is kept only in the browser or in memory.

| What | Table (view) |
|---|---|
| Accounts, roles, teacher applications | `users`, `roles` |
| Classes and who joined them | `classes`, `class_enrollments` |
| Tests a teacher creates (typed, AI-generated or imported from a CSV file) and student results | `tests`, `test_submissions` |
| Assignments / handouts | `assignments` |
| Lessons, vocabulary sets | `lessons`, `vocab_sets` |
| Flashcard decks (including class decks, and decks imported from a CSV file) | `flashcard_decks`, `card_reviews` |
| IELTS mock exams generated by the AI, their questions and every student attempt | `exam_papers`, `exam_questions`, `exam_attempts` |
| AI reading / listening / writing / speaking practice material | `skill_materials` |
| **Everything the AI produced or graded**, with the request behind it: lessons, vocabulary sets, tests, content scans, study schedules, writing and speaking evaluations, vocabulary, word of the day, Battle Mode questions | `ai_generations` (readable: `ai_generation_feed`) |
| **Learning history**: every finished flashcard session (own, class or vocabulary-set deck, AI practice) and quiz game, with each word, its meaning and whether the student knew it | `learning_sessions`, `learning_session_words` (readable, with the class of a class deck: `learning_history_feed`) |
| Who created or changed what (classes, tests, decks…) | `activity_logs` (readable: `activity_feed`, `teacher_overview`) |
| **Account control**: every account with its role, status, verification, last sign-in and (for teachers) the application: organization, when they applied, which admin decided, when, and why | `user_accounts`, `teacher_applications` (the full trail of one account: `activity_feed` with `entity_type = 'user'` and `entity_id` = the account id) |

The admin portal ("Details" on a teacher application, "Full account record" on a user) reads exactly these
views and the activity trail, so what an admin sees and what the database holds are the same.

Importing from a file: teachers can load test questions (`Question, Option A–D, Correct, Points`) on the
test builder and flashcards (`Term, Definition, Example`) in a class deck; the rows are stored when the
test / deck is saved.

## Repository layout

```
quiz-app-be/        NestJS API (modules/, core/ security + AI client + database, migrations/)
quiz-app-fe/        Vue SPA (pages/, components/, stores/, composables/, i18n/locales/)
render.yaml         Render blueprint
docker-compose.yml  Local container setup
DEPLOYMENT.md       Deployment guide
```
