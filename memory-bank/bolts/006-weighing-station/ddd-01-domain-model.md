---
stage: model
bolt: 006-weighing-station
created: 2026-10-29T11:50:00Z
---

## Static Model: weighing-station

This is the domain model for the **whole `004-weighing-station` unit** (one aggregate, shared across its three DDD bolts), because `WeighingSession` is a single cohesive aggregate and splitting its model across bolts would risk contradicting itself later. Each element below is tagged with the bolt that **implements** it, so bolts 008 and 009 extend rather than redesign this model:

- 🟢 **006** (this bolt): session start/resume, shared quantity/tolerance rules, scale selection + tare, re-tare, confirm (in-tolerance only), progression
- 🟡 **008** (next): reading safety (offline/invalid), identity verification, supervisor override, Quit/abandon, records & audit read model
- 🟠 **009** (last): overshoot policy (pending the Step 24 human decision), batch completion, write-back trigger

No source code was read or written to produce this document, per the Domain Model stage constraint.

---

### Entities

- **WeighingSession** (aggregate root): `sessionId` (uuid), `batchId`, `stationId`, `operatorId`, `status` (`IN_PROGRESS` | `COMPLETED`), `activeComponentId`, `startedAt`, `completedAt`. Business rules: exactly one `IN_PROGRESS` session per station at a time (AS-6); cannot start for a batch that is not RELEASED (enforced again here even though 003 already checked it — defence in depth, story 001); `completedAt` set only once, by the Complete operation (🟠 009).
- **ComponentWeighing**: `componentId`, `sequence`, `state` (`PENDING` | `ACTIVE` | `DONE`), `scaleId` (set on activation), `verifiedIdentity` (boolean, 🟡 008). Business rules: at most one `ACTIVE` component per session; a `DONE` component can never return to `ACTIVE` or `PENDING` (story 011); `state` becomes `DONE` only together with a `WeighingRecord` — never independently (story 011 AC4).
- **RecipeComponentSnapshot**: the immutable copy of a recipe component taken at session start — `componentId`, `dyestuffCode`, `dyestuffName`, `colourHex`, `barcode`, `targetMg`, `uom`, `toleranceMg`, `displayMaxMg`, `lotId`, `containerId`. Snapshotting is deliberate (brief §9.2): a later OrgaTEX recipe change must never alter what a past weighing was judged against.
- **WeighingRecord**: `recordId` (uuid), `sessionId`, `componentId`, `lotId`, `containerId`, `tareMg`, `scaleId`, `targetMg`, `toleranceMinMg`, `toleranceMaxMg`, `actualMg`, `uom`, `result` (`IN_TOLERANCE` | `OVERRIDDEN`, 🟠 `COMPENSATED` reserved for 009 pending Step 24), `operatorId`, `confirmedAt`. Business rule: **immutable once created** — no update or delete operation exists in this domain at all (NFR-9); a correction is a new record, never a mutation (brief DR-02).
- **Override** (🟡 008): `overrideId`, `recordId`, `supervisorId`, `reason` (mandatory, non-empty), `authorisedAt`.
- **AuditEvent** (🟡 008, read model only in 006): `eventId`, `sessionId`, `type` (`OVERRIDE` | `ABANDON` | `REPRINT`), `actorId`, `detail`, `occurredAt`.

### Value Objects

- **Quantity**: an integer count of milligrams. Equality and ordering by value. Constraint: non-negative, safe integer (no floating-point representation ever — NFR-8, brief NFR-16).
- **ToleranceBand**: `targetMg`, `toleranceMg` → derived `minMg = targetMg − toleranceMg`, `maxMg = targetMg + toleranceMg`. Boundaries are **inclusive** on both ends (story 002 AC1: 93.5 g and 94.5 g are both "ok"). A tolerance of 0 is a valid band of exactly the target (edge case, story 002).
- **Zone**: one of `UNDER` | `NEAR` | `OK` | `OVER`, derived from a `Quantity` and a `ToleranceBand`: `OVER` when above `maxMg`; `OK` when within `[minMg, maxMg]`; `NEAR` when at or above 90% of `targetMg` but below `minMg`; `UNDER` otherwise. Pure function of its inputs, no identity.
- **ScaleClass**: `PRECISION` | `FLOOR`, with the selection rule (🟢 006): target `≤ 3 000 000` mg (3 000 g) → `PRECISION`; otherwise → `FLOOR` (story 003 AC3, boundary inclusive on the precision side).
- **StationIdentity** (🟢 006): the training operator attached to a session (TD-6) — `operatorId`, `name`, `shift`. Not a full user account; a value snapshot copied onto the session at start.

