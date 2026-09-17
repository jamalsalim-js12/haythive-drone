# Prisma schema — HaytHive Dock MVP

Source of truth: `schema.prisma`. Keep enums aligned with `apps/web/src/lib/types.ts`.

## Models

| Model | Purpose |
| --- | --- |
| `User` | Admin / operator / technician accounts |
| `UserInvite` | One-time invite tokens for onboarding users |
| `Site` | Optional grouping for docks |
| `Device` | Dock registration + heartbeat |
| `DeviceState` | Latest lid/platform/charge/readiness projection (1:1) |
| `Command` | Actuator command lifecycle |
| `AuditEvent` | Append-only audit log |

## Enums

| Enum | Values |
| --- | --- |
| `UserRole` | `ADMIN`, `OPERATOR`, `TECHNICIAN` |
| `Connectivity` | `ONLINE`, `OFFLINE`, `DEGRADED` |
| `OpState` | `IDLE`, `MOVING`, `FAULT`, `SERVICE` |
| `LidState` | `OPEN`, `CLOSED`, `MOVING`, `UNKNOWN` |
| `PlatformState` | `UP`, `DOWN`, `MOVING`, `UNKNOWN` |
| `ChargeStatus` | `UNKNOWN`, `NOT_CHARGING`, `CHARGING`, `CHARGED`, `FAULT` |
| `Readiness` | `READY`, `NOT_READY` |
| `CommandType` | `LID_OPEN`, `LID_CLOSE`, `PLATFORM_RAISE`, `PLATFORM_LOWER`, `ABORT` |
| `CommandStatus` | `PENDING`, `SENT`, `ACKED`, `FAILED`, `TIMEOUT` |
| `AuditEntityType` | `COMMAND`, `STATE`, `HEALTH`, `AUTH`, `DEVICE` |

## Commands

```bash
pnpm db:up
pnpm --filter @haythive/api prisma:migrate
pnpm --filter @haythive/api prisma:generate
```
