# HaytHive

Monorepo for the HaytHive dock management POC.

## Apps

- `apps/web` — Next.js operator dashboard (Orval → Nest API)
- `apps/api` — NestJS control plane (Prisma + OpenAPI)

## Prerequisites

- Node.js 20+
- pnpm 10
- Docker (for local Postgres)

## Setup

```bash
pnpm install
pnpm db:up
# Create apps/api/.env locally (see apps/api/README.md)
pnpm db:migrate
pnpm --filter @haythive/api prisma:seed
```

## Develop

```bash
# API on http://localhost:3001
pnpm db:up
pnpm db:migrate
pnpm --filter @haythive/api prisma:seed
pnpm dev:api

# Web on http://localhost:3000
# Optional: NEXT_PUBLIC_API_URL=http://localhost:3001
pnpm dev:web
```

Demo login: `operator@haythive.local` / `demo`

- API health: http://localhost:3001/health
- Swagger: http://localhost:3001/api/docs

## API client (web)

```bash
pnpm --filter @haythive/web api:fetch-openapi
pnpm api:generate
```
