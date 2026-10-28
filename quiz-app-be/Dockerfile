# ── Backend (NestJS) — multi-stage. Build context is the repo ROOT (pnpm workspace). ──
# Build:  docker build -f quiz-app-be/Dockerfile -t studyspark-be .

FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app
# Workspace manifests first for better layer caching.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY quiz-app-be/package.json ./quiz-app-be/
COPY quiz-app-fe/package.json ./quiz-app-fe/
RUN pnpm install --frozen-lockfile --filter quiz-app-be...
COPY quiz-app-be ./quiz-app-be
RUN pnpm --filter quiz-app-be build

FROM node:22-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app
ENV NODE_ENV=production
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY quiz-app-be/package.json ./quiz-app-be/
COPY quiz-app-fe/package.json ./quiz-app-fe/
RUN pnpm install --frozen-lockfile --prod --filter quiz-app-be...
COPY --from=build /app/quiz-app-be/dist ./quiz-app-be/dist
WORKDIR /app/quiz-app-be
EXPOSE 3000
# Runtime config via env (DB_*, JWT_SECRET, ANTHROPIC_API_KEY, ADMIN_EMAIL/ADMIN_PASSWORD, SMTP_*, APP_URL…).
# tsc has no rootDir, so sources under src/ compile to dist/src/* — entry is dist/src/main.js.
CMD ["node", "dist/src/main"]
