# @haythive/api

NestJS control plane for the HaytHive dock MVP.

## Scripts

```bash
pnpm --filter @haythive/api dev
pnpm --filter @haythive/api prisma:migrate
pnpm --filter @haythive/api prisma:seed
pnpm --filter @haythive/api prisma:generate
```

## Auth (demo)

After seeding:

- Email: `admin@ioteedom.com` (or `SEED_ADMIN_EMAIL` / `SEED_OPERATOR_EMAIL`)
- Password: `admin123` (or `SEED_ADMIN_PASSWORD` / `SEED_OPERATOR_PASSWORD`)
- Role: `ADMIN`

Admins invite users via `POST /users/invites`; invitees accept at `POST /auth/accept-invite` (web: `/invite/{token}`).

```bash
# login (sets httpOnly cookie haythive_session)
curl -c cookies.txt -H 'Content-Type: application/json' \
  -d '{"email":"admin@ioteedom.com","password":"admin123"}' \
  http://localhost:3001/auth/login

curl -b cookies.txt http://localhost:3001/auth/me
```

## Device ingest (edge / simulator)

After seeding, dock token defaults to `dev-dock-token`:

```bash
curl -H 'Content-Type: application/json' -H 'X-Device-Token: dev-dock-token' \
  -d '{"serial":"HH-DOCK-001","lid":"OPEN","platform":"UP","socPercent":92}' \
  http://localhost:3001/device/ingest
```

Stale heartbeats project to `DEGRADED` / `OFFLINE` on `GET /devices/{id}/state` and `/health` device counts (`HEARTBEAT_DEGRADED_MS`, `HEARTBEAT_OFFLINE_MS`).

## Docs

- Swagger UI: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
- OpenAPI JSON: [http://localhost:3001/api/docs-json](http://localhost:3001/api/docs-json)
- Health: [http://localhost:3001/health](http://localhost:3001/health)
