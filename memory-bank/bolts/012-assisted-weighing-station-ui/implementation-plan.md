---
stage: plan
bolt: 012-assisted-weighing-station-ui
created: 2026-10-31T10:30:00Z
---

## Implementation Plan: assisted-weighing-station-ui (bolt 4 of 4 — final bolt — workbook Steps 28–30)

Two halves: (1) the live device/OrgaTEX status strip plus the two weigh-screen failure states
(`SCALE OFFLINE`, `INVALID READING`) that bolt 007 explicitly deferred, and (2) the Playwright
end-to-end and failure-scenario suites that prove the whole product. This is the **last bolt in
the entire approved plan** — nothing depends on it.

### Stories in Scope

- **007-device-status-strip-and-failure-states** (Must) — FR-28, FR-29, FR-30, FR-32, UQ-1
- **010-end-to-end-and-failure-test-suites** (Must) — NFR-13, workbook Steps 28–30

### What Already Exists (not rebuilt here)

- Scanner-offline → touch-still-works (bolt 005), OrgaTEX-offline → queue error + Retry, batch
  already in progress keeps weighing (bolt 005/009), printer-offline → `"Printer unavailable"` +
  Retry on Screen 3 (bolt 010/011), write-back `PENDING → CONFIRMED` after Retry (bolt 009,
  already live-verified). This bolt's job for those is **proof** (the Step 30 suite), not new UI.
- `classifyReading` (bolt 008, `src/shared/weighing/reading-safety.ts`) — the exact rule this
  bolt's `INVALID READING` state reuses, unchanged.

### What Will Change

1. **`StatusStrip`**: 5 live indicators (`SCALE 3 kg · READY/OFFLINE`, `SCALE 32 kg · READY/OFFLINE`,
   `SCANNER`, `PRINTER` — these last two show status only via the dot colour, matching the
   prototype's own markup and FR-28's literal wording — and `ORGATEX · LINKED HH:MM/UNAVAILABLE`),
   each polled independently and reflecting a change within 2 s (story 007 AC2).
2. **`useLiveWeight`**: returns `{ reading, offline }` instead of just `reading` — `offline`
   reflects whether the most recent poll succeeded, independent of any stale prior reading.
3. **`ReadoutPanel`/`StatusLine`**: gain `SCALE OFFLINE` and `INVALID READING` states, each
   disabling OK, checked ahead of the existing tolerance-zone logic.
4. **One new backend endpoint**: `GET /api/orgatex/status` (see Decision 1) — nothing today
   exposes OrgaTEX's link state outside the training/simulator surface.
5. **Two new Playwright suites**: a consolidated full-scenario spec (Step 29) and a
   failure-scenario spec producing the Step 30 evidence table.

### Deliverables (files)

**Shared** — none (reuses `classifyReading`, `ScaleStatus`, `DeviceAvailability` as-is)

**Server**
- `src/server/integrations/orgatex/orgatex.port.ts` — add `isOnline(): boolean`
- `src/server/integrations/orgatex/dummy/dummy-orgatex.adapter.ts` — delegate to `DummyOrgatexService.isOnline()` (already exists, used today only by the training controller)
- `src/server/integrations/orgatex/dummy/orgatex-status.controller.ts` (new) — `GET /api/orgatex/status`
- `src/server/integrations/orgatex/orgatex.module.ts` — register the new controller

