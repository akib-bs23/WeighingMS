# STEP 33 — Final Human Validation: Findings

Performed live against the running app (frontend :5173, API :3000) via a temporary Playwright
walkthrough (deleted after use, screenshots kept at `evidence/STEP-33-validation/`), plus a
fresh full test-suite run. These are my findings for you to validate — per the workbook, this
gate is yours to walk ("Did we build the product we intended to build?"), not mine to
self-certify.

## 1. Product Brief (`docs/brief.md`)

Six business objectives (BO-01–BO-06). Checked against what's demonstrably built:
- **BO-01** (eliminate out-of-tolerance weighings reaching production): OK·Confirm is
  hard-disabled outside tolerance, live-demonstrated — `06-under-tolerance-confirm-blocked.png`
  (dimmed button, blocked) vs `07-within-tolerance-confirm-enabled.png` (bright, enabled).
- **BO-02** (component-level traceability): operator/timestamp/scale/lot/actual quantity all
  captured per component (`audit_events`, `session_components`) — visible on the ticket in
  `04-confirm-print-screen.png` (target vs actual per line).
- **BO-03** (reduce rework from weighing error): same tolerance gate as BO-01.
- **BO-04** (reconcile actual vs theoretical consumption): OrgaTEX write-back stored the full
  5-line consumption record, verified independently via `GET /api/training/orgatex/consumption`
  (not just read off the screen).
- **BO-05** (reduce shade-failure investigation time): audit trail exists (story
  013-weighing-records-and-audit-trail) but I did not independently verify the audit UI/export
  here — flagging for you to check if that matters to your validation.
- **BO-06** (preserve throughput, the brief's explicit guard condition): not something I can
  measure — it requires comparing against the real paper process, which no Dummy can simulate.
  Flagging as **not validated by this exercise**; judgment call is yours.

## 2. UI/UX (`docs/customize-weighing-station.html` vs the live app)

`01-batch-queue.png`, `02-weigh-screen-first-component.png`, `03-scale-autoswitch-32kg.png`,
`04-confirm-print-screen.png`, `05-ticket-printed.png` — captured fresh just now. Columns,
labels, F-key hints, status strip, and ticket layout match the structure described in the
requirements (FR-1, FR-4, FR-5, FR-6, FR-10). I did not do a pixel-level diff against the
reference HTML — that comparison needs your eye, not mine.

## 3. Requirements (`requirements.md`)

Spot-checked FR-1, FR-2, FR-4, FR-5, FR-6, FR-9, FR-10 directly against the live walkthrough —
all demonstrated correctly (batch queue columns, context bar, recipe rail, component header,
container/tare, scale auto-switch). This was a sample, not all 34 FRs — the full set was
cross-referenced against bolts during construction, not re-verified line-by-line here.

## 4. Acceptance Criteria (40 stories)

The live walkthrough exercises stories across units 002–006 directly: batch queue/selection,
recipe load, tare, tolerance gate (block + unblock), scale auto-switch, completion, OrgaTEX
write-back, ticket print. Stories not touched by this particular walkthrough (e.g. identity
mismatch, supervisor override, Quit, printer/OrgaTEX offline) are covered instead by the
pre-existing Playwright specs re-run below — I did not re-demonstrate every AC narratively here.

## 5. Tests — proven automatically, re-run live just now

- `npx vitest run`: **571/571 passed**, 59 files, fresh run at 2026-11-01T11:19
- `npx playwright test` (full suite, all 5 spec files): **19/19 passed**, ~2.0 min, fresh run
  including `e2e-full-scenario.spec.ts` and all 9 `failure-scenarios.spec.ts` cases

## What I'm flagging, not deciding

- BO-06 (throughput vs paper) cannot be validated by any automated or simulated check — it's a
  judgment call that depends on operator experience with the real paper process.
- I sampled rather than re-walked all 34 FRs / 40 stories narratively; the full cross-reference
  happened during construction (bolts 001–012), not freshly re-verified line-by-line today.
- No pixel-diff was done between the UI/UX reference file and the live app — only structural/
  textual comparison.

This is evidence for your decision, not a substitute for it.
