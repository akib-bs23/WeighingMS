---
stage: design
bolt: 008-weighing-station
created: 2026-10-30T10:40:00Z
---

## Technical Design: weighing-station (bolt 2 of 3 — reading safety, identity, override, quit, records/audit)

No source code was read or written to produce this document, per the Technical Design stage constraint. This design follows the approved `ddd-01-domain-model.md` (this bolt), `memory-bank/bolts/006-weighing-station/ddd-02-technical-design.md` (the design it extends), and the project standards.

### Architecture Pattern

Unchanged from 🟢 006: layered architecture inside the existing `WeighingModule`. This bolt adds operations and routes to the same module rather than a new one — `WeighingSessionService` already owns the aggregate's lifecycle, and reading safety/identity/override/quit/audit are all operations *on* that same aggregate, not a separate bounded context. No ADR is warranted (same reasoning as 006: this is "extend the pattern already in the standards," not a deviation from it).

### Clarification on confirm ordering (resolves an ambiguity in the approved domain model)

`ddd-01-domain-model.md`'s Ordering rule lists `ReadingValidity` ahead of `stable`. Concretely, the Dummy scale's **only** way to produce `netMg: null` is the same `NO_READING` fault that already sets `stable: false` (unchanged since bolt 002) — so a `null` reading is already caught by 🟢 006's existing `READING_UNSTABLE` branch today, and nothing in story 006 asks for that to change (its three example invalid values — −5 g, NaN, 3 500 g — are all numbers, not "missing"). Re-ordering so `ReadingValidity` runs *before* the null/stability check would silently reclassify every existing `NO_READING`/unstable case as `INVALID_READING`, changing bolt 006's already-tested, already-approved behaviour without any story asking for it.

**Resolved ordering** (what Implement will actually build): (1) `SCALE_UNAVAILABLE` (unchanged) → (2) `netMg === null || !stable` → `READING_UNSTABLE` (unchanged) → (3) *new*: `classifyReading` on the now-guaranteed-numeric `netMg` → `INVALID_READING` if negative or over capacity → (4) *new*: `identity === 'MISMATCH'` → `IDENTITY_MISMATCH` → (5) unchanged: `Zone` → `OUT_OF_TOLERANCE` if not `OK`. `ReadingValidity` therefore adds coverage only for *present-but-impossible* numbers — the actual gap story 006 identifies — without touching the already-correct `null`/unstable path. Flagging this now, before Implement, rather than discovering it as a "fix" during Test.

### API Design

All new endpoints are under the existing `/api/sessions` resource (same module, same error envelope).

