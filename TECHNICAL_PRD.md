# HaytHive POC — Technical PRD

| Field        | Value                                               |
| ------------ | --------------------------------------------------- |
| **Product**  | HaytHive Autonomous Drone Docking & Security System |
| **Document** | Technical Product Requirements Document (POC)       |
| **Status**   | Draft                                               |
| **Stack**    | Next.js (dashboard) · NestJS (API/control plane)    |
| **Related**  | [PROJECT_SCOPE.md](./PROJECT_SCOPE.md)              |

---

## 1. Overview

### 1.1 Problem

Secure sites need a housed UAV that can respond to events without constant human presence: store the aircraft safely, keep it charged and ready, open/raise for launch, stream video/telemetry while airborne, then return, dock, and restore readiness.

### 1.2 POC goal

Deliver a **demonstrable end-to-end system** where an operator (or simulated alert) can:

1. Receive / raise an alert
2. Validate and authorize deployment
3. Open enclosure + raise platform + launch
4. Monitor live video/telemetry
5. Command return
6. Dock, close, charge, and report readiness

Hardware enclosure and UAV integration are owned primarily by HaytHive; IoTeedom owns the **control plane, APIs, dashboard, and integration contracts**.

### 1.3 Non-goals (POC)

- Production industrial design / cosmetic finish
- Multi-site fleet orchestration at scale
- Fully autonomous BVLOS flight stack (use existing UAV autopilot; integrate via defined interfaces)
- Patent-level disclosure beyond NDA-controlled need-to-know

---

## 2. Users & roles

| Role           | Who                       | Capabilities                                                                              |
| -------------- | ------------------------- | ----------------------------------------------------------------------------------------- |
| **Operator**   | Security / ops staff      | View site status, acknowledge alerts, authorize deploy/return, watch live feed, view logs |
| **Supervisor** | Ops lead                  | Everything Operator can do + override abort, manage users (POC: optional)                 |
| **Technician** | Field / install           | Manual lid/platform override (physical + soft), view health diagnostics, service mode     |
| **System**     | Edge controller / sensors | Emit telemetry, alerts, actuator feedback; execute validated commands                     |

POC may collapse Supervisor into Operator if schedule requires it.

---

## 3. Core demonstration scenario

**Happy path (must demo):**

1. Dock is **Ready** (lid closed, platform down, UAV docked, charging OK, health green).
2. Sensor/event (or manual “Simulate alert”) creates an **Alert**.
3. Operator validates context (camera snapshot / live preview + alert metadata).
4. Operator **Authorizes deployment**.
5. System runs safety interlocks → opens lid → raises platform → confirms clear → signals UAV launch readiness.
6. UAV departs; dashboard shows **In flight** with live video + telemetry.
7. Operator issues **Return to dock** (or mission complete triggers return).
8. UAV lands on raised platform → dock confirm → platform lowers → lid closes → charging starts → status **Ready**.
9. Full sequence is written to the **operational log**.

**Failure / safety demos (minimum):**

- Obstruction or limit fault aborts lid/platform motion and surfaces fault state.
- Abort mid-sequence returns actuators to a safe known state where possible and logs the abort.
- Unauthorized users cannot issue deploy/return commands.

---

## 4. System architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js Dashboard (App Router)                             │
│  Orval + React Query · Auth session · Live WebSocket UI     │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS REST + WSS
┌───────────────────────────▼─────────────────────────────────┐
│  NestJS Control Plane                                       │
│  Auth · Missions/Workflow · Devices · Alerts · Telemetry    │
│  OpenAPI (/api/docs) · WebSocket gateway · Audit log        │
└───────┬─────────────────────────────┬───────────────────────┘
        │ MQTT / secure device API    │ Object storage / RTSP
        │                             │ bridge (video)
┌───────▼──────────────┐    ┌─────────▼───────────────────────┐
│  Edge Controller     │    │  Camera / Media path            │
│  (PLC / SBC / MCU)   │    │  Snapshot + live stream URL     │
│  Lid · Platform ·    │    └─────────────────────────────────┘
│  Charge · Sensors ·  │
│  Siren · Lighting    │
└──────────┬───────────┘
           │ Flight API / MAVLink / vendor SDK (TBD)
