---
stage: plan
bolt: 007-assisted-weighing-station-ui
created: 2026-10-30T03:35:00Z
---

## Implementation Plan: assisted-weighing-station-ui (bolt 2 of 4 — workbook Steps 20–22)

### Objective

Build the real **Screen 2 · Weigh**: recipe rail, component header, scale badge, live weight readouts, progress bar with tolerance band, status line — all driven by the session API from bolt 006 and the live scale poll from bolt 002 — plus a **trainer simulator panel** so the whole scenario can be demonstrated without editing code or data. Replaces bolt 005's weigh placeholder.

### Stories in Scope

- **006-003-weigh-screen-recipe-rail-and-component-header** (Must) — FR-5, FR-6, FR-8, FR-9, FR-10, FR-12, FR-22, FR-7 (indicator only)
- **006-004-live-weight-readouts-and-progress-bar** (Must) — FR-13, FR-14, FR-15, FR-16, NFR-1, NFR-4, NFR-5, TD-10
- **006-009-trainer-simulator-panel** (Must) — FR-34, DB-4, DB-5, DB-7, DB-8

### What Will Change

1. **`App.tsx` rewritten** to call `POST /api/sessions` on batch selection (bolt 005 only opened a read-only placeholder) and render the real `WeighScreen` once a session exists.
2. **Recipe rail**: `Recipe · {shadeCode}`, batch id, `{done} of {total} components weighed`, one row per component (swatch colour, name, `code · scaleClass`, target, state done/active/pending). Touching a pending row calls `activate`; touching a done row does nothing (client-side guard, matching the server's `COMPONENT_DONE`).
3. **Component header**: name, `{code} · LOT {lot} · CONTAINER {container} · TARE {tare}`. An identity indicator placeholder is shown but inert (FR-7's actual verification is bolt 008 — this story only reserves the UI slot).
4. **Scale badge**: `SCALE SELECTED / {scaleClass label} / automatic`.
5. **Live weight hook** (`useLiveWeight`): polls `GET /api/scales/:scaleId/weight` every 100 ms while Screen 2 is open, **ignoring any response older than the last one already applied** (edge case in story 004 — compare `readAt`).
6. **Readouts + progress bar + status line**: computed with the **existing shared `tolerance.ts`/`scale-selection.ts`** from bolt 006 — no new tolerance logic. Band, target line, zone colouring, `role="progressbar"` with aria values, `prefers-reduced-motion` disables the fill transition (CSS only).
7. **Confirm/Re-tare/Quit/Override keys**: rendered, but only **OK** and **Re-tare** are wired to real endpoints in this bolt (`POST .../confirm`, `POST .../retare`); **Quit** and **Supervisor override** are visible but disabled with a tooltip "available in a later bolt" (008) — avoids presenting dead buttons as broken, without building ahead of the approved bolt plan.
8. **Trainer simulator panel**: Simulate dispense / Simulate overshoot (computed client-side from the *active* component's target+tolerance, then posted as a ramp — the approved bolt-002 clarification), Set weight, scale 3 kg/32 kg online/offline, scanner online/offline, **inject scan** (code input), OrgaTEX online/offline, Reset. **Printer toggle is omitted** — unit 005 (ticket-printing) doesn't exist yet (bolt 010); adding it now would be building against an API that isn't there. Flagging this rather than deciding silently.
9. **Session polling for progression**: after every activate/confirm/retare call, the session state returned by that same call is used directly (no extra `GET`) — matches bolt 006's API design (`activate`/`retare`/`confirm` all return the updated `SessionView`).

### Deliverables (files)

Client
- `src/client/api/weighing.ts` — `startOrResume`, `activateComponent`, `retare`, `confirm`
- `src/client/api/training.ts` — simulator calls (scale set/ramp/online, scanner inject/online, OrgaTEX online, reset)
- `src/client/features/weighing/useLiveWeight.ts` — polling hook with stale-response guard
- `src/client/features/weighing/RecipeRail.tsx`, `ComponentHeader.tsx`, `ScaleBadge.tsx`
- `src/client/features/weighing/ReadoutPanel.tsx`, `ProgressBar.tsx`, `StatusLine.tsx`
- `src/client/features/weighing/WeighActions.tsx` (OK, Re-tare, disabled Quit/Override)
- `src/client/features/weighing/WeighScreen.tsx` — composes the above, replaces `WeighPlaceholder`
- `src/client/features/trainer/TrainerPanel.tsx`, `use-trainer-panel.ts`
- `src/client/App.tsx` — session start on selection, renders `WeighScreen` + `TrainerPanel`
- `src/client/i18n/messages.ts` — extended with weigh-screen and trainer-panel strings
- `src/client/styles/station.css` — extended with readout/bar/badge/trainer-panel styles (prototype tokens, reduced-motion rule)
- `src/shared/contracts/training.ts` — simulator request/response shapes (thin, mirrors existing device contracts)

Tests
- `tests/client/weighing/useLiveWeight.test.tsx` (stale-response guard, polling cadence via fake timers)
- `tests/client/weighing/WeighScreen.test.tsx` (rail states, header, badge, boundary zone colours/status text, confirm/retare flows, progression, done-row no-op)
- `tests/client/trainer/TrainerPanel.test.tsx` (each control calls the right Dummy endpoint only)
- `tests/client/net/weighing.test.ts`, `training.test.ts` (path assertions, consistent with existing `net/*.test.ts`)
- `playwright/weighing.spec.ts` — select B-24187, simulate dispense on Yellow RGB (zoom to it first), confirm, verify progression and scale/unit switch to Sodium Sulphate

### APIs Involved

| Call | When |
|------|------|
| `POST /api/sessions` | Batch selected (bolt 005's placeholder removed) |
| `GET /api/scales/:scaleId/weight` | Polled every 100 ms while Screen 2 is open (TD-10, unchanged) |
| `POST /api/sessions/:id/components/:componentId/activate` | Touching a pending row |
| `POST /api/sessions/:id/retare` | Re-tare key |
| `POST /api/sessions/:id/confirm` | OK key |
| `POST /api/training/scales/:scaleId/weight`, `/ramp` | Trainer: set weight, simulate dispense/overshoot |
| `PUT /api/training/scales/:scaleId`, `/api/training/scanner`, `/api/training/orgatex` | Trainer: device toggles |
| `POST /api/training/scanner/scans` | Trainer: inject scan |
| `POST /api/training/reset` | Trainer: reset |

### Dependencies

- Bolt 005 ✅ (shell, API client pattern, `Key` component, message catalogue)
- Bolt 006 ✅ (session endpoints, shared `tolerance.ts`/`scale-selection.ts`)
- Bolt 002 ✅ (scale weight/simulator endpoints)

### Technical Approach

- **No duplicate tolerance logic**: `WeighScreen` imports `evaluateZone`/`toleranceBand`/`statusText`/`remaining` directly from `src/shared/weighing/tolerance.ts` — the same module bolt 006's server uses. This is the whole reason that module lives in `src/shared`.
- **Dispense/overshoot presets** (approved bolt-002 clarification): computed in the client from the session's active component — `target + 0.4×tolerance` (dispense) / `target + 4.8×tolerance` (overshoot), matching the prototype's own landing-value formula, then posted via `POST /api/training/scales/:id/ramp`.
- **Stale-poll guard**: the hook keeps the `readAt` of the last applied reading and discards any response with an equal or earlier timestamp (story 004 edge case).
- **Accessibility/usability**: progress bar `role="progressbar"` + `aria-valuenow/min/max`; `@media (prefers-reduced-motion: reduce)` removes the fill's CSS transition (no JS branching needed, consistent with the prototype's own approach).
- **Re-implementation, not copy**: layout/tokens follow the prototype (`docs/customize-weighing-station.html` L490–L564); no prototype JavaScript reused.

### Decisions Needing Your OK (Rule 2)

1. **Printer toggle omitted from the trainer panel in this bolt** — unit 005 doesn't exist yet; added when bolt 010/011 land.
2. **Quit and Supervisor override are visible but disabled** in this bolt (not wired to any endpoint, since neither exists until bolt 008) — rather than hidden entirely, so the layout matches the prototype now and only needs enabling, not adding, in bolt 011.
3. **Identity-verification indicator is a visual placeholder only** — FR-7's actual scan-check logic is bolt 008's; this bolt reserves its slot in the header.

### Acceptance Criteria

- [ ] Rail shows `Recipe · Teal 4C`, `B-24187`, `0 of 5 components weighed`, 5 rows with correct swatch/name/code-scale/target/state
- [ ] Yellow RGB header: `DYE-4471 · LOT 2026-0387 · CONTAINER C-12 · TARE 214.0 g`; badge `3 kg precision / automatic`
- [ ] Touching Sodium Sulphate switches badge to `32 kg floor` and all units to kg (Step 21 evidence)
- [ ] Touching a done row has no effect
- [ ] Live weight polls every 100 ms; a trainer-set change appears within 200 ms; stale/out-of-order responses ignored
- [ ] Readouts show Weighed now (≥ 52 px), Still to weigh, Target `94.0 g`; caption `TOLERANCE ±0.5 g (93.5 – 94.5)` and `125.0 g`
- [ ] 93.4/93.5/94.5/94.6 g produce the exact zone colours and status text from the shared rules (Step 22 UI evidence)
- [ ] Progress bar has `role="progressbar"` + aria values; fill transition disabled under reduced motion
- [ ] OK enabled only in the OK zone; confirming advances the rail and switches to the next component/scale
- [ ] Re-tare zeroes the readout; no record created (verified via the rail staying on the same component)
- [ ] Trainer panel: Simulate dispense lands the active component inside tolerance; Simulate overshoot lands it above; Set weight sets an exact value; every device toggle and inject-scan/reset call the correct Dummy endpoint only
- [ ] Component, hook and Playwright tests green; lint, format, typecheck green

### Out of Scope (later bolts)

Invalid/offline reading handling and identity verification logic (008), Quit and Supervisor override logic (008/011), overshoot business rule (009, Step 24), Screen 3 and ticket (005/011), status strip real device indicators (012), F-keys (011).