### Aggregates

- **WeighingSession** (root) — members: its `ComponentWeighing` list (each carrying a `RecipeComponentSnapshot`), and references (by id, not embedded) to the `WeighingRecord`s, `Override`s and `AuditEvent`s produced during the session.
  - **Invariant 1** (🟢 006): at most one `ComponentWeighing` is `ACTIVE` at a time.
  - **Invariant 2** (🟢 006): a component's `state` transitions only `PENDING → ACTIVE → DONE`; never backwards, never skipped.
  - **Invariant 3** (🟢 006): a `WeighingRecord` can only be created for the session's current `ACTIVE` component, and creating one is the *only* way a component becomes `DONE` (ties Confirm and Progression together — stories 005 and 011).
  - **Invariant 4** (🟠 009, declared now so 006 does not contradict it later): the session cannot transition to `COMPLETED` while any `ComponentWeighing` is not `DONE`.
  - **Invariant 5** (all bolts): once `COMPLETED`, no further `WeighingRecord`, `Override` or component-state change may occur against the session.

  `WeighingRecord`, `Override` and `AuditEvent` are **not** separate aggregates — they are facts produced *by* operations on `WeighingSession` and are never modified after creation, so they need no aggregate boundary of their own; they are referenced from the session for traceability (FR-27) but queried independently (read model, 🟡 008).

### Domain Events

- **SessionStarted** (🟢 006) — Trigger: a released batch is opened for weighing and no session for it exists yet. Payload: `sessionId`, `batchId`, `stationId`, `operatorId`, `recipeComponentCount`, `startedAt`.
- **SessionResumed** (🟢 006) — Trigger: start is called while a session for the batch is already `IN_PROGRESS`. Payload: `sessionId`, `activeComponentId`.
- **ComponentActivated** (🟢 006) — Trigger: a `PENDING` component becomes the session's `ACTIVE` one (first component at session start, or an explicit touch of a pending row). Payload: `sessionId`, `componentId`, `scaleId` (as selected), previous active component id (if any).
- **ScaleTared** (🟢 006) — Trigger: activation or an explicit Re-tare. Payload: `sessionId`, `scaleId`, `tareMg`.
- **WeighingConfirmed** (🟢 006 for `IN_TOLERANCE`; 🟡 008 extends it for `OVERRIDDEN`) — Trigger: a confirm operation succeeds. Payload: the created `WeighingRecord`.
- **ComponentAbandoned** (🟡 008) — Trigger: Quit. Payload: `sessionId`, `componentId`, `actorId`.
- **OverrideAuthorised** (🟡 008) — Trigger: a supervisor successfully authorises an out-of-tolerance confirmation. Payload: the created `Override`.
- **BatchCompleted** (🟠 009) — Trigger: the last pending component becomes `DONE`. Payload: `sessionId`, `batchId`, summary (all-in-tolerance flag, total dispensed per unit, elapsed time).

### Domain Services

