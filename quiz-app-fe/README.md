# StudySpark Web (quiz-app-fe)

Vue 3.5 + TypeScript SPA (Vite 7, Pinia, vue-router, vue-i18n, Tailwind 4, Socket.IO client).

## Run

```bash
cp .env.example .env
pnpm install        # from the repo root
pnpm dev            # http://localhost:5173
```

| Variable | Notes |
|---|---|
| `VITE_API_BASE_URL` | API base including `/api/v1` (default `http://localhost:3000/api/v1`). Baked in at build time. |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Only for Google/Facebook login. |

## Structure

```
src/pages/          student/, teacher/, admin/, auth/ — one file per route (see src/router)
src/components/     feature folders (quiz/, flashcard/, exam/, …) and ui/ primitives
src/stores/         Pinia stores (auth with refresh-token rotation, progress, quiz, admin, …)
src/composables/    shared logic (useQuizCompletion, useVocabulary, useLocale, …)
src/utils/          api client, SM-2 helpers (srs.ts), skill-page helpers (skills.ts)
src/i18n/locales/   en.ts, vi.ts, zh.ts — every key must exist in all three (checked by a test)
```

## i18n

All student and teacher screens are translated (English, Vietnamese, Chinese); the admin screens are English
only. vue-i18n treats `@ { } |` as syntax: write a literal `@` as `{'@'}`, and use `|` only for plural forms.

## Tests

```bash
pnpm test      # Vitest + @vue/test-utils (jsdom); specs get the real English messages (src/test-setup.ts)
pnpm lint
pnpm build     # vue-tsc type-check + production build
```