┌──────────▼───────────┐
│  UAV + Dock interface│
└──────────────────────┘
```

### 4.1 Component responsibilities

| Layer               | Tech                                       | Responsibility                                                                            |
| ------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| **Dashboard**       | Next.js App Router                         | Operator UI: status, alerts, commands, live view, logs                                    |
| **Control plane**   | NestJS                                     | AuthZ, workflow state machine, command validation, persistence, realtime fan-out, OpenAPI |
| **Edge adapter**    | NestJS module + device protocol            | Translate cloud commands ↔ edge; normalize telemetry; heartbeats                          |
| **Edge controller** | HaytHive hardware stack                    | Actuators, sensors, local safety interlocks, charging                                     |
| **UAV interface**   | Vendor/autopilot bridge                    | Arm/launch/RTH/land-dock signals and flight telemetry                                     |
| **Data store**      | PostgreSQL (+ Prisma recommended)          | Users, sites, devices, missions, alerts, health, audit                                    |
| **Realtime**        | NestJS WebSockets (or Redis pub/sub later) | Telemetry, state changes, alert push                                                      |
| **Media**           | RTSP→HLS/WebRTC bridge (POC choice)        | Live video URL consumed by dashboard                                                      |

### 4.2 Stack decisions (locked for POC)

| Concern     | Choice                                    | Notes                                                                      |
| ----------- | ----------------------------------------- | -------------------------------------------------------------------------- |
| Frontend    | **Next.js** (App Router)                  | Client components for live panels; Server Components for shell/auth layout |
| API client  | **Orval** → React Query hooks             | Generated from Nest OpenAPI; no hand-written fetch layer                   |
| Backend     | **NestJS**                                | Feature modules; Swagger at `/api/docs`                                    |
| ORM         | **Prisma** + PostgreSQL                   | Migrations from day one                                                    |
| Auth        | JWT (access) + refresh or session cookie  | Dashboard uses httpOnly cookie preferred for browser                       |
| Device link | MQTT over TLS **or** signed HTTPS polling | Final choice after edge hardware review                                    |
| Lint/format | Biome + Husky (monorepo root)             | Per IoTeedom scaffolding standards                                         |

---

## 5. Functional requirements

### 5.1 Site & dock status

| ID    | Requirement                                                                                                                                           | Priority |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-01 | Dashboard shows dock operational state: `OFFLINE`, `FAULT`, `IDLE`, `READY`, `DEPLOYING`, `IN_FLIGHT`, `RETURNING`, `DOCKING`, `RESTORING`, `SERVICE` | P0       |
| FR-02 | Show lid position (`OPEN`/`CLOSED`/`MOVING`/`UNKNOWN`) and platform position (`UP`/`DOWN`/`MOVING`/`UNKNOWN`)                                         | P0       |
| FR-03 | Show charging status, estimated readiness, and last heartbeat age                                                                                     | P0       |
| FR-04 | Show environmental summary if sensors present (temp, humidity, optional smoke/door)                                                                   | P1       |
| FR-05 | Technician can enter **Service mode** (blocks autonomous deploy; allows manual actuator commands)                                                     | P1       |

### 5.2 Actuator & safety control

| ID    | Requirement                                                                                                                       | Priority |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-10 | Cloud/edge commands for lid open/close and platform raise/lower with acknowledgment                                               | P0       |
| FR-11 | Edge enforces soft/hard limits, obstruction detection, and timeouts; faults propagate to control plane                            | P0       |
| FR-12 | Manual physical override remains available; software reflects override state                                                      | P0       |
| FR-13 | Commands are rejected unless interlocks pass (e.g. cannot close lid while platform up / UAV undocked — exact matrix TBD with CAD) | P0       |
| FR-14 | Abort command stops motion sequence and records reason                                                                            | P0       |

### 5.3 Alert → mission workflow

| ID    | Requirement                                                                                     | Priority |
| ----- | ----------------------------------------------------------------------------------------------- | -------- |
| FR-20 | Create alerts from edge sensors, camera events, or dashboard “Simulate alert”                   | P0       |
| FR-21 | Alert lifecycle: `NEW` → `ACKNOWLEDGED` → `AUTHORIZED` / `DISMISSED` → `CLOSED`                 | P0       |
| FR-22 | Authorization starts a **Mission** bound to one site/dock and one alert (optional)              | P0       |
| FR-23 | Mission state machine mirrors architecture workflow: deploy → monitor → return → dock → restore | P0       |
| FR-24 | Operator can command Return-to-Dock during `IN_FLIGHT`                                          | P0       |
| FR-25 | Every state transition and command is audited with actor, timestamp, payload summary            | P0       |

### 5.4 Telemetry, video, logging

| ID    | Requirement                                                                | Priority |
| ----- | -------------------------------------------------------------------------- | -------- |
| FR-30 | Stream UAV + dock telemetry to dashboard at ≥1 Hz when active (POC target) | P0       |
| FR-31 | Provide live video URL/embed for operator monitoring during mission        | P0       |
| FR-32 | Capture pre-deploy snapshot or short clip attached to alert when available | P1       |
| FR-33 | Operational log UI: filter by time, mission, severity; export CSV optional | P1       |

### 5.5 Security features (site)

| ID    | Requirement                                                                        | Priority |
| ----- | ---------------------------------------------------------------------------------- | -------- |
| FR-40 | Trigger lighting / siren as part of deploy or intrusion alert (edge actuators)     | P1       |
| FR-41 | Camera recording start/stop hooks during mission (storage retention short for POC) | P2       |

### 5.6 Auth & admin

| ID    | Requirement                                                 | Priority |
| ----- | ----------------------------------------------------------- | -------- |
| FR-50 | Sign-in for operators; all command endpoints authenticated  | P0       |
| FR-51 | Role-based authorization for deploy/return/service commands | P0       |
| FR-52 | Seed users for demo; full user admin UI optional            | P2       |

---

## 6. Dashboard (Next.js) requirements

### 6.1 Screens (MVP)

| Route                    | Purpose                                             |
| ------------------------ | --------------------------------------------------- |
| `/login`                 | Authenticate                                        |
| `/` or `/sites/[siteId]` | Dock status board + primary actions                 |
| `/alerts`                | Active/history alerts                               |
| `/missions/[missionId]`  | Live mission console (video + telemetry + controls) |
| `/logs`                  | Operational / audit log                             |
| `/health`                | Device health & connectivity diagnostics            |

### 6.2 UX principles (POC)

- Single primary composition for the mission console: status, one video plane, essential controls — avoid dashboard clutter.
- Destructive / irreversible actions (Authorize deploy, Abort) require explicit confirm.
- Offline / stale telemetry clearly indicated (heartbeat age, banner).
- Prefer optimistic UI only for non-safety actions; actuator commands wait for ack/state.

### 6.3 Frontend technical constraints

- Consume Nest OpenAPI via **Orval** (`client: 'react-query'`).
- Hook naming follows `use{Method}{Resource}` from `operationId` (e.g. `useGetSites`, `usePostMissionsByIdReturn`).
- Live channels via WebSocket client alongside Orval REST.
- No parallel hand-written API wrapper for the same endpoints.

---

## 7. Backend (NestJS) requirements

### 7.1 Feature modules (suggested)

```
apps/api/
  auth/
  users/
  sites/
  devices/          # dock edge registration, heartbeats
  actuators/        # command + state for lid/platform/siren/lights
  alerts/
  missions/         # workflow state machine
  telemetry/        # ingest + fan-out
  media/            # stream URLs / snapshot metadata
  health/
  audit/
  realtime/         # WebSocket gateway