**Client**
- `src/client/net/devices.ts` (new) — `getScaleStatus`, `getScannerStatus`, `getPrinterStatus`, `getOrgatexStatus` (thin wrappers, one file since all four are read-only status polls for the same strip, unlike the per-domain `net/scale.ts`-style split used elsewhere which doesn't exist because nothing previously needed scale/printer status from the station UI itself)
- `src/client/components/StatusStrip.tsx` — the 5 live indicators + their polling
- `src/client/features/weighing/useLiveWeight.ts` — return `{ reading, offline }`; track `capacityMg` via one lookup per scale change (not polled)
- `src/client/features/weighing/ReadoutPanel.tsx`, `StatusLine.tsx` — `SCALE OFFLINE` / `INVALID READING` branches
- `src/client/features/weighing/WeighScreen.tsx` — thread `offline`/validity into `canConfirm` and the two components above
- `src/client/i18n/messages.ts` — the new strip/failure strings
- `src/client/styles/station.css` — status dots (`.dot.up`/`.dot.down`), any new readout states

**Tests**
- `tests/server/integrations/orgatex/orgatex-status.api.test.ts` (new)
- `tests/client/net/devices.test.ts` (new)
- `tests/client/components/StatusStrip.test.tsx` (new)
- `tests/client/weighing/useLiveWeight.test.tsx`, `ReadoutPanel`/`StatusLine` coverage (via `WeighScreen.test.tsx`) — extended for offline/invalid
- `playwright/e2e-full-scenario.spec.ts` (new, Step 29) — select B-24187, weigh and confirm all 5 in order, complete, **verify the stored OrgaTEX consumption record** (the one thing no existing spec checks end-to-end through the UI), print the ticket
- `playwright/failure-scenarios.spec.ts` (new, Step 30) — the 9-row table: scale unavailable, OrgaTEX unavailable, printer unavailable, invalid weight, over tolerance, under tolerance, Re-tare, Quit, incomplete batch
- `evidence/STEP-30-failure-tests.md` — the scenario/expected/actual/pass table the workbook asks for, generated from the failure spec's own assertions

### Decisions Needing Your OK (Rule 2)

1. **One small new backend endpoint**: `GET /api/orgatex/status`. Nothing today exposes OrgaTEX's
   link state outside `/api/training/orgatex` (a simulator-only endpoint the station screens must
   never call, per this project's own established convention — the training surface answers "what
   can I make the Dummy do," never "what does the station currently see"). `isOnline()` already
   exists on the underlying Dummy service; this just mirrors the pattern already used for
   scale/scanner/printer status, nothing new architecturally.
2. **Status strip polls every 1000 ms**, not the 100 ms cadence `useLiveWeight` uses for the
   active scale. The strip's 2-second detection requirement (story 007 AC2) has ample margin at
   1 Hz; polling 5 independent endpoints at 10 Hz each would be pure overhead with no behavioural
   benefit.
3. **"Offline" reflects the single most recent poll**, no debounce. The Dummy devices are a hard
   online/offline toggle in this training build, not a flaky connection — there is no transient
   blip to guard against, so a debounce would only slow down an already-generous 2 s budget for
   no real benefit.
4. **Scale capacity for `INVALID READING` is fetched once per active-scale change**
   (`GET /api/scales/:scaleId/status`, which already returns `capacityMg`), not denormalised onto
   `ComponentView`. Capacity is a device property, not a recipe property; fetching it alongside
   the other device-status calls this bolt is already adding keeps the two domains separate.
5. **One consolidated Step 29 spec, not a rewrite of the existing happy-path coverage.**
   `weighing.spec.ts` and `confirm-print.spec.ts` (bolts 007/011) already prove most of the
   individual mechanics; the new spec's job is the one thing nothing yet checks — that the
   **stored OrgaTEX consumption record** itself (via the training inspection endpoint) matches
   what was actually weighed, end to end through the real UI, not just at the API layer (already
   covered server-side in bolt 003/009's own tests).

### Acceptance Criteria

- [ ] All online → 5 green-dot indicators with the exact prototype text, `EN`, live clock
- [ ] Any device/OrgaTEX taken offline → its dot turns red within 2 s; recovers on bring-back
- [ ] Selected scale offline → `Weighed now` shows `SCALE OFFLINE`, status line explains, OK disabled
- [ ] Invalid reading (−5 g, or 3 500 g on scale-3kg) → `INVALID READING`, OK disabled
- [ ] Scanner offline → touch selection still works (already true; re-confirmed by the failure suite)
- [ ] Step 29 spec: full B-24187 run green, OrgaTEX consumption record verified, ticket printed, HTML report + video produced
- [ ] Step 30 spec: all 9 scenarios pass with the defined behaviour; `evidence/STEP-30-failure-tests.md` produced
- [ ] lint, format, typecheck, `pnpm test`, `pnpm test:e2e` all green
