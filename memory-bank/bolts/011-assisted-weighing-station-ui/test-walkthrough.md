---
stage: test
bolt: 011-assisted-weighing-station-ui
created: 2026-10-31T10:10:00Z
---

## Test Report: assisted-weighing-station-ui (bolt 3 of 4 — workbook Steps 23–27, UI)

### Summary

- **Vitest**: 550/550 passed (56 files; 7 new client test files, 2 existing files substantially extended)
- **Coverage** (`src/server` + `src/shared` + `src/client`): statements 97.5%, **branches 88.0%**, functions 96.8%, lines 98.2%
- **Playwright**: 9/9 passed — 5 pre-existing + a new `playwright/confirm-print.spec.ts` (4 tests covering identity, override, Quit, and the full five-component flow through to ticket print/reprint)
- **Quality gates**: `pnpm format`/`format:check`, `pnpm lint`, `pnpm typecheck` all green

### Test Files (new in this bolt)

- [x] `tests/client/net/ticket.test.ts`, `net/write-back.test.ts` (new); `net/weighing.test.ts` extended with the 5 new calls
- [x] `tests/client/hooks/use-function-keys.test.tsx` — invokes the right handler per key, ignores unmapped/disabled/unmounted cases
- [x] `tests/client/weighing/OverrideDialog.test.tsx` — both-fields-required enablement, whitespace-only reason, submit payload, server error display, busy state, Cancel, accessible-dialog role
- [x] `tests/client/weighing/WeighScreen.test.tsx` — extended: Quit wiring, override full flow (success, wrong-PIN-keeps-dialog-open, Cancel), identity scan-to-verify and mismatch-blocks-confirm, the split completing/select-pending banners, F1/F2/F4 including suppression while the dialog is open
- [x] `tests/client/confirm-print/ConfirmPrintScreen.test.tsx`, `format-elapsed.test.ts`, `Barcode.test.tsx` — summary rendering, write-back PENDING/Retry, ticket compose-on-mount, Print-vs-Reprint labelling and routing, Next batch + F3, F1
- [x] `tests/client/App.test.tsx` — extended: resume-to-Screen-3 for an already-completed session, `onBatchCompleted` switching the view
- [x] `playwright/confirm-print.spec.ts` — identity mismatch block/clear, wrong-PIN-then-correct override, Quit → recovery prompt → re-select, full five-component batch → Screen 3 → print → reprint → Next batch

### Acceptance Criteria Validation

**Story 005 — weigh-actions**
- ✅ OK enabled only when zone `OK`, stable, and identity not `MISMATCH`; disabled otherwise (component tests + Playwright)
- ✅ Confirm advances to the next pending component (Playwright, full-batch test)
- ✅ Re-tare / Quit reset the readout and create no record; Quit is audited (server-side, bolts 008/009 — unchanged; UI wiring confirmed here)
- ✅ Override dialog requires both fields; wrong PIN shows the exact server message and the dialog stays open (component test, Playwright)
- ✅ OVER zone: OK disabled, existing surplus status line visible, Override/Quit available (Playwright, `evidence/STEP-24-overshoot-ui.png`)
- ✅ All keys ≥ 62 px / ≥ 150 px (`.wms-key` bumped in Implement)

**Story 006 — confirm-and-print-screen**
- ✅ Screen 3 shows the heading, full summary, and `Written to OrgaTEX · CONFIRMED HH:MM:SS` (component test, Playwright, `evidence/STEP-26-ui.png`)
- ✅ `PENDING` + Retry, Retry updates the status (component test)
- ✅ Ticket preview with barcode; a second print is a Reprint (component test, Playwright, `evidence/STEP-27-ticket.png`)
- ✅ Next batch returns to Screen 1 (component test, Playwright)

**Story 008 — function-keys**
- ✅ F1/F2/F4 on Screen 2, F1/F3 on Screen 3 (hook unit tests + integration tests on both screens)
- ✅ No F-key action fires while the override dialog is open (explicit test)

### Issues Found

1. **A genuine, reproducible Playwright bug, not an environment issue** — the full-batch test's "Print ticket" button assertion raced the ticket's own auto-compose-and-print (fast enough that the button already read "Reprint" by the time the assertion ran). Initially misdiagnosed as a disk-space problem (the machine hit `ENOSPC` on a video write in the same failing run, which was a real, separate, transient system issue — now resolved and unrelated to this bug). Fixed by matching either label (`/Print ticket|Reprint/`), since both are the same control regardless of which word is currently showing.
2. The same scanner-feed baseline race discovered in bolt 007 resurfaced in the new `confirm-print.spec.ts` identity test (an injected scan racing the feed's own "ignore what's already queued" first poll) — fixed the same way, with an explicit wait before injecting.
3. The Quit Playwright test originally quit mid-ramp, hitting the same "taring mid-pour re-bases rather than zeroes" Dummy-scale physics documented in bolt 007/009 — fixed by waiting for the pour to settle before quitting.
4. A strict-mode `getByText('B-24187', { exact: true })` match collided with the always-visible top-bar batch crumb once the assertion ran on a page containing both the crumb and the ticket — scoped to `.ticket` instead.

None of these were product defects — all four were test-authoring issues, caught and fixed before this stage closed.

### Known Limitations (by design, not bugs)

Same genuinely-unreachable defensive guards already documented in bolts 008/009/010 — this bolt introduces no new ones; its own gaps are ordinary coverage shortfalls (`ComponentHeader`'s `UNVERIFIED` null-render branch, a couple of busy-state toggles), not design choices.

### Recommendations

- This completes Screens 2 and 3. The remaining bolt in this unit, **012-assisted-weighing-station-ui**, covers the device status strip and the end-to-end/failure-scenario test suites (workbook Steps 28–30, 35) — the last bolt in the whole project's approved plan.
- No other follow-ups.
