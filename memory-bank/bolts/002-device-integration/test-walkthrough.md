---
stage: test
bolt: 002-device-integration
created: 2026-10-29T10:27:00Z
---

## Test Report: device-integration

### Summary

- **Tests**: 134/134 passed (15 files; 67 new in this bolt, 67 from bolt 001 still green)
- **Coverage** (src/server + src/shared): statements 98.2%, **branches 91.5%**, functions 98.5%, lines 98.4%; Dummy scale code 100% lines / 93.1% branches
- **Quality gates**: `pnpm lint` ✅, `pnpm format:check` ✅, `pnpm typecheck` ✅

### Test Files

- [x] `tests/server/integrations/scale/dummy-scale.api.test.ts` - scale list/status/weight/tare, 404, resolution rounding (4 cases), negative/overload/NO_READING pass-through, tare relative and cumulative, offline 503 + OFFLINE status + isolation + recovery, reset, weight latency < 20 ms
- [x] `tests/server/integrations/scale/scale-simulator.api.test.ts` - simulator state/availability, set weight, set cancels pour, ramp unstable / zero-duration, request validation (8 cases), 404s
- [x] `tests/server/integrations/scale/dummy-scale.service.test.ts` - fake-clock pour: monotonic, unstable until end, exact landing, ease-out values (87.5 % at half time), resolution rounding during pour, downward pour, 3 s default, tare re-basing mid-pour, pour after fault, reading timestamps
- [x] `tests/server/integrations/scale/dummy-scale.adapter.test.ts` - ScalePort DI binding, list/status/read/tare, SCALE_UNAVAILABLE and SCALE_NOT_FOUND propagation
- [x] `tests/server/integrations/scanner/dummy-scanner.api.test.ts` - status, inject → feed, trimming, sequence + `since`, blank/missing code, invalid `since`, offline 503 + recovery, reset clears sequence
- [x] `tests/server/integrations/scanner/dummy-scanner.adapter.test.ts` - ScannerPort DI binding, `since` filtering, availability, SCANNER_UNAVAILABLE
- [x] `tests/helpers/create-test-app.ts` - now supports provider overrides and a `FakeClock`

### Acceptance Criteria Validation

- ✅ **`GET /api/scales` → scale-3kg (PRECISION, 3 000 000 mg, 100 mg) and scale-32kg (FLOOR, 32 000 000 mg, 1 000 mg)**: exact-equality API test
- ✅ **Status, weight, tare per contract; unknown scale → 404 SCALE_NOT_FOUND**: API + adapter tests
- ✅ **Simulator set 93.5 g → netMg 93500, stable**: API test; live evidence
- ✅ **Ramp to 94.2 g → increasing, unstable, ease-out, ends exactly 94200 stable**: fake-clock service tests; live sampled evidence (93500 → 93900 → 94100 → 94200 → stable)
- ✅ **Tare → net 0; later readings relative; tare offline → 503**: API tests
- ✅ **Offline → weight/tare 503, status OFFLINE; online resumes from last state**: API tests
- ✅ **−5 g, 3 500 g (overload) and NO_READING reported as-is**: API tests
- ✅ **Readings rounded to resolution (94.23 g → 94 200 mg; 24.0004 kg → 24 000 000 mg)**: API tests
- ✅ **Scanner: inject → feed, since filter, blank → 400, offline → 503, status offline**: API tests
- ✅ **ScalePort / ScannerPort adapters return same data and propagate 503/404**: adapter tests
- ✅ **Reset restores scales and scanner (listed in reset response)**: API tests
- ✅ **Weight endpoint < 20 ms**: latency test (max of 20 reads); live max 0.5 ms
- ✅ **lint, format, typecheck, tests green; coverage ≥ 80 % lines and branches**: see Summary
- ✅ **Step 18 evidence extended**: `evidence/STEP-18-api-tests.txt` rebuilt with OrgaTEX, scale and scanner sections, sampled pour and the 134-test list

Story acceptance criteria covered: 001 (list/status/weight/404), 002 (tare, offline 503), 003 (set, ramp, overshoot-style ramp above bound, invalid injection — presets in trainer panel per clarification), 004 (offline, isolation, recovery), 005 (inject/feed/since/offline; touch fallback is UI, bolt 005).

### Issues Found

- None in product code. Two lint errors in new tests (`.map` on untyped response bodies) fixed by typing the bodies with the shared contracts rather than widening the test lint override.

### Notes

- Fake-clock tests make the eased pour fully deterministic; the live sampled pour in the evidence shows the same shape in real time.
- Two remaining uncovered branches in the scale service are defensive (`grossMg` re-base when a pour completes during a tare call).