```

### 7.2 OpenAPI / Orval contract

- Swagger UI at `/api/docs`; exportable JSON for Orval.
- Every tag and operation has a **description**; summaries capitalized.
- `operationId` = `{method}{Resource}` camelCase matching path semantics:

| Method + path                   | operationId                 | Orval hook                     |
| ------------------------------- | --------------------------- | ------------------------------ |
| `GET /sites`                    | `getSites`                  | `useGetSites`                  |
| `GET /sites/{id}`               | `getSitesById`              | `useGetSitesById`              |
| `POST /alerts`                  | `postAlerts`                | `usePostAlerts`                |
| `POST /missions/{id}/authorize` | `postMissionsByIdAuthorize` | `usePostMissionsByIdAuthorize` |
| `POST /missions/{id}/return`    | `postMissionsByIdReturn`    | `usePostMissionsByIdReturn`    |
| `POST /actuators/commands`      | `postActuatorsCommands`     | `usePostActuatorsCommands`     |

### 7.3 Mission state machine (normative for POC)

```
READY
  └─(authorize)→ DEPLOYING
                    ├─(fail/abort)→ FAULT | READY (if safe)
                    └─(launch confirm)→ IN_FLIGHT
                                          ├─(return)→ RETURNING
                                          └─(loss/fail)→ FAULT
