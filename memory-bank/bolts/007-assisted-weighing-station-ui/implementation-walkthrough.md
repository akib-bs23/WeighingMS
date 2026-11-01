---
stage: implement
bolt: 007-assisted-weighing-station-ui
created: 2026-10-30T04:10:00Z
---

## Implementation Walkthrough: assisted-weighing-station-ui (bolt 2 of 4 — workbook Steps 20–22)

### Summary

The station now has a real, working **Screen 2 · Weigh**: recipe rail, component header, scale badge, live weight readouts, a progress bar with the tolerance band, and a status line — all driven by the session API (bolt 006) and the live scale poll (bolt 002), using the exact same `src/shared/weighing` rules the server enforces. A trainer simulator panel drives every demo scenario. Visually verified live: the full Blue RSPL confirm → Red RB progression, and the scale/unit switch to Sodium Sulphate (`32 kg floor`, kg, `TARE 1.850 kg`) — both match the workbook's Step 20/21 screenshots exactly.

### Structure Overview

`App.tsx` now starts a real session (`POST /api/sessions`) on batch selection instead of bolt 005's read-only placeholder, and renders `WeighScreen` plus the always-present `TrainerPanel`. `WeighScreen` composes five small presentational components (`RecipeRail`, `ComponentHeader`, `ReadoutPanel`, `ProgressBar`, `StatusLine`) and one action row (`WeighActions`), all pure functions of the active component and the live reading — none of them hold their own network state. `useLiveWeight` is the only polling hook; `src/client/net/weighing.ts` and `net/training.ts` are the only places that call the session and simulator endpoints respectively, continuing the one-client-module-per-concern pattern from bolt 005.

### Completed Work

- [x] `src/client/net/http.ts` — **fixed**: now sets `content-type: application/json` whenever a body is sent (previously missing entirely — every POST from the browser would have reached NestJS with an unparsed body)
- [x] `src/client/net/weighing.ts` — `startOrResumeSession`, `activateComponent`, `retare`, `confirm`
- [x] `src/client/net/training.ts` — every simulator call the panel needs (scale set/fault/ramp/online, scanner online/inject, OrgaTEX online, reset)
- [x] `src/client/features/weighing/useLiveWeight.ts` — 100 ms poll, stale/out-of-order response guard by `readAt`, resets cleanly when the scale changes
- [x] `src/client/features/weighing/RecipeRail.tsx` — rail header + component rows; done rows inert
- [x] `src/client/features/weighing/ComponentHeader.tsx` (+ `ScaleBadge`) — identity line, tare, scale badge; identity-indicator slot reserved for bolt 008
- [x] `src/client/features/weighing/ReadoutPanel.tsx`, `ProgressBar.tsx`, `StatusLine.tsx` — all three built directly on `src/shared/weighing/tolerance.ts` (no new tolerance logic)
- [x] `src/client/features/weighing/WeighActions.tsx` — OK/Re-tare wired; Quit/Supervisor override visible but disabled (approved decision)
- [x] `src/client/features/weighing/WeighScreen.tsx` — composes the above; replaces and deletes `WeighPlaceholder.tsx`
- [x] `src/client/features/trainer/use-trainer-panel.ts`, `TrainerPanel.tsx` — dispense/overshoot presets computed from the active component, set weight, all device toggles except printer (not built yet), inject scan, reset
- [x] `src/client/App.tsx` — session start wired in; `TrainerPanel` always rendered; reset returns to the queue
- [x] `src/client/i18n/messages.ts` — replaced the stale bolt-005 placeholder string with one accurate for this bolt's scope
- [x] `src/client/styles/station.css` — full weigh-screen styling (rail, header, badge, readouts, bar, status line, actions) plus a visually distinct dashed-border trainer panel; `prefers-reduced-motion` disables the bar's fill transition

### Key Decisions

- **No duplicate tolerance logic**: every zone/band/remaining/status-text computation in the UI calls the bolt-006 shared functions directly — this is the entire reason that module lives in `src/shared`.
- **`useLiveWeight` resets via React's render-time "adjust state in response to a prop change" pattern**, not inside the effect body — required by the stricter `react-hooks` rules now in the standards (same class of fix as bolt 005's `use-batch-queue`, but here the reset is conditional on a changing id rather than unconditional on mount).
- **Printer toggle omitted, Quit/Override shown disabled, identity indicator inert** — all three approved in the plan.

### Deviations from Plan

- **Found and fixed during implementation, not during Test**: `src/client/net/http.ts` never set `Content-Type: application/json` on requests with a body. Every `GET` so far worked fine, but this bolt is the **first to send POST bodies from the browser** (`startOrResumeSession`, `confirm` takes none, but `activateComponent`/`retare` go through other routes — the gap would have surfaced the moment `startOrResumeSession({batchId})` reached a real NestJS `ValidationPipe`, which rejects unparsed bodies). Fixed generically in `http.ts` rather than per-caller, and added three tests covering the new behaviour (sets it when a body is present, never overrides an explicit header, never sets it for a bodyless `GET`).
- `WeighPlaceholder.tsx` (bolt 005) is now fully superseded and was deleted — nothing referenced it.
- Live-verified, not just unit-tested: confirming the first component out of 0 g correctly stays disabled (visually dimmed, not just logically `disabled`), turns vivid green once a trainer-simulated pour lands in tolerance, and progression correctly updates the header, scale badge, tolerance band and units in one screenshot-to-screenshot transition.

### Dependencies Added

None.

### Developer Notes

- `pnpm build` (Nest + Vite) succeeds with no new warnings.
- Manual live walkthrough performed via a temporary (deleted) Playwright script, not committed — screenshots confirmed the rail, header, badge, readouts, bar and status line all match the prototype's Screen 2 layout and the workbook's exact scale-switch requirement (Step 21).
- `confirm`'s client-side error handling is intentionally minimal in this bolt (silently leaves the UI as-is on `422`) — proper operator-facing messaging for out-of-tolerance/unstable is bolt 008's scope, which also adds the real invalid/offline reading states this bolt doesn't yet surface.
