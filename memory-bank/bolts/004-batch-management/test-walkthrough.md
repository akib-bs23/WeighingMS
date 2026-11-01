---
stage: test
bolt: 004-batch-management
created: 2026-10-29T11:08:00Z
---

## Test Report: batch-management

### Summary

- **Tests**: 209/209 passed (22 files; 34 new in this bolt; bolts 001–003 still green)
- **Coverage** (src/server + src/shared): statements 98.5%, **branches 93.5%**, functions 98.3%, lines 98.6%; new `src/shared/batches` and `src/server/batches` at 100%
- **Quality gates**: `pnpm lint` ✅, `pnpm format:check` ✅, `pnpm typecheck` ✅

### Test Files

- [x] `tests/shared/eligibility.test.ts` - RELEASED allowed; QUEUED, WEIGHING, WEIGHED, CANCELLED refused with the exact operator message
- [x] `tests/shared/scan-code.test.ts` - 11 codes: batch cards (incl. whitespace), dyestuff and auxiliary barcodes, lowercase / malformed / order numbers / empty as UNKNOWN
- [x] `tests/server/batches/batch-selection.service.test.ts` - released batch + 5-component recipe; batch read before recipe via OrgatexPort (call order asserted); queued batch refused with **no recipe request**; scanned code trimmed; dyestuff code 422; empty 400; unknown 404; offline 503
- [x] `tests/server/batches/batch-selection.api.test.ts` - 200 within 3 s with batch context and recipe sequence; 409 ×2, 404, 422, 400 with exact messages; malformed bodies 400 (3 cases); offline 503 and recovery

### Acceptance Criteria Validation

- ✅ **Shared rule: RELEASED eligible; others refused with "Batch {id} not released by OrgaTEX (status {status})"**: eligibility tests (all 5 statuses)
- ✅ **Scan classification**: scan-code tests
- ✅ **`prepareForWeighing('B-24187')` → batch + 5-component recipe, batch before recipe**: service tests (spy-recorded order)
- ✅ **B-24188 → 409 BATCH_NOT_RELEASED, no recipe request**: service test (recipe spy not called) + API test
- ✅ **Unknown → 404 "Batch B-99999 not found"; dyestuff code → 422 NOT_A_BATCH_CODE**: service + API tests
- ✅ **OrgaTEX offline → 503, no invented data**: service + API tests
- ✅ **Response < 3 s (NFR-2)**: API test; live ~2 ms
- ✅ **Gates green; coverage ≥ 80 %**: see Summary

Story acceptance criteria covered: 001 (queue data available from `GET /api/batches` — UI part in bolt 005), 002 (selection by code, 409/404, read-only recipe, batch→recipe order), 003 (503 on queue and selection, recovery).

### Issues Found

- None in product code. Two test lint errors (`async` spies without `await`) fixed.

### Notes

- Story 001's "no batch data in UI source" and "received at" checks belong to the UI and are verified in bolt 005.