- **ToleranceEvaluator** (🟢 006, pure, in `src/shared` so UI and server share it) — Operations: `evaluateZone(reading: Quantity, band: ToleranceBand): Zone`, `remaining(target: Quantity, reading: Quantity): Quantity`, `statusText(zone, remaining, surplus, uom): string` (exact wording from story 002 AC5). Dependencies: none — no I/O, no repository.
- **ScaleSelector** (🟢 006, pure) — Operations: `selectClass(targetMg: Quantity): ScaleClass`. Dependencies: none.
- **WeighingSessionService** (🟢 006, application-level domain service) — Operations: `start(batchId, operatorId)`, `resume(batchId)`, `activateComponent(sessionId, componentId)`, `retare(sessionId)`, `confirm(sessionId, reading)`. Dependencies: `WeighingSessionRepository`, `ScalePort` (from unit 002, for tare and the server's own authoritative read of weight), `BatchSelectionService` (from unit 003, to obtain the recipe snapshot at start).
- **ProgressionPolicy** (🟢 006, pure) — Operations: `nextActive(components: ComponentWeighing[]): ComponentWeighing | null` — the first `PENDING` component in sequence order (story 011's rule: progression always picks the first pending by sequence, even if the operator jumped ahead). Dependencies: none.
- **OverrideAuthoriser** (🟡 008) — Operations: `authorise(sessionId, reading, supervisorPin, reason)`. Dependencies: `WeighingSessionRepository`, a supervisor-credential check (seeded PIN hash, NFR-11).
- **OverSurplusPolicy** (🟠 009) — Operations: to be defined at the Step 24 human decision; this bolt only reserves the extension point (an injected strategy the `WeighingSessionService.confirm` operation consults when `Zone = OVER`).
- **BatchCompletionService** (🟠 009) — Operations: `complete(sessionId)`, producing the summary and invoking the unit-001 write-back service.

### Repository Interfaces

- **WeighingSessionRepository** (🟢 006) — Entity: `WeighingSession` (with its components). Methods: `findOpenByBatchId(batchId): WeighingSession | null`, `findById(sessionId): WeighingSession`, `save(session): void`. One session aggregate is persisted as a whole (components included) on each state change, consistent with NFR-7 (durable before acknowledging a confirmation).
- **WeighingRecordRepository** (🟢 006 for write; 🟡 008 adds the read/list methods) — Entity: `WeighingRecord`. Methods: `add(record): void` (no update/delete — NFR-9), `listBySession(sessionId): WeighingRecord[]`.
- **OverrideRepository** (🟡 008) — Entity: `Override`. Methods: `add(override): void`.
- **AuditEventRepository** (🟡 008) — Entity: `AuditEvent`. Methods: `add(event): void`, `listBySession(sessionId): AuditEvent[]`.

### Ubiquitous Language

- **Session**: one operator's run through one batch's recipe at this station; starts on selecting a released batch, ends on completion.
- **Component**: one recipe line (one dyestuff or auxiliary) to be weighed; same meaning as the brief's "RECIPE_COMPONENT".
- **Active component**: the single component currently being weighed; everything else is pending or done.
- **Tare**: the zero-reference weight (empty container) subtracted from the gross reading to get the net weight.
- **Net weight / reading**: the live weight after tare, what the operator sees and what confirmation judges.
- **Target**: the recipe's required quantity for a component, snapshotted onto the session.
- **Tolerance band**: the inclusive range around the target within which a weighing may be confirmed without override.
- **Zone**: the four-way classification (under/near/ok/over) of a reading against its tolerance band.
- **Confirm**: the operator action that, only when the reading is in the `OK` zone (or overridden), produces an immutable `WeighingRecord` and advances the component to `DONE`.
- **Progression**: the automatic advance to the next pending component after a confirmation.
- **Override**: a supervisor's authorisation to confirm a reading that is not in the `OK` zone.
- **Surplus**: the amount by which a reading in the `OVER` zone exceeds the tolerance band (exact definition is a Step 24 decision, not fixed by this model).
- **Completion**: the session transition that occurs once every component is `DONE`; triggers write-back to OrgaTEX.
- **Write-back**: posting the session's actual consumption to (Dummy) OrgaTEX — a unit-001 concern this domain only *triggers*, never performs itself.

---

## Coverage Check Against This Bolt's Stories

| Story | Modelled by |
|-------|-------------|
| 001 start-and-resume-weighing-session | `WeighingSession` entity, `SessionStarted`/`SessionResumed` events, `WeighingSessionRepository.findOpenByBatchId`/`save` |
| 002 shared-quantity-and-tolerance-rules | `Quantity`, `ToleranceBand`, `Zone` value objects, `ToleranceEvaluator` service |
| 003 activate-component-with-scale-selection-and-tare | `ComponentWeighing`, `ScaleClass`, `ComponentActivated`/`ScaleTared` events, `ScaleSelector` service |
| 004 retare | `ScaleTared` event (re-tare path), no new record — reuses `WeighingSessionService.retare` |
| 005 confirm-in-tolerance-weighing | `WeighingRecord` entity, Invariant 3, `WeighingConfirmed` event, `WeighingSessionService.confirm` |
| 011 component-progression | Invariant 2, `ProgressionPolicy` service |

## Completion Criteria

- [x] All domain entities identified and documented
- [x] Business rules captured for each entity
- [x] Aggregate boundaries defined (one aggregate: `WeighingSession`; records/overrides/audit are produced facts, not sub-aggregates)
- [x] Domain events specified, tagged by implementing bolt
- [x] Repository interfaces defined
- [x] All six of this bolt's stories covered by the model (table above)
