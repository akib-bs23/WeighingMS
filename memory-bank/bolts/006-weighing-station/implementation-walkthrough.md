---
stage: implement
bolt: 006-weighing-station
created: 2026-10-30T00:30:00Z
---

## Implementation Walkthrough: weighing-station (bolt 1 of 3 — workbook Steps 20–23, 25)

### Summary

The core weighing domain now exists and runs end to end: starting (or resuming) a session for a released batch snapshots its recipe, activates the first component on the correct scale, tares it, and lets the operator confirm only when the server's own reading is within the inclusive tolerance band — never trusting a client-supplied value. Confirmation produces an immutable record and automatically progresses to the next pending component, switching scale and unit exactly as the prototype does (precision/g → floor/kg). Verified live against the real B-24187 scenario: all five components confirm with the prototype's exact actuals, Blue RSPL → Soda Ash in order, with correct scale switching at Sodium Sulphate.

### Structure Overview

Pure, framework-free rules live in `src/shared/weighing/` (tolerance/zone evaluation, scale-class selection, progression) so bolt 007's UI can reuse the identical logic for the live readout — this was a technical-design decision, not new ground. The server side is one `WeighingModule` with a repository per table family (`WeighingSessionRepository` for the session+components aggregate, `WeighingRecordRepository` insert-only for confirmed weighings), one application service (`WeighingSessionService`) orchestrating the five use cases, and one controller exposing them under `/api/sessions`. It depends on unit 002's `ScalePort` and unit 003's `BatchSelectionService` (already exported), both via Nest DI — no new coupling beyond what the technical design planned.

### Completed Work

- [x] `src/shared/weighing/tolerance.ts` — `ToleranceBand`, `Zone`, `evaluateZone`, `remaining`, `statusText` (exact wording from story 002)
- [x] `src/shared/weighing/scale-selection.ts` — `selectScaleClass` (≤ 3 000 000 mg → PRECISION)
- [x] `src/shared/weighing/progression.ts` — `nextActive` (first pending by sequence)
- [x] `src/shared/contracts/weighing.ts` — `SessionView`, `ComponentView`, `WeighingRecordView`, `ConfirmResult`
- [x] `src/server/database/schema/weighing.ts` — `weighing_sessions`, `session_components` (recipe snapshot, unique on session+component), `weighing_records` (insert-only)
- [x] `src/server/database/migrations/0003_weighing.sql` (+ meta) — generated migration
- [x] `src/server/weighing/weighing-session.repository.ts` — aggregate persistence (save replaces session row + all component rows per transaction), registers a training reset hook
- [x] `src/server/weighing/weighing-record.repository.ts` — `add` + `listBySession` only, no update/delete method exists
- [x] `src/server/weighing/weighing-session.service.ts` — `start`, `get`, `activateComponent`, `retare`, `confirm`
- [x] `src/server/weighing/weighing.controller.ts` — `POST /api/sessions`, `GET /api/sessions/:id`, `POST .../activate`, `POST .../retare`, `POST .../confirm`
- [x] `src/server/weighing/weighing.module.ts` — imports `BatchesModule` + `ScaleModule`, exports the service and record repository for bolts 008/009
- [x] `src/server/app.module.ts` — imports `WeighingModule`
- [x] `src/server/training/seed/seed.service.ts` — added `getSessionOperator()`, reused by `StationController` (minor refactor, removes duplication)

### Key Decisions

- **`start` resumes idempotently**: calling it again for the same batch returns the existing session unchanged; a different batch while one is open is refused (`SESSION_ALREADY_OPEN`, AS-6).
- **`start` delegates its first activation to `activateComponent`**: avoids duplicating the scale-selection/tare logic; `confirm`'s progression step does the same for the next component.
- **Touching the already-active component is a no-op**, not an error — not specified by the stories, but a defensible idempotent choice over inventing a new error code.
- **Confirm distinguishes only `OUT_OF_TOLERANCE` (422) and `READING_UNSTABLE` (422)**, treating a missing reading (`netMg: null`) as unstable. A full split between "unstable" and "invalid" (negative/overload) readings is explicitly bolt 008's story (FR-30) — the domain model tagged this 🟡, and this bolt doesn't pre-empt it.
- **Scale resolution goes through `ScalePort.listScales()` + class match** at the moment of activation, never a hard-coded `scale-3kg`/`scale-32kg` string in business logic — keeps the domain code scenario-agnostic.

### Deviations from Plan

- **Found and fixed a real gap, not anticipated in the design**: `WeighingSessionRepository` had no training reset hook, so `POST /api/training/reset` silently left old sessions in place — a second `SESSION_ALREADY_OPEN` would block every subsequent demo/test run after the first session. Fixed by registering a reset hook (clears `weighing_records`, `session_components`, `weighing_sessions` in one transaction) with the existing `ResetRegistry`, the same mechanism every other Dummy module already uses. Verified live: reset now lists `weighing-sessions` among the cleared modules.
- `SeedService.getSessionOperator()` added and `StationController` refactored to use it, rather than duplicating the operator lookup — small, not in the original file list, but a direct consequence of this bolt needing the same lookup `StationController` already had.

### Dependencies Added

None.

### Developer Notes

- Live-verified the full B-24187 flow: Blue RSPL 1241.5 g → Red RB 385.4 g → Yellow RGB 94.2 g (with 93.4 g and 94.6 g both correctly rejected first) → Sodium Sulphate 23.980 kg (scale switched to `scale-32kg`, Re-tare tested) → Soda Ash 9.621 kg. Total matches the prototype's **35.322 kg** exactly. Session ends with all five components `DONE`, `activeComponentId: null`, status still `IN_PROGRESS` (completion is bolt 009).
- `COMPONENT_DONE`, `COMPONENT_NOT_FOUND`, `SESSION_NOT_FOUND`, and `SCALE_UNAVAILABLE` (propagated) all verified live, each with the correct status code.