| Endpoint | Method | Request | Success | Notes |
|----------|--------|---------|---------|-------|
| `/api/sessions/:sessionId/identity` | POST | `{ code: string }` | `200 SessionView` | Sets the active component's `identity`. A code that isn't any known dyestuff barcode (e.g. a batch card) is a no-op — ignored, not an error (story 007 edge case) |
| `/api/sessions/:sessionId/override` | POST | `{ pin: string, reason: string }` | `200 ConfirmResult` | Same response shape as confirm (record + progressed session) — override *is* confirm's privileged variant, not a separate flow the UI has to render differently |
| `/api/sessions/:sessionId/quit` | POST | — | `200 SessionView` | Active component only; no-op-safe (nothing to quit if none active → `COMPONENT_NOT_ACTIVE`, reusing 🟢 006's existing error) |
| `/api/sessions/:sessionId/weighings` | GET | — | `200 WeighingRecordView[]` | Story 013 AC1 |
| `/api/sessions/:sessionId/audit` | GET | — | `200 AuditEventView[]` | Story 013 AC2, time-ordered |

**Error mapping (new to this bolt)**:

| Code | Status | When |
|------|--------|------|
| `INVALID_READING` | 422 | Confirm/override: the (stable, non-null) reading is negative or exceeds the scale's capacity |
| `IDENTITY_MISMATCH` | 409 | Confirm/override: the active component's `identity` is `MISMATCH` |
| `SUPERVISOR_AUTH_FAILED` | 401 | Override: PIN does not match the seeded supervisor's hash |
| `REASON_REQUIRED` | 400 | Override: `reason` is empty/whitespace-only |

Unchanged from 🟢 006: `SESSION_NOT_FOUND` 404, `COMPONENT_NOT_ACTIVE` 409 (now also covers Quit/identity/override with no active component), `READING_UNSTABLE` 422, `OUT_OF_TOLERANCE` 422, propagated `SCALE_UNAVAILABLE` 503.

**View shape additions** (`src/shared/contracts/weighing.ts`):

```text
ComponentView adds:
  identity: 'UNVERIFIED' | 'VERIFIED' | 'MISMATCH'
  identityMismatchDetail: string | null   // exact wording, story 007 AC2:
                                           // "Wrong dyestuff: scanned DYE-2204, expected DYE-4471"

WeighingRecordView adds:
  override: { supervisorId: string, reason: string, authorisedAt: string } | null
            // null for IN_TOLERANCE records; populated for OVERRIDDEN ones

AuditEventView (new):
  eventId, sessionId, type ('OVERRIDE' | 'ABANDON' | 'REPRINT'), actorId, detail, occurredAt
```

No change to `SessionView` or `ConfirmResult` themselves — `ConfirmResult.record` just sometimes carries a non-null `override` now.

### Data Model

Continuing the integer-mg, no-floating-point convention; two new tables, one existing table gains two columns:

- **`session_components`** (🟢 006, extended) — add `identity` (text, default `'UNVERIFIED'`), `identity_mismatch_detail` (text, nullable).
- **`overrides`** (new) — `override_id` (uuid, PK), `record_id` (FK → `weighing_records.record_id`), `supervisor_id`, `reason`, `authorised_at`. One row per `OVERRIDDEN` `WeighingRecord`, created in the same transaction as that record (Invariant 6). No update/delete path, consistent with `weighing_records`.
- **`audit_events`** (new) — `event_id` (uuid, PK), `session_id` (FK → `weighing_sessions.session_id`), `type` (`OVERRIDE`|`ABANDON`|`REPRINT`), `actor_id`, `detail`, `occurred_at`. Append-only; `listBySession` orders by `occurred_at`.

**No new table for the supervisor.** The training operator roster (including the one seeded supervisor and its `pinHash`) already lives in `data/seed.json` and is served through `SeedService` (the same component that already serves container master tares, TD-4, and the station's operator, TD-6) — it is static training fixture data, not session state, so it needs no DB table and no reset-registry entry (nothing to reset). `SeedService` gains one read method for it.

Relationships: `overrides.record_id → weighing_records.record_id`; `audit_events.session_id → weighing_sessions.session_id`.

### Security Design

- **PIN never persisted, logged, or returned.** The `override` endpoint's request DTO holds it only for the duration of the request; `DomainError`'s `details` payload for `SUPERVISOR_AUTH_FAILED` carries no PIN-derived data (not even a partial/masked one — NFR-11 is "never appears," not "never appears in full").
- **PIN verification**: scrypt, matching the format already seeded (`scrypt$<saltHex>$<hashHex>`) — derive a key from the submitted PIN with the stored salt and compare against the stored hash using a constant-time comparison (Node's `crypto.timingSafeEqual`), not `===`, to avoid a timing side-channel on an otherwise low-stakes training credential (cheap to do correctly, so there's no reason not to).
- **No new attack surface for the rest of the API**: every other new endpoint (identity, quit, the two GETs) carries no credential and changes nothing about who may call `/api/sessions/*` — unchanged from 🟢 006 (no login system in this training build, TD-6).

### NFR Implementation

| NFR | Approach |
|-----|----------|
| NFR-9 Immutable records | `overrides` and `audit_events` are append-only, same pattern as `weighing_records`; no PATCH/PUT/DELETE route for any of the three |
| NFR-11 PIN never exposed | See Security Design — verified by a dedicated test asserting the PIN string never appears in any response body or thrown error's `details` |
| NFR-27 (records/audit retrievable, FR-27) | The two new GET endpoints, backed by the two repositories' `listBySession` |
| NFR-8 Integer-mg arithmetic | Unaffected — no new quantity field; `ReadingValidity` operates on the same integer `netMg` already in use |

### Integrations

| Dependency | From | Used for |
|------------|------|----------|
| `SeedService` | unit 003 training (`TrainingModule`, already exported) | the one seeded supervisor's `operatorId`/`pinHash` |
| `ScalePort` | unit 002 | unchanged uses (tare on Quit, read on confirm/override) |
| `CLOCK`, `DATABASE` | bolts 001/002 | `occurredAt`/`authorisedAt` timestamps; the two new tables |

No new runtime package (`crypto` is a Node builtin).

### Module Plan (for Implement)

```text
src/shared/weighing/
  reading-safety.ts        classifyReading(reading, capacityMg): ReadingValidity
src/shared/contracts/
  weighing.ts               extend ComponentView, WeighingRecordView; add AuditEventView
src/server/common/security/
  scrypt-pin.ts              verifyPin(pin, storedHash): Promise<boolean>
src/server/database/schema/
  weighing.ts                add session_components columns; add overrides, audit_events tables
src/server/training/seed/
  seed.service.ts            extend: getSupervisor()
src/server/weighing/
  override.repository.ts     new
  audit-event.repository.ts  new
  weighing-record.repository.ts  extend: listBySession
  weighing-session.service.ts    extend: verifyIdentity, quit, authoriseOverride; confirm gains the ordering from the clarification above
  weighing.controller.ts     extend: 5 new routes
```

### Completion Criteria

- [x] Architecture pattern selected and documented (unchanged, extended — not ADR-worthy)
- [x] All layers designed with responsibilities
- [x] API contracts defined (5 new endpoints, view shape additions, error mapping)
- [x] Database schema designed (2 new tables, 2 new columns, relationships, immutability)
- [x] NFRs addressed
- [x] Security patterns applied (PIN handling, constant-time comparison)
- [x] Integrations planned (SeedService, ScalePort, clock, database)
- [x] The ddd-01 ordering ambiguity (validity vs. stability) is resolved and documented, not silently implemented
