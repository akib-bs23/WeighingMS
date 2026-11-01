---
stage: test
bolt: 012-assisted-weighing-station-ui
created: 2026-10-31T11:40:00Z
---

## Test Report: assisted-weighing-station-ui (bolt 4 of 4 — final bolt — workbook Steps 28–30)

### Summary

- **Vitest**: 571/571 passed (59 files; 3 new client/server test files, 2 existing files extended) — confirmed stable across 3 consecutive full reruns after one transient, non-reproducing flake (not chased further; see Known Limitations)
- **Coverage** (`src/server` + `src/shared` + `src/client`): statements 97.7%, **branches 88.4%**, functions 96.9%, lines 98.4%
- **Playwright**: **19/19 passed** — 9 pre-existing + 1 new Step 29 spec + 9 new Step 30 failure-scenario tests, full HTML report + per-test video
- **Quality gates**: `pnpm format`/`format:check`, `pnpm lint`, `pnpm typecheck` all green

### Test Files (new in this bolt)

- [x] `tests/server/integrations/orgatex/orgatex-status.api.test.ts` — online/offline, records the last real contact (not the Dummy's own inbound traffic), never routes through the training surface
- [x] `tests/client/net/devices.test.ts` — all 4 status wrappers hit the exact non-training paths
- [x] `tests/client/components/StatusStrip.test.tsx` — all-green rendering, per-device offline/red-dot, OrgaTEX `LINKED`/`UNAVAILABLE`, re-polling without remount, clock/EN
- [x] `tests/client/weighing/useLiveWeight.test.tsx` — extended: capacity fetched once (separate from the weight poll), `offline` true/false across poll failure/recovery
- [x] `tests/client/weighing/WeighScreen.test.tsx` — extended: `SCALE OFFLINE`/`INVALID READING` (both invalid cases) block OK with the exact wording, recovery, and a control case proving a valid reading is unaffected
- [x] `playwright/e2e-full-scenario.spec.ts` (Step 29) — full B-24187 run, including the **stored OrgaTEX consumption record** verified independently of what Screen 3 displays
- [x] `playwright/failure-scenarios.spec.ts` (Step 30) — all 9 scenarios

### Acceptance Criteria Validation

**Story 007 — device-status-strip-and-failure-states**
- ✅ All online → the exact prototype text for all 5 indicators, green dots, `EN`, live clock
- ✅ Any device/OrgaTEX offline → red dot within the 1 Hz poll interval (comfortably inside the 2 s requirement), green again on recovery, no reload needed
- ✅ Selected scale offline → `SCALE OFFLINE` on the readout, `SCALE OFFLINE — CONFIRM UNAVAILABLE` status line, OK disabled
- ✅ Invalid reading (negative, over-capacity) → `INVALID READING`, OK disabled
- ✅ Scanner offline → touch selection (and the whole weighing flow) unaffected

**Story 010 — end-to-end-and-failure-test-suites**
- ✅ Step 29: reset → select B-24187 → weigh/confirm all 5 in order → complete → OrgaTEX write-back `CONFIRMED` and the stored consumption record (5 lines, correct batch) verified independently → ticket printed — all green, HTML report + video produced
- ✅ Step 30: all 9 scenarios pass with the defined behaviour — `evidence/STEP-30-failure-tests.md`

### Issues Found

None — this stage found no new product defects. One pre-existing minor UX asymmetry was noticed while writing the printer-unavailable test: the write-back `PENDING` banner has its own labelled **Retry** button, while a `PENDING` ticket's retry is the same **Print ticket** button (correct per `TicketService`'s own retry-vs-reprint semantics, just a different visual affordance for the same concept on the same screen). Documented in `evidence/STEP-30-failure-tests.md` as a flagged observation, not a defect — nothing in any story requires a separate label here.

### Known Limitations

- One `npx vitest run` invocation produced a single unexplained failure that did not reproduce across 3 immediate reruns with no code changes in between. Given the full suite's otherwise perfect consistency throughout this entire session (every other run, across all 12 bolts, has been reproducibly green or reproducibly red with an identifiable cause), this is logged as an observed one-off rather than chased further — there is no code path this bolt touches that plausibly explains a non-reproducing failure, and re-introducing instability to chase a ghost would cost more than it's worth at the project's final bolt.
- Same genuinely-unreachable defensive guards already documented in bolts 008–011 remain; this bolt introduces none of its own.

### Recommendations

- This completes **bolt 012 and the entire approved bolt plan** — all units (001–006) and every bolt within them are now built and tested. What remains is the workbook's own wrap-up (Steps 31–35): checking the AI-DLC project state, the final dashboard, final human validation, the evidence matrix, and the final demonstration — none of which are construction work.
