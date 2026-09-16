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

- Email: `operator@haythive.local`
- Password: `demo`

```bash
# login (sets httpOnly cookie haythive_session)
curl -c cookies.txt -H 'Content-Type: application/json' \
  -d '{"email":"operator@haythive.local","password":"demo"}' \
  http://localhost:3001/auth/login

curl -b cookies.txt http://localhost:3001/auth/me
```

## Docs

- Swagger UI: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
- OpenAPI JSON: [http://localhost:3001/api/docs-json](http://localhost:3001/api/docs-json)
- Health: [http://localhost:3001/health](http://localhost:3001/health)
