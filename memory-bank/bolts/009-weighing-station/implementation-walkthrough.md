---
stage: implement
bolt: 009-weighing-station
created: 2026-10-30T17:46:00Z
---

## Implementation Walkthrough: weighing-station (bolt 3 of 3 — batch completion, write-back trigger)

### Summary

`WeighingSessionService` gained `complete(sessionId)` and `getSummary(sessionId)`. Completion
enforces bolt 006's forward-declared Invariant 4 (`BATCH_INCOMPLETE` unless every component is
`DONE`), sets `status`/`completedAt`, builds the write-back request by joining each record to its
component snapshot for the missing `dyestuffCode`, and calls the already-built
`WriteBackService.submit`. Overshoot (story 010) required no code at all, per the Step 24 decision
— confirmed by the full suite still passing unchanged. Live-verified end-to-end against the
running dev server: the full 5-component B-24187 flow completing with `totalDispensedMg: 35322100`
(the prototype's `35.322 kg`), idempotent repeat completion (write-back `attempts` stays `1`, one
consumption record), `409 BATCH_INCOMPLETE` before all 5 are done, and completion succeeding
locally with OrgaTEX offline (`PENDING`/`ORGATEX_UNAVAILABLE`) followed by a successful Retry via
bolt 003's existing endpoint.

### Completed Work

- [x] `src/shared/contracts/weighing.ts` — `BatchSummaryView`, `CompletionResult`
- [x] `src/server/weighing/weighing-session.service.ts` — `complete`, `getSummary`, private `buildSummary`; `WriteBackService` injected
- [x] `src/server/weighing/weighing.controller.ts` — `POST :sessionId/complete`, `GET :sessionId/summary`
- [x] `src/server/weighing/weighing.module.ts` — `imports` gains `OrgatexModule` (for `WriteBackService`)

### Key Decisions

- **No code for overshoot (story 010)** — exactly as the Domain Model stage concluded. The existing suite covering `OUT_OF_TOLERANCE`/Quit/Override on an `OVER` reading needed no changes and still passes.
- **`buildSummary` and `getSummary` are synchronous**, not `async` — neither actually awaits anything (`WeighingRecordRepository.listBySession`, `SeedService.getSessionOperator`, and `WriteBackService.get` are all synchronous); `complete` stays `async` since it awaits `WriteBackService.submit`. Caught by the same `require-await` rule that flagged `verifyIdentity` in bolt 008 — same class of fix.
- **`buildSummary` catches `WriteBackService.get`'s `NotFoundError`** and reports `writeBack: null` rather than letting it propagate — a session that hasn't completed yet (or ever) has no write-back row, and `GET .../summary` is explicitly designed to work before completion too (a live progress read), so "no write-back yet" must be a normal result, not an error.
- **Completion's own idempotency check comes first, before any write-back call** — an already-`COMPLETED` session returns `{ session, summary: buildSummary(session) }` immediately, never touching `WriteBackService`. This is deliberately redundant with `submit`'s own idempotency (bolt 003: it looks up the existing row and calls `retry` instead of inserting a second one) — live-verified both layers hold (`attempts` stayed at `1` after a second `complete` call).

### Deviations from Plan

None — the design's two flagged risks (the missing `dyestuffCode` on `WeighingRecordView`, and `WeighingModule` not importing `OrgatexModule`) were exactly the two things Implement had to do; no third issue turned up.

### Dependencies Added

None.

### Developer Notes

- `pnpm lint`/`pnpm typecheck`/`pnpm format:check` all green on the first pass — no new rule violations this time (bolt 008's `require-await` lesson was applied up front instead of being caught after the fact).
- Full live walkthrough against the already-running dev stack: incomplete-batch 409, the full five-component completion with the prototype's exact actuals, idempotent repeat completion, and the OrgaTEX-offline-then-Retry path, all exactly matching the approved design.