RETURNING → DOCKING → RESTORING → READY
Any active state → ABORTED (operator/system) → RESTORING or FAULT
```

Transitions are persisted; illegal transitions return `409 Conflict`.

### 7.4 Command model

All actuator / mission commands:

1. Authenticate + authorize
2. Validate current state + interlocks
3. Persist `Command` (`PENDING` → `SENT` → `ACKED` / `FAILED` / `TIMEOUT`)
4. Dispatch to edge
5. Update device/mission state from edge events
6. Emit WebSocket event + audit row

---

## 8. Data model (logical)

| Entity            | Key fields                                                                |
| ----------------- | ------------------------------------------------------------------------- |
| `User`            | id, email, role, passwordHash, createdAt                                  |
| `Site`            | id, name, timezone, location?                                             |
| `Device` (dock)   | id, siteId, type, serial, lastHeartbeatAt, firmware?                      |
| `DeviceState`     | deviceId, opState, lid, platform, charge, extras JSON, updatedAt          |
| `Alert`           | id, siteId, source, severity, status, payload JSON, createdAt             |
| `Mission`         | id, siteId, alertId?, state, startedAt, endedAt, meta JSON                |
| `Command`         | id, deviceId, missionId?, type, status, request, response, createdAt      |
| `TelemetrySample` | id, deviceId, missionId?, ts, payload JSON _(or time-series store later)_ |
| `MediaAsset`      | id, siteId, missionId?, kind (`snapshot`/`recording`), url, createdAt     |
| `AuditEvent`      | id, actorId?, action, entityType, entityId, meta JSON, createdAt          |

Exact schemas refined during implementation; Prisma migrations required.

---

## 9. API surface (MVP sketch)

### REST (illustrative)

- `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- `GET /sites`, `GET /sites/{id}`
- `GET /sites/{id}/state`
- `GET /alerts`, `POST /alerts`, `PATCH /alerts/{id}`
- `POST /missions`, `GET /missions/{id}`, `POST /missions/{id}/authorize`, `POST /missions/{id}/return`, `POST /missions/{id}/abort`
- `POST /actuators/commands`
- `GET /health/devices`
- `GET /logs` (audit + operational)
- `GET /media/live?siteId=`

### WebSocket topics (illustrative)

- `site.{id}.state`
- `site.{id}.telemetry`
- `site.{id}.alerts`
- `mission.{id}.events`

Device-facing ingest may be MQTT topics or `POST /device/ingest` with device credentials — decide with edge stack.

---

## 10. Non-functional requirements

| ID     | Category      | Requirement                                                                                   |
| ------ | ------------- | --------------------------------------------------------------------------------------------- |
| NFR-01 | Safety        | Cloud cannot bypass edge hard interlocks; software limits are additive, not sole protection   |
| NFR-02 | Latency       | Command accept → edge dispatch < 500 ms on lab network; UI state update < 1 s typical         |
| NFR-03 | Availability  | POC single-region; graceful degradation when UAV link drops (show FAULT / lost-link)          |
| NFR-04 | Security      | TLS everywhere; secrets in env/secret store; NDA-controlled sharing of sensitive diagrams     |
| NFR-05 | Audit         | Immutable append-only audit for commands and mission transitions                              |
| NFR-06 | Observability | Structured logs; request correlation IDs; basic metrics (command success rate, heartbeat age) |
| NFR-07 | Testability   | State machine unit tests; API e2e for authorize→abort paths; hardware-in-loop later           |
| NFR-08 | Modularity    | Edge protocol behind an adapter interface so MQTT vs HTTPS swap does not rewrite missions     |

---

## 11. Edge & hardware integration contract

IoTeedom defines a **Dock Device API** (logical). HaytHive edge implements it.

