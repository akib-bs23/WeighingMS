---
stage: design
bolt: 006-weighing-station
created: 2026-10-29T11:55:00Z
---

## Technical Design: weighing-station (bolt 1 of 3 — session, tolerance, scale/tare, confirm, progression)

No source code was read or written to produce this document, per the Technical Design stage constraint. This design follows the approved `ddd-01-domain-model.md` and the project standards (`tech-stack.md`, `data-stack.md`, `coding-standards.md`).

### Architecture Pattern

**Layered architecture inside one NestJS module** (`WeighingModule`), matching the pattern already used by units 001–004 (port/adapter for externals, Nest DI, no framework imports in pure domain logic). No new architectural pattern is introduced (no CQRS/event sourcing) — the domain events listed in the model are **conceptual** (they name what happens, for the ubiquitous language and for logging) rather than an event bus; this is a single-process training app with one writer, so a messaging layer would add complexity with no benefit. This is not ADR-worthy: it is simply "use the pattern already in the standards," not a deviation from them.

### Layer Structure

```text
┌──────────────────────────────────────────────┐
│ Presentation   WeighingController              │  HTTP (DTOs in, views out)
├──────────────────────────────────────────────┤
│ Application    WeighingSessionService          │  use cases: start, resume,
│                                                  │  activateComponent, retare, confirm
├──────────────────────────────────────────────┤
│ Domain         ToleranceEvaluator, ScaleSelector,│  pure, framework-free
│                ProgressionPolicy (src/shared)    │  (also imported by the UI)
├──────────────────────────────────────────────┤
│ Infrastructure WeighingSessionRepository,        │  Drizzle over SQLite;
│                WeighingRecordRepository;         │  ScalePort (002), Batches-
│                ScalePort / BatchSelectionService │  Service (003) consumed
│                (consumed, not implemented here)  │  via Nest DI
└──────────────────────────────────────────────┘
```

