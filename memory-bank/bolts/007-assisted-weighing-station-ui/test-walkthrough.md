---
stage: test
bolt: 007-assisted-weighing-station-ui
created: 2026-10-30T10:20:00Z
---

## Test Report: assisted-weighing-station-ui (bolt 2 of 4 — workbook Steps 20–22)

### Summary

- **Vitest**: 395/395 passed (43 files; 5 new client files in this bolt, plus 3 new tests added to the existing `http.test.ts` for the Content-Type fix)
- **Coverage** (src/server + src/shared + src/client): statements 97.22%, **branches 87.75%**, functions 95.92%, lines 97.92%
- **Playwright**: 5/5 passed (`playwright/batch-selection.spec.ts` ×3, `playwright/weighing.spec.ts` ×2), run against the live dev stack (`:3000` API + `:5173` client)
- **Quality gates**: `pnpm format` / `format:check` ✅, `pnpm lint` ✅, `pnpm typecheck` ✅ (4 tsconfigs: server, client, test-client, playwright)

### Test Files (new in this bolt)

- [x] `tests/client/net/weighing.test.ts` — `startOrResumeSession`, `activateComponent`, `retare`, `confirm` call the exact session paths/methods/bodies
- [x] `tests/client/net/training.test.ts` — every simulator client call (scale set weight/fault/ramp/online, scanner online/inject, OrgaTEX online, reset) hits the exact Dummy path/method/body
- [x] `tests/client/weighing/useLiveWeight.test.tsx` — applies the first poll on mount; polls every 100 ms; discards a stale/out-of-order response by `readAt`; resets to `null` synchronously when the scale id changes, then applies the new scale's reading; does not poll with no scale or while inactive; stops polling on unmount
- [x] `tests/client/weighing/WeighScreen.test.tsx` — rail summary/header/badge for the active component; a `DONE` row is inert; selecting a `PENDING` row activates it and applies the returned session; the fully-weighed banner when there is no active component; all five tolerance boundaries from workbook Step 22 (93.4/93.5/94.5/94.6 g plus the NEAR floor) with exact zone, status text and OK-button enablement; an in-band but *unstable* reading cannot be confirmed; confirm and re-tare each call their endpoint and apply the returned session; Quit/Supervisor override present but disabled
- [x] `tests/client/trainer/TrainerPanel.test.tsx` — simulate dispense/overshoot ramp to `target ± factor×tolerance`; both disabled with no active component; Set weight converts grams→integer mg; Set weight disabled with no scale; each scale/scanner/OrgaTEX device toggle calls only its own endpoint; inject scan sends the typed code and clears the input (and is a no-op when blank); Reset scenario calls the reset endpoint then `onAfterReset`
- [x] `playwright/weighing.spec.ts` — full-stack: weighs B-24187 component-by-component (Blue RSPL → Red RB → Yellow RGB → Sodium Sulphate), verifying the automatic scale-class/unit switch at component 4 (workbook Step 21); a forced overshoot blocks Confirm, Re-tare clears it, and a fresh in-tolerance dispense re-enables Confirm (workbook Step 22)
- [x] 3 tests added to the existing `tests/client/net/http.test.ts` for the Content-Type fix (sets it when a body is present, never overrides an explicit header, never sets it for a bodyless GET)

### Acceptance Criteria Validation

- ✅ **Screen 2 reproduces the prototype's fields (component/code/lot/container/tare, scale selected, weighed now/still to weigh/target, progress, tolerance, status, OK/Re-tare/Quit/Supervisor override)**: `WeighScreen.test.tsx`, `evidence/STEP-20-weigh-screen.png`
- ✅ **Live weight from the real Dummy Scale API, polled continuously**: `useLiveWeight.test.tsx` (polling/staleness), `playwright/weighing.spec.ts`, `evidence/STEP-21-scale-api.txt` (captured `GET /api/scales/scale-3kg/weight` while on Yellow RGB, `GET /api/scales/scale-32kg/weight` immediately after switching to Sodium Sulphate)
- ✅ **Scale class and unit switch automatically per component (Yellow RGB → 3 kg precision g; Sodium Sulphate → 32 kg floor kg), never operator-chosen**: `playwright/weighing.spec.ts`, `evidence/STEP-21-scale-switch.png`
- ✅ **Tolerance band 93.5–94.5 g for Yellow RGB (target 94.0 ± 0.5): 93.4 g cannot confirm, 93.5/94.0/94.5 g can confirm, 94.6 g cannot confirm**: `WeighScreen.test.tsx` (`it.each` over all five values), `evidence/STEP-22-tolerance-ui.png`, `evidence/STEP-22-tolerance-tests.txt` (prior API-level evidence, unaffected)
- ✅ **Re-tare zeroes the live reading without touching the recorded container tare (TD-4)**: `playwright/weighing.spec.ts` ("an out-of-tolerance reading blocks confirm until...")
- ✅ **No duplicate tolerance logic in the UI**: every zone/band/status computation in `ReadoutPanel`/`ProgressBar`/`StatusLine`/`WeighActions` calls `src/shared/weighing/tolerance.ts` directly — confirmed by reading `WeighScreen.tsx` and its children; no parallel implementation exists to test against
- ✅ **Trainer simulator drives every demo scenario (story 009) and never touches session state directly**: `TrainerPanel.test.tsx` — every action calls only a `net/training` endpoint
- ✅ **Tests green; lint/format/typecheck green**: see Summary