### 11.1 Edge → cloud (telemetry / events)

- Heartbeat + op state
- Lid / platform position & faults
- Charge / readiness
- Sensor alerts
- Command acks / failures
- Optional UAV link status

### 11.2 Cloud → edge (commands)

- `LID_OPEN` / `LID_CLOSE`
- `PLATFORM_RAISE` / `PLATFORM_LOWER`
- `LIGHTS_ON` / `LIGHTS_OFF`
- `SIREN_ON` / `SIREN_OFF`
- `ENTER_SERVICE` / `EXIT_SERVICE`
- `ABORT`
- UAV-related: `PREPARE_LAUNCH`, `SIGNAL_RTH`, `CONFIRM_DOCK` (names TBD with flight stack)

### 11.3 Interlock matrix

To be completed jointly with CAD/mechanical before coding deploy sequences. Software encodes the agreed matrix; edge remains source of truth for hard faults.

---

## 12. Phasing

### Phase 0 — Foundations (week 1–2)

- Monorepo scaffold: NestJS API, Next.js app, Biome, Husky, Prisma, OpenAPI, Orval
- Auth + site/device skeleton + WebSocket hello
- Simulator edge (software mock) for lid/platform/charge

### Phase 1 — Workflow MVP

- Alert → authorize → mission state machine
- Actuator commands against simulator
- Mission console UI (status + controls + fake telemetry)
- Audit log

### Phase 2 — Hardware-in-loop

- Real edge adapter + dock hardware
- Live camera path
- Charging/readiness reporting
- Failure/abort demos

### Phase 3 — Flight integration

- UAV launch / RTH / dock confirm against chosen flight interface
- Full happy-path demo + logging
- Hardening, runbook, proposal updates

Advanced features (multi-dock fleet, analytics, long retention video, mobile native apps) stay **post-POC**.

---

## 13. Success criteria (acceptance)

Aligned with project scope:

1. Repeatable automated lid + platform motion with safe limits (sim then hardware).
2. Reliable launch/landing access and return-to-dock demonstration.
3. Basic charging/readiness + system-health reporting in dashboard.
4. Event alert, remote command, video/telemetry viewing, operational logging demonstrated in one continuous scenario.

**Software-specific acceptance:**

- OpenAPI published; dashboard uses Orval hooks only for REST.
- Mission illegal transitions blocked and tested.
- All operator commands authenticated, authorized, and audited.

---

## 14. Risks & open questions

| Risk / question                       | Impact                       | Mitigation                                                   |
| ------------------------------------- | ---------------------------- | ------------------------------------------------------------ |
| UAV vendor/autopilot API unknown      | Blocks Phase 3               | Define adapter interface early; mock until hardware chosen   |
| Video path (WebRTC vs HLS) complexity | Live view slip               | Start with HLS or vendor iframe; upgrade if latency too high |
| Interlock matrix incomplete           | Unsafe sequences             | No real deploy until matrix signed off                       |
| Edge connectivity unreliable          | False FAULT / stuck missions | Heartbeat timeouts + explicit recovery/service flows         |
| Scope creep into production polish    | Schedule                     | Enforce Phase 0–3 gates                                      |

**Open decisions to confirm in technical meeting:**

1. Edge transport: MQTT vs HTTPS
2. UAV platform and docking electrical interface
3. Camera model and streaming topology
4. Single-site POC only vs multi-site data model from day one (recommend multi-site **model**, single-site **deploy**)
5. Hosting: local lab vs cloud VM for control plane

---

## 15. Deliverables from this PRD

| Deliverable                                   | Owner               |
| --------------------------------------------- | ------------------- |
| System architecture diagram (refined from §4) | IoTeedom            |
| OpenAPI draft + Orval config                  | IoTeedom            |
| Mission state machine + interlock matrix doc  | IoTeedom + HaytHive |
| Edge device protocol spec                     | IoTeedom + HaytHive |
| WBS / schedule / budget range                 | IoTeedom            |
| Hardware CAD interfaces & component list      | HaytHive            |

---

## 16. Document history

| Version | Date       | Notes                                                           |
| ------- | ---------- | --------------------------------------------------------------- |
| 0.1     | 2026-09-15 | Initial technical PRD from scope brief; Next.js + NestJS locked |