Pure domain logic (`ToleranceEvaluator`, `ScaleSelector`, `ProgressionPolicy`) lives in `src/shared/weighing/` — not `src/server/weighing/domain/` as the generic bolt-type template suggests — because the **UI needs the identical tolerance/zone rules** (bolt 007's live readout) and the standards require one shared rule library rather than duplicating it per side (coding-standards: "pure business rules live in `src/shared`"). The application/infrastructure/presentation layers live under `src/server/weighing/`.

### API Design

All new endpoints are under `/api/sessions`, continuing the WeighingMS application API (as distinct from the `/api/batches`, `/api/scales` Dummy contracts). Errors follow the existing `{ error: { code, message, details? } }` format (coding-standards).

| Endpoint | Method | Request | Success | Notes |
|----------|--------|---------|---------|-------|
| `/api/sessions` | POST | `{ batchId: string }` | `200 SessionView` | Starts, or **resumes** if a session for that batch is already open (idempotent per story 001) |
| `/api/sessions/:sessionId` | GET | — | `200 SessionView` | Reload/resume path (NFR-6) |
| `/api/sessions/:sessionId/components/:componentId/activate` | POST | — | `200 SessionView` | Only a `PENDING` component may be activated |
| `/api/sessions/:sessionId/retare` | POST | — | `200 SessionView` | Re-tares the active component's scale; no record |
| `/api/sessions/:sessionId/confirm` | POST | — (server reads the scale itself) | `200 ConfirmResult` | `{ record: WeighingRecordView, session: SessionView }` in one round trip, since the UI needs both the new record and the (progressed) session state |

**Why no body on activate/retare/confirm**: the component and session are already identified by the URL, and confirm deliberately does **not** accept a client-supplied weight (story 005 AC4 — the server is authoritative, reading via `ScalePort` itself).

**Error mapping** (new to this bolt):

| Code | Status | When |
|------|--------|------|
| `SESSION_NOT_FOUND` | 404 | Unknown `sessionId` |
| `SESSION_ALREADY_OPEN` | 409 | Starting a session for batch A while a different batch's session is open at this station (AS-6) |
| `COMPONENT_NOT_FOUND` | 404 | Unknown `componentId` for the session |
| `COMPONENT_DONE` | 409 | Activating a component already `DONE` (story 011 edge case) |
| `COMPONENT_NOT_ACTIVE` | 409 | Confirm/retare called when the targeted component isn't the active one (defensive; the UI never does this) |
| `OUT_OF_TOLERANCE` | 422 | Confirm attempted while the server's own reading is not in the `OK` zone (story 005 AC2) |
| `READING_UNSTABLE` | 422 | Confirm attempted while the scale reports `stable: false` (story 005 AC3) |
| (propagated) `SCALE_UNAVAILABLE` | 503 | From `ScalePort` during activate/retare/confirm — unchanged, not re-wrapped |
| (propagated) `BATCH_NOT_RELEASED`, `BATCH_NOT_FOUND`, `ORGATEX_UNAVAILABLE` | 409/404/503 | From `BatchSelectionService.prepareForWeighing` on **start** only — resuming an existing session never calls OrgaTEX again (brief BR-16: an outage must not stop weighing already in progress) |

**View shapes** (shared contracts, `src/shared/contracts/weighing.ts`):

```text
SessionView:      sessionId, batchId, stationId, operatorId, status,
                   activeComponentId, startedAt, completedAt,
                   components: ComponentView[]
ComponentView:     componentId, sequence, state, dyestuff{code,name,colourHex,barcode},
                   lotId, containerId, scaleId, scaleClass, uom,
                   targetMg, toleranceMg, displayMaxMg, tareMg
WeighingRecordView: recordId, sessionId, componentId, lotId, containerId, tareMg,
                   scaleId, targetMg, toleranceMinMg, toleranceMaxMg, actualMg, uom,
                   result, operatorId, confirmedAt
ConfirmResult:     { record: WeighingRecordView, session: SessionView }
```

### Data Model

Three new Drizzle tables (migration to follow in Implement), continuing the integer-mg, no-floating-point convention of every existing table:

- **`weighing_sessions`** — `session_id` (uuid, PK), `batch_id`, `station_id`, `operator_id`, `status` (`IN_PROGRESS`|`COMPLETED`), `active_component_id` (nullable), `started_at`, `completed_at` (nullable). Unique partial constraint enforced in code (not SQL, SQLite has no partial-unique syntax we want to lean on here): at most one row per `station_id` with `status = 'IN_PROGRESS'` — checked by the repository before insert (AS-6).
- **`session_components`** — `id` (autoincrement PK), `session_id` (FK), `component_id`, `sequence`, `state` (`PENDING`|`ACTIVE`|`DONE`), `dyestuff_code`, `dyestuff_name`, `colour_hex`, `barcode`, `lot_id`, `container_id`, `target_mg`, `uom`, `tolerance_mg`, `display_max_mg`, `scale_id` (nullable until first activation), `tare_mg` (nullable). Unique `(session_id, component_id)`. This is the **recipe snapshot** (one row per component, copied from the recipe at session start — never re-read from OrgaTEX afterwards).
- **`weighing_records`** — `record_id` (uuid, PK), `session_id` (FK), `component_id`, `lot_id`, `container_id`, `tare_mg`, `scale_id`, `target_mg`, `tolerance_min_mg`, `tolerance_max_mg`, `actual_mg`, `uom`, `result` (`IN_TOLERANCE`|`OVERRIDDEN`, with `COMPENSATED` reserved for bolt 009), `operator_id`, `confirmed_at`. **No update or delete path is ever implemented against this table** (NFR-9) — the repository exposes only `add` and read methods.

Relationships: `session_components.session_id → weighing_sessions.session_id`; `weighing_records.session_id → weighing_sessions.session_id`. `weighing_records` does not FK to `session_components` by its own `id` (autoincrement, internal) — it references the stable `component_id` string instead, so a record remains meaningful even if session rows were ever reseeded.

### Security Design

No new privileged actions in this bolt (supervisor override is bolt 008). The session's `operator_id` is the fixed training operator from `GET /api/station` (TD-6) — no login, no token. Every write endpoint is server-authoritative: the client never supplies a weight value or a tolerance result; the server always re-reads the scale via `ScalePort` and re-computes the zone itself (closes the "trust the client" gap named in story 005 AC4). No secrets are introduced.

### NFR Implementation

| NFR | Approach |
|-----|----------|
| NFR-6 Resumable after reload | Full session state (including every component's `state`) is persisted to SQLite on each transition; `GET /api/sessions/:sessionId` is the resume path the UI calls after a reload |
| NFR-7 Durable before acknowledge | better-sqlite3 is a **synchronous** driver (already configured with WAL in bolt 001); the `confirm` handler's insert into `weighing_records` completes before the HTTP response is written — no async queue or buffering between accepting the confirmation and it being on disk |
| NFR-8 Integer-mg arithmetic | All new columns are SQLite `INTEGER`; all new pure logic (`ToleranceEvaluator`, `ScaleSelector`) operates only on integers, reusing the `Quantity`-shaped values already established in bolt 001's `parseQuantity`/`formatQuantity` |
| NFR-9 Immutable records | No PATCH/PUT/DELETE route exists for `/api/sessions/:id` records; `WeighingRecordRepository` exposes only `add` + reads |
| NFR-2 (recipe already loaded) | Session start reuses the recipe `BatchSelectionService.prepareForWeighing` already returned in bolt 004 — no duplicate OrgaTEX round trip |
| NFR-1 (live weight latency) | Unaffected by this bolt — the UI continues to poll `ScalePort`'s HTTP endpoint directly (TD-10, unchanged); this bolt only reads the scale **once**, synchronously, inside `confirm` |

### Integrations

| Dependency | From | Used for |
|------------|------|----------|
| `ScalePort` | unit 002 (`ScaleModule`) | `tare()` on activate/retare; `readWeight()` inside `confirm` |
| `BatchSelectionService` | unit 003 (`BatchesModule`, already exported) | `prepareForWeighing(batchId)` on session **start** only |
| `CLOCK` | bolt 002's shared clock provider | `startedAt`/`confirmedAt` timestamps, testable with the existing `FakeClock` |
| `DATABASE` | bolt 001's Drizzle provider | all three new tables |

No new runtime package is required.

### Module Plan (for Implement)

```text
src/shared/weighing/
  tolerance.ts          ToleranceBand, Zone, evaluateZone, remaining, statusText
  scale-selection.ts     selectScaleClass
  progression.ts          nextActive
src/shared/contracts/
  weighing.ts             SessionView, ComponentView, WeighingRecordView, ConfirmResult
src/server/database/schema/
  weighing.ts             weighing_sessions, session_components, weighing_records
src/server/weighing/
  weighing-session.repository.ts
  weighing-record.repository.ts
  weighing-session.service.ts
  weighing.controller.ts
  weighing.module.ts
```

### Completion Criteria

- [x] Architecture pattern selected and documented (layered, consistent with existing units; justified, not ADR-worthy)
- [x] All layers designed with responsibilities
- [x] API contracts defined (5 endpoints, view shapes, error mapping)
- [x] Database schema designed (3 tables, relationships, immutability guarantee)
- [x] NFRs addressed (6 rows above)
- [x] Security patterns applied (server-authoritative reads; no new secrets)
- [x] Integrations planned (ScalePort, BatchSelectionService, shared clock, database)