Story acceptance criteria covered: 006-003 (weigh screen, live readout, tolerance feedback) and 006-004 (trainer simulator panel).

### Issues Found and Fixed

1. **(Carried from Implement) `src/client/net/http.ts` missing `Content-Type: application/json`** — already fixed during Stage 2; this stage adds the 3 regression tests that lock the behaviour in.
2. **Playwright `getByText(text, { selector })` is a Testing Library API, not Playwright's** — `page.getByText()` has no `selector` option; using it silently produced a strict-mode "2 elements" failure instead of narrowing anything. Fixed by scoping with `page.locator('.wms-weigh-head').getByText(...)` instead.
3. **Simulated pours are a timed ramp (`DEFAULT_RAMP_MS` = 3000 ms), not an instant jump.** The status *text* only depends on the zone (reached as soon as the eased curve crosses into the band), while the **OK button** additionally requires `stable: true`, which the Dummy scale only reports once the ramp fully completes. An E2E test that clicks Confirm right after the status text appears races a still-animating, not-yet-stable reading. Fixed by waiting for the OK button to become enabled (bounded by the known ramp duration) before asserting the status text or clicking.
4. **Re-taring mid-ramp doesn't zero the final resting value — by design.** `DummyScaleService.tare()` re-bases an in-flight ramp onto the new zero point using a *snapshot* of the current (still-moving) reading, so the pour continues toward its original absolute target and can land a few grams off zero if tared before it settles. This is correct simulated physics (tare doesn't halt an ongoing pour), not a bug, but it makes a deterministic post-retare assertion flaky unless the prior ramp is given time to fully land first. Fixed the tolerance-boundary E2E test by waiting out the overshoot ramp's known duration before clicking Re-tare.
5. **Playwright ran weigh-screen specs in parallel workers against the one shared live backend** (one station, one set of Dummy scales/sessions) — a second spec's `/training/reset` or scale ramp could land mid another spec's assertions, which surfaced as an intermittent `OK · Confirm` staying disabled in the full-suite run (passed in isolation, failed with 2 workers). Fixed by setting `workers: 1` in `playwright.config.ts`, since every spec in this suite shares one mutable backend process by design — this is not a per-file `test.describe.configure` problem, it is cross-file.
6. **`useLiveWeight.test.tsx`'s first draft reassigned a module-level variable from inside the test Harness component's render body** to smuggle the hook's return value out for assertions — flagged by `react-hooks/globals` (reassigning an outside-declared variable during render is an impurity). Fixed by rendering the value into the DOM (`data-testid="reading"`) and reading it back with `screen.getByTestId`, matching how the rest of this suite asserts hook behaviour through rendered output rather than captured closures.

### Notes

- `evidence/STEP-20-weigh-screen.png`, `evidence/STEP-21-scale-switch.png`, `evidence/STEP-21-scale-api.txt`, `evidence/STEP-22-tolerance-ui.png` captured from `playwright/weighing.spec.ts`'s own screenshot calls (and one temporary, non-committed diagnostic spec for the network trace, deleted after use — the committed spec is the real coverage).
- Full gate run from the already-running dev stack (`pnpm dev:server` / `pnpm dev:client`, both long-lived for this session): `pnpm format`, `pnpm lint`, `pnpm typecheck`, `npx vitest run --coverage`, `npx playwright test` — all green.
