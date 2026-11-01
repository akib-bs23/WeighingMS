---
stage: test
bolt: 009-weighing-station
created: 2026-10-30T17:55:00Z
---

## Test Report: weighing-station (bolt 3 of 3 — batch completion, write-back trigger)

### Summary

- **Integration Tests**: 9 new service-level cases (`weighing-session.service.test.ts`, `complete`/`getSummary` describes) and 4 new API-level cases (`weighing.api.test.ts`) — all new coverage is for story 012; story 010 (overshoot) needed no new tests, since nothing about it changed.
- **Total suite**: 458/458 passing across 45 files (up from 445/45 before this bolt).
- **Coverage** (`src/server` + `src/shared` + `src/client`): statements 97.3%, **branches 88.5%**, functions 95.8%, lines 98.0%; `src/server/weighing` at 98.2% statements / 90.5% branches.
- **Playwright**: unchanged from bolt 008 (5/5) — no UI in this bolt's scope.

### Acceptance Criteria Validation

**Story 010 — overshoot-detection-and-handling**
- ✅ Closed entirely by the Step 24 decision (TD-11) and bolts 006/008 — re-confirmed by the full suite passing with zero changes to any overshoot-related test. No new test was written for this story because nothing new exists to test; writing one would only duplicate bolt 006/008's own coverage.

**Story 012 — complete-batch**
- ✅ Fewer than 5 of 5 done → `409 BATCH_INCOMPLETE` with `componentsDone`/`componentsTotal` in details (service- and API-level)
- ✅ 5 of 5 done → `status: 'COMPLETED'`, valid `completedAt`, summary `componentsDone: 5`, `allWithinTolerance: true`, `operatorName: 'R. Karim'`
- ✅ Prototype actuals (1241.5 g, 385.4 g, 94.2 g, 23.980 kg, 9.621 kg) → `totalDispensedMg: 35_322_100` (35.3221 kg, rounds to the prototype's displayed "35.322 kg")
- ✅ `allWithinTolerance: false` when any record is `OVERRIDDEN`
- ✅ Completion triggers `WriteBackService.submit`; the summary's `writeBack` reflects `CONFIRMED` with a valid `confirmedAt`, or `PENDING`/`ORGATEX_UNAVAILABLE` when OrgaTEX is offline (both service- and API-level; live-verified during Implement as well)
- ✅ Calling complete twice is idempotent: identical summary, `writeBack.attempts` stays `1`, confirmed over both the service method and HTTP
- ✅ `GET .../summary` works before completion (`componentsDone: 1`, `writeBack: null`) and matches `complete`'s own returned summary exactly once completion has run

### Issues Found

None. The design's two flagged risks (missing `dyestuffCode` on `WeighingRecordView`, `WeighingModule` not importing `OrgatexModule`) were exactly what Implement had to resolve, and both were resolved then — Test found nothing new.

### Known Limitations (unchanged from bolt 008)

The same handful of genuinely-unreachable defensive guards (`scaleIdOf`/`tareOf`/`NO_SCALE_FOR_CLASS` in `weighing-session.service.ts`; `NO_SUPERVISOR`/`NO_OPERATOR` in `seed.service.ts`) remain unreachable for the same structural reasons bolt 008 documented — this bolt adds no new code path that changes that.

### Recommendations

- This closes unit `004-weighing-station` entirely (all three of its bolts — 006, 008, 009 — are now complete). The next units in the approved plan are ticket printing (bolt 010) and the remaining assisted-weighing-station-ui bolts (011, 012), which will build the UI for everything bolts 006–009 already expose: identity, override, Quit, and the Screen 3 completion summary.
- No other follow-ups; the aggregate is complete and fully tested.
