# HaytHive

Monorepo for the HaytHive dock management POC.

## Apps

- `apps/web` — Next.js operator dashboard (dummy data for now)
- `apps/api` — NestJS control plane (Prisma + OpenAPI)

## Prerequisites

- Node.js 20+
- pnpm 10
- Docker (for local Postgres)

## Setup

```bash
pnpm install
pnpm db:up
cp apps/api/.env.example apps/api/.env
pnpm db:migrate
```

## Develop

```bash
# API on http://localhost:3001
pnpm db:up
pnpm db:migrate
pnpm --filter @haythive/api prisma:seed
pnpm dev:api

# Web on http://localhost:3000
pnpm dev:web
```

Demo API login: `operator@haythive.local` / `demo`

- API health: http://localhost:3001/health
- Swagger: http://localhost:3001/api/docs
- OpenAPI JSON: http://localhost:3001/api/docs-json
