---
stage: design
bolt: 009-weighing-station
created: 2026-10-30T14:35:00Z
---

## Technical Design: weighing-station (bolt 3 of 3 — batch completion, write-back trigger)

No source code was read or written to produce this document, per the Technical Design stage
constraint. This design follows the approved `ddd-01-domain-model.md` (this bolt) and bolt 003's
own approved plan for `WriteBackService` (treated as a given contract, not re-derived).

Overshoot (story 010) needs no technical design — it was closed in the Domain Model stage with no
new elements. Everything below is story 012 only.

### Architecture Pattern

Unchanged: this bolt's one new use case lives in the existing `WeighingSessionService`/
`WeighingController`, inside the same `WeighingModule`. No new pattern, no ADR.

### API Design

| Endpoint | Method | Request | Success | Notes |
|----------|--------|---------|---------|-------|
| `/api/sessions/:sessionId/complete` | POST | — | `200 CompletionResult` | Idempotent (Invariant 9): a second call on an already-`COMPLETED` session returns the same summary and never calls `WriteBackService.submit` again |
| `/api/sessions/:sessionId/summary` | GET | — | `200 BatchSummaryView` | A pure, always-recomputed projection — never restricted to a completed session (nothing invariant-wise requires that), so it also works as a live "progress so far" read before completion; Screen 3 and ticket printing (bolt 010) both just call this rather than caching anything |

**New error**: `BATCH_INCOMPLETE` 409 — completion attempted while any component is not `DONE`.

**View shapes** (`src/shared/contracts/weighing.ts`):

```text
BatchSummaryView:
  sessionId, batchId,
  componentsDone, componentsTotal,
  allWithinTolerance,       // false if any record.result === 'OVERRIDDEN'
  totalDispensedMg,         // sum of every record's actualMg, mixed-uom components included
  elapsedMs,                // completedAt - startedAt; null while not yet completed
  operatorName,
  writeBack: WriteBackState | null   // null until completion has run at least once
                                       // (unchanged shape from bolt 003)

CompletionResult:
  { session: SessionView, summary: BatchSummaryView }
```

### Building the write-back request

`WriteBackService.submit(sessionId, batchId, request)` (bolt 003) expects a `ConsumptionRequest`
with per-line `dyestuffCode` — a field `WeighingRecordView` does not carry (it has `componentId`,
`lotId`, `scaleId`, `targetMg`, `actualMg`, `uom`, `result`, but not the dyestuff code). At
completion time every component is `DONE`, so the session's own `ComponentView.dyestuff.code`
(the immutable recipe snapshot taken at session start, 🟢 006) is still present and correct — each
`ConsumptionLine` is built by joining one `WeighingRecordView` to its matching `ComponentView` by
`componentId`. No change to either existing shape; this is purely assembly inside
`BatchCompletionService.complete`.

### Data Model

No new table, no new column — confirmed in `ddd-01-domain-model.md`. `weighing_sessions.status`/
`completed_at` (already nullable/updatable since 🟢 006) are simply set for the first time by this
bolt.

### NFR Implementation

| NFR | Approach |
|-----|----------|
| NFR-9 Immutable records | Completion reads records, never writes/modifies any (unaffected) |
| NFR-10 Idempotent write-back | Already proven at the `WriteBackService` layer (bolt 003); this bolt adds a second, independent idempotency check at the completion operation itself (Invariant 9) so the guarantee doesn't rest on one layer alone |
| FR-23/FR-24 | `BatchCompletionService.complete` is the single place that both finalises the session and triggers write-back — one operation, one transaction boundary for the session-state change, one (already-idempotent) call for the OrgaTEX side |

### Integrations

| Dependency | From | Used for |
|------------|------|----------|
| `WriteBackService` | unit 001 (`OrgatexModule`, bolt 003) | `submit(sessionId, batchId, request)` on completion |
| `WeighingRecordRepository` | this module (bolt 008) | building the write-back request and the summary's totals |
| `SeedService` | training (bolt 001) | resolving `operatorName` for the summary, same source `getSessionOperator` already uses |
| `CLOCK`, `DATABASE` | bolts 001/002 | `completedAt`, persisting the session's new status |

**Module wiring note**: `WeighingModule` currently imports `BatchesModule` and `ScaleModule` but
not `OrgatexModule` — it needs `OrgatexModule` added to its `imports` so `WriteBackService` is
injectable. `BatchesModule` imports `OrgatexModule` internally for its own OrgaTEX reads but does
not re-export `WriteBackService` to its consumers, so `WeighingModule` must import it directly
rather than relying on that transitive path.

### Module Plan (for Implement)

```text
src/shared/contracts/weighing.ts
  BatchSummaryView, CompletionResult   (new)
src/server/weighing/
  weighing-session.service.ts    extend: complete(sessionId), getSummary(sessionId)
  weighing.controller.ts         extend: 2 new routes
  weighing.module.ts             extend: imports += OrgatexModule
```

### Completion Criteria

- [x] Architecture pattern selected and documented (unchanged, extended — not ADR-worthy)
- [x] API contracts defined (2 endpoints, view shapes, one new error code)
- [x] Database schema designed (none new — confirmed, not merely omitted)
- [x] NFRs addressed
- [x] Integrations planned, including the one module-wiring gap this bolt must close
- [x] The write-back request's missing-`dyestuffCode` assembly detail is resolved here, not left for Implement to discover
