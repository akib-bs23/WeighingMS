---
stage: test
bolt: 003-orgatex-integration
created: 2026-10-29T10:58:00Z
---

## Test Report: orgatex-integration (bolt 2 of 2)

### Summary

- **Tests**: 175/175 passed (18 files; 41 new in this bolt; bolts 001–002 still green)
- **Coverage** (src/server + src/shared): statements 98.4%, **branches 92.9%**, functions 98.2%, lines 98.5%; Dummy OrgaTEX 100% lines / 97.2% branches; write-back 100% lines / 91.7% branches
- **Quality gates**: `pnpm lint` ✅, `pnpm format:check` ✅, `pnpm typecheck` ✅

### Test Files

- [x] `tests/helpers/consumption-fixture.ts` - valid B-24187 consumption with the prototype ticket's actuals
- [x] `tests/server/integrations/orgatex/consumption.api.test.ts` - 200 receipt; stored record equals request + receipt; same-key retry returns original; same key different payload 409; second key for same batch 409; missing/blank key 400 (3 cases); invalid bodies 400 (8 cases); recipe mismatch 422 (6 cases: unknown, duplicate, missing component, wrong dyestuff/lot/unit); unknown batch 404; no recipe 404; offline 503 with nothing stored; inspection filter; reset clears
- [x] `tests/server/integrations/orgatex/write-back.service.test.ts` - online → CONFIRMED with key = session id; offline → PENDING (nothing stored); attempts counted; retry after recovery → CONFIRMED with one record; retry on CONFIRMED does not call OrgaTEX; repeat submit safe; **ambiguous failure (stored but response lost) → retry confirms the original, still one record**; rejection stays PENDING with code; unknown session 404; reset clears
- [x] `tests/server/integrations/orgatex/write-back.api.test.ts` - 404 before completion; PENDING → Retry → CONFIRMED over HTTP with one stored record
- [x] `tests/server/integrations/orgatex/dummy-orgatex.adapter.test.ts` - extended: `postConsumption` receipt and 503 propagation
- [x] `tests/server/training/reset.api.test.ts` (existing) - reset now also lists `write-back`

### Acceptance Criteria Validation

- ✅ **Valid post with key K → 200, receipt, one stored record with all lines**: consumption.api (exact equality of stored record)
- ✅ **Same key + same payload → original receipt, still one record**: consumption.api
- ✅ **Same key + different payload → 409 IDEMPOTENCY_CONFLICT, original kept**: consumption.api
- ✅ **Missing key / invalid body → 400; recipe mismatch → 422; unknown batch → 404; offline → 503**: consumption.api (20 cases)
- ✅ **Training inspection returns stored records**: consumption.api
- ✅ **`OrgatexPort.postConsumption` returns receipt and propagates errors**: adapter test
- ✅ **Write-back online → CONFIRMED with confirmedAt and consumptionId**: write-back.service
- ✅ **Write-back offline → PENDING, lastError ORGATEX_UNAVAILABLE**: write-back.service
- ✅ **Retry after OrgaTEX back → CONFIRMED; exactly one record**: write-back.service + write-back.api
- ✅ **Retry when CONFIRMED → no second post**: write-back.service (spy asserts no call)
- ✅ **Status/retry endpoints; unknown session → 404 WRITE_BACK_NOT_FOUND**: write-back.api
- ✅ **Reset clears consumption and write-backs**: consumption.api, write-back.service
- ✅ **Gates green; coverage ≥ 80 %**: see Summary
- ✅ **Step 16/18 evidence**: `evidence/STEP-18-api-tests.txt` section 4 (request body, 200, repeat, 409, 400, stored record)

Story acceptance criteria covered: 004 (200, idempotent repeat, 400, stored lines, 409 conflict, 404) and 005 (CONFIRMED, PENDING, retry → CONFIRMED, double retry → one record, ambiguous failure → no duplicate).

### Issues Found

- None. One lint error during implementation (unused rest-destructured columns) was fixed by selecting explicit columns.

### Notes

- The ambiguous-failure test proves IR-08: the first attempt is stored by OrgaTEX but reported to the station as failed; the retry re-sends the identical request under the same key and is answered with the original receipt.
- Uncovered lines in `schema/orgatex.ts` are Drizzle foreign-key callbacks, evaluated only by migration tooling.
