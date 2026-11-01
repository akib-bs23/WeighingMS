---
stage: model
bolt: 009-weighing-station
created: 2026-10-30T14:25:00Z
---

## Static Model: weighing-station (bolt 3 of 3 — overshoot policy, batch completion, write-back trigger)

Extends the `WeighingSession` aggregate from 🟢 006 and 🟡 008. Per the workbook Step 24 human
decision (`evidence/STEP-24-overshoot-decision.md`, **TD-11**), the overshoot half of this bolt's
scope requires **no new domain elements at all** — bolts 006 (block on `OVER`) and 008 (Quit,
Override) already implement the entire approved rule. This document therefore focuses on
completion the 🟠-009-tagged elements 006 already forward-declared.

No source code was read or written to produce this document, per the Domain Model stage
constraint. The write-back service's already-approved contract (`WriteBackService.submit`,
`WriteBackState`) is treated as a given, the same way 🟢 006 treated `ScalePort` as a given.

---

### Overshoot — confirmation, not new design

Story 010's acceptance criteria are satisfied entirely by existing behaviour: an `OVER` reading
still fails normal confirm with `422 OUT_OF_TOLERANCE` (🟢 006); Quit returns the component to
`PENDING` for a fresh attempt (🟡 008); Supervisor override accepts it with a reason (🟡 008); no
other component's target is ever touched (TD-11). Nothing here contradicts or extends those three
bolts — this document records that the question is closed, not that anything changed.

### Entities (new or changed)

- **WeighingSession** (🟢 006, 🟡 008, **completion enforced here**) — `status` and `completedAt`
  already exist on the entity (006); this bolt is simply the first to ever set
  `status = 'COMPLETED'`. Invariant 4 (006's own forward declaration: "cannot transition to
  `COMPLETED` while any component is not `DONE`") is enforced here for the first time.
- **BatchSummary** (new value object, **not persisted**) — a pure projection computed on demand
  from the session, its `WeighingRecord`s, and the write-back state; never stored, so it is always
  current and there is nothing to keep in sync. Fields: `componentsDone`/`componentsTotal`,
  `allWithinTolerance` (`false` if any record's `result` is `OVERRIDDEN` — TD-11 means `OVER`
  readings only ever reach a record via Override, so this single check already captures every
  non-`OK` outcome that was recorded), `totalDispensedMg` (sum of every record's `actualMg`,
  summed as integer milligrams regardless of each component's own `uom` — the brief's "total
  dispensed" is one cross-component figure, always displayed in kg at 3 dp, story 012 AC3),
  `elapsedMs` (`completedAt − startedAt`), `operatorName` (resolved from the seed, same source
  `getSessionOperator` already uses), and the session's current `WriteBackState` (🟡 001/003,
  unchanged shape — summary embeds it rather than re-deriving a subset, so Screen 3's "Written to
  OrgaTEX · CONFIRMED/PENDING" and Retry both have everything they need from one read).

### Aggregates (amendments to the `WeighingSession` aggregate — still no new aggregate)

- **Invariant 4, enforced** (🟢 006 declared it; 🟠 009 enforces it): completion is refused
  (`409 BATCH_INCOMPLETE`) unless every component's `state` is `DONE`.
- **Invariant 9** (new): completion is **idempotent** — calling it again on an already-`COMPLETED`
  session returns the same summary and triggers **no second write-back submission** (story 012's
  own edge case). This is enforced at two independent layers, deliberately redundant: the
  completion operation itself short-circuits on an already-`COMPLETED` session before even
  considering a write-back call, and `WriteBackService.submit` is independently idempotent by
  `sessionId` (bolt 003) even if it were somehow called twice. Neither layer depends on the other
  to be correct.
- **Invariant 10** (new): once `COMPLETED`, `BatchSummary` is still freely re-computable (reading
  it is not restricted — Screen 3 may reload, and ticket printing, bolt 010, needs it again) but
  the session's own component states and records are frozen (Invariant 5, 006: already covers
  this — no further `WeighingRecord`/component-state change may occur post-completion).

### Domain Events

- **BatchCompleted** (🟡 006 placeholder → now concrete) — Trigger: completion succeeds for the
  first time (not on an idempotent repeat call — the event names something that *happened*, and a
  repeat call is a no-op by Invariant 9, not a second occurrence). Payload: `sessionId`, `batchId`,
  the computed `BatchSummary`.

### Domain Services

- **BatchCompletionService** (🟡 006 placeholder → now concrete) — Operation: `complete(sessionId)`.
  Steps: load the session; if already `COMPLETED`, return the existing summary unchanged (Invariant
  9, no write-back call); else if any component is not `DONE`, throw `BATCH_INCOMPLETE`; else set
  `status = 'COMPLETED'`, `completedAt = now`, persist; build the write-back request from this
  session's `WeighingRecord`s (via `WeighingRecordRepository.listBySession`, 🟡 008's read side) and
  call `WriteBackService.submit(sessionId, batchId, request)` (🟡 001/003, unchanged); compute and
  return `{ session, summary }`. Dependencies: `WeighingSessionRepository`,
  `WeighingRecordRepository`, `WriteBackService`, `SeedService` (operator name).
- **Summary computation is a private detail of this service, not a shared pure function** — unlike
  `ToleranceEvaluator`/`ReadingSafetyEvaluator`, no UI screen needs to *recompute* a summary from
  raw inputs; every screen that shows one (Screen 3, the eventual ticket) only ever displays
  whatever the summary API already returned. Putting it in `src/shared` would be premature
  duplication-avoidance for a rule nothing else needs to run.

### Repository Interfaces

No new repository. `WeighingSessionRepository.save` already persists `status`/`completedAt` (006);
`WeighingRecordRepository.listBySession` already exists (008). `WriteBackService` is consumed, not
owned, by this aggregate — exactly as `ScalePort`/`BatchSelectionService` are consumed by
`activateComponent`/`start` (006).

### Ubiquitous Language (additions)

- **Completion**: unchanged definition from 🟢 006 — the session transition that occurs once every
  component is `DONE`; now a real, enforced operation rather than a forward reference.
- **Summary**: the read-only, always-current projection of a session shown on Screen 3 — never a
  stored fact, so there is no "stale summary" state to reason about.
- **Write-back trigger**: completion is the *only* thing that ever calls `WriteBackService.submit`
  in this domain — nothing else in the weighing aggregate talks to OrgaTEX.

---

## Coverage Check Against This Bolt's Stories

| Story | Modelled by |
|-------|-------------|
| 010 overshoot-detection-and-handling | Confirmed closed by TD-11 and bolts 006/008 — no new model elements (see "Overshoot — confirmation, not new design" above) |
| 012 complete-batch | `BatchSummary`, Invariant 4 (enforced), Invariant 9, `BatchCompletionService`, `BatchCompleted` event |

## Completion Criteria

- [x] All domain entities identified and documented (one new value object; no new persisted entity)
- [x] Business rules captured
- [x] Aggregate boundaries respected — no new aggregate; two new invariants and one enforced placeholder on the existing `WeighingSession`
- [x] Domain events specified (one 🟡 006 placeholder now concrete)
- [x] Repository interfaces defined (none new — explicitly justified)
- [x] Both of this bolt's stories covered by the model (table above)
- [x] The overshoot story's model is "confirm nothing new is needed," stated explicitly rather than left to be inferred
