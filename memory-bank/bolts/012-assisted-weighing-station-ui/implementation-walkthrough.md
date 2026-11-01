---
stage: implement
bolt: 012-assisted-weighing-station-ui
created: 2026-10-31T11:05:00Z
---

## Implementation Walkthrough: assisted-weighing-station-ui (bolt 4 of 4 — final bolt — workbook Steps 28–30)

### Summary

The status strip now shows all 5 live indicators (two scales, scanner, printer, OrgaTEX),
each polled at 1 Hz with a coloured dot. `useLiveWeight` gained `offline`/`capacityMg`, and
`ReadoutPanel`/`StatusLine` gained the `SCALE OFFLINE` and `INVALID READING` states story 007
specifies, both disabling OK ahead of the existing tolerance logic. One small, scoped backend
addition (`GET /api/orgatex/status`) was needed, exactly as flagged in the Plan. Live-verified via
a temporary (deleted) Playwright script: all 5 green indicators on load, a scale going offline
turning its dot red within the poll interval and showing `SCALE OFFLINE` on the readout with OK
disabled, an invalid reading showing `INVALID READING`, and scanner-offline leaving touch
selection fully functional.

### Completed Work

- [x] `src/shared/contracts/orgatex.ts` — `OrgatexLinkStatus`
- [x] `src/server/integrations/orgatex/orgatex.port.ts` — `isOnline()`
- [x] `src/server/integrations/orgatex/dummy/dummy-orgatex.adapter.ts` — delegates to the already-existing `DummyOrgatexService.isOnline()`
- [x] `src/server/integrations/orgatex/orgatex-status.controller.ts` (new) — `GET /api/orgatex/status`
- [x] `src/server/integrations/orgatex/orgatex.module.ts` — registers it
- [x] `src/client/net/devices.ts` (new) — `getScaleStatus`, `getScannerStatus`, `getPrinterStatus`, `getOrgatexStatus`
- [x] `src/client/components/StatusStrip.tsx` — 5 live indicators, `usePolledStatus` (1 Hz, ref-stabilised fetcher — same closure-stability pattern `useLiveWeight` already uses)
- [x] `src/client/features/weighing/useLiveWeight.ts` — returns `{ reading, offline, capacityMg }`; capacity fetched once per scale change via `GET /api/scales/:id/status`
- [x] `src/client/features/weighing/ReadoutPanel.tsx`, `StatusLine.tsx` — `offline`/`invalid` states
- [x] `src/client/features/weighing/WeighScreen.tsx` — threads `offline`/`invalid` (via `classifyReading`, bolt 008's shared rule) into `canConfirm` and both display components
- [x] `src/client/styles/station.css` — strip dots, offline/invalid readout styling; `.wms-key` already at 62 px from bolt 011

### Key Decisions

All five Plan decisions held as designed.

### Deviations from Plan

- **The capacity-lookup effect is gated on `active`, not just `scaleId`.** The Plan didn't spell
  this detail out. In practice `WeighScreen` always calls `useLiveWeight` with `active: true`, so
  it makes no observable difference to the running app — but gating it keeps the hook's own
  contract consistent ("nothing happens over the network while inactive," already true of the
  weight poll) rather than leaving one exception a future caller could trip over.
- **Mocking `useLiveWeight`'s tests needed a routing mock**, not the flat `mockResolvedValueOnce`
  queue the old tests used — both the weight poll and the new capacity lookup go through the same
  `request()` function, so a shared queue let the capacity call silently consume a slot meant for
  a weight reading. Fixed with a small `mockRequest` helper that branches on the URL's `/status`
  suffix. Caught immediately by the existing test suite going red, not discovered live.

### Dependencies Added

None.

### Developer Notes

- `pnpm lint`/`pnpm typecheck`/`pnpm format:check` green; the existing 551-test suite (plus 2
  mechanical additions for the new `offline`/`capacityMg` return values) and all 9 existing
  Playwright specs still pass unmodified.
- Full live walkthrough via a temporary, non-committed Playwright script: all 5 strip indicators
  correct on load; scale-3kg taken offline → its dot turns red, `SCALE OFFLINE` appears on the
  readout, the status line explains, OK disabled; brought back online → recovers without a
  reload; a −5 g reading → `INVALID READING`, OK disabled; scanner offline → the strip reflects
  it while touch selection (and the rest of the weighing flow) keeps working end to end.
- Stage 3 still owes: dedicated tests for `StatusStrip`/`net/devices.ts`/the server status
  endpoint, extended `ReadoutPanel`/`StatusLine`/`WeighScreen` coverage for the two new states, and
  the two new Playwright suites (`e2e-full-scenario.spec.ts`, `failure-scenarios.spec.ts`) plus
  `evidence/STEP-30-failure-tests.md`.
