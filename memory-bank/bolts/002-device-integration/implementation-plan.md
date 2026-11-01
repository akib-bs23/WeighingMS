---
stage: plan
bolt: 002-device-integration
created: 2026-10-29T10:14:00Z
---

## Implementation Plan: device-integration

### Objective

Provide the station's shop-floor device substitutes behind ports: two **Dummy Scales** (`scale-3kg` precision, `scale-32kg` floor) reporting net weight, stability and status with a tare command and a **simulator**, and a **Dummy Scanner** that delivers injected scans through an event feed. Completes the Dummy Scale part of workbook Step 16 and its Step 18 API tests.

### Stories in Scope

- **001-dummy-scales-report-weight-and-status** (Must) — DB-3
- **002-scale-tare-command** (Must) — DB-3
- **003-scale-simulator-drives-weight** (Must) — DB-4
- **004-scale-offline-simulation** (Must) — DB-4, DB-7
- **005-dummy-scanner-delivers-scans** (Must) — DB-5, FR-32 (scanner part)

### What Will Change

1. **Scale configuration table** (`scales`) seeded from the existing `scales` slice of `data/seed.json` (scale config is WeighingMS-owned per data ownership); registered with the reset registry.
2. **Dummy Scale** module: in-memory live state per scale (gross, tare, online, injected fault, active ramp), the four workbook endpoints, and training simulator endpoints.
3. **Dummy Scanner** module: in-memory scan event log with sequence numbers, feed endpoint, status, simulator inject/offline.
4. **Ports**: `ScalePort` and `ScannerPort` interfaces + Dummy adapters bound via DI (used by bolt 006 onward).
5. **Clock provider**: injectable time source so ramp behaviour is testable deterministically.
6. **Shared contracts**: device types for server and (later) UI.

### Deliverables (files to be created / modified)

Shared
- `src/shared/contracts/devices.ts` — `ScaleInfo`, `ScaleStatus`, `WeightReading`, `TareResult`, `ScanEvent`, `ScanFeed`, `DeviceStatus`

Server
- `src/server/common/clock/clock.ts` (+ module) — `CLOCK` token, system clock
- `src/server/database/schema/scales.ts` (+ export in `schema/index.ts`), new migration `0001_scales`
- `src/server/integrations/scale/scale.port.ts` — interface + DI token
- `src/server/integrations/scale/dummy/dummy-scale.service.ts` — live state, readings, tare, ramp, faults, reset hook
- `src/server/integrations/scale/dummy/dummy-scale.controller.ts` — workbook endpoints
- `src/server/integrations/scale/dummy/scale-training.controller.ts` — simulator endpoints (+ DTOs)
- `src/server/integrations/scale/dummy/dummy-scale.adapter.ts` — `ScalePort` implementation
- `src/server/integrations/scale/scale.module.ts`
- `src/server/integrations/scanner/scanner.port.ts`
- `src/server/integrations/scanner/dummy/dummy-scanner.service.ts`, `dummy-scanner.controller.ts`, `scanner-training.controller.ts`, `dummy-scanner.adapter.ts`
- `src/server/integrations/scanner/scanner.module.ts`
- `src/server/app.module.ts` — import ClockModule, ScaleModule, ScannerModule

Tests
- `tests/server/integrations/scale/dummy-scale.api.test.ts`
- `tests/server/integrations/scale/scale-simulator.api.test.ts`
- `tests/server/integrations/scale/dummy-scale.service.test.ts` (ramp/easing with a fake clock)
- `tests/server/integrations/scale/dummy-scale.adapter.test.ts`
- `tests/server/integrations/scanner/dummy-scanner.api.test.ts`
- `tests/server/integrations/scanner/dummy-scanner.adapter.test.ts`

Evidence
- Append scale/scanner calls to `evidence/STEP-18-api-tests.txt`

### APIs Involved

Dummy Scale (training contract — no claim about real indicator protocols, OQ-04; paths exactly per workbook Step 16):

| Method | Path | Success | Errors |
|--------|------|---------|--------|
| GET | `/api/scales` | `200` `[{ scaleId, class, name, uom, capacityMg, resolutionMg, online }]` | — |
| GET | `/api/scales/:scaleId/status` | `200` `{ scaleId, online, state: READY \| OFFLINE, capacityMg, resolutionMg }` | `404 SCALE_NOT_FOUND` |
| GET | `/api/scales/:scaleId/weight` | `200` `{ scaleId, netMg, stable, overload, error, readAt }` | `404`, `503 SCALE_UNAVAILABLE` |
| POST | `/api/scales/:scaleId/tare` | `200` `{ scaleId, tareMg, netMg: 0 }` | `404`, `503 SCALE_UNAVAILABLE` |

Dummy Scanner (training contract):

| Method | Path | Success | Errors |
|--------|------|---------|--------|
| GET | `/api/scanner/status` | `200` `{ online }` | — |
| GET | `/api/scanner/events?since=N` | `200` `{ events: [{ seq, code, scannedAt }], lastSeq }` | `503 SCANNER_UNAVAILABLE` |

Training simulator (prefix `/api/training`, never used by station screens):

| Method | Path | Body | Effect |
|--------|------|------|--------|
| GET / PUT | `/training/scales/:scaleId` | `{ online }` | read state / take scale offline-online |
| POST | `/training/scales/:scaleId/weight` | `{ netMg }` or `{ fault: 'NO_READING' }` | set exact net weight (stable) — negative and over-capacity values allowed to simulate bad readings |
| POST | `/training/scales/:scaleId/ramp` | `{ toMg, durationMs? }` | simulated pour from current net to `toMg`, eased; unstable until finished |
| POST | `/training/scanner/scans` | `{ code }` | inject a scan (`400` if blank, `503` if offline) |
| PUT | `/training/scanner` | `{ online }` | scanner offline/online |

### Dependencies

- **Bolt 001** ✅ — scaffold, database, seed (`scales` slice already validated), reset registry, error filter.
- No external services or new runtime packages.

### Technical Approach

- **Weight model**: each scale holds `grossMg` and `tareMg`; `netMg = gross − tare`. Tare sets `tare = gross` → net 0. Simulator values are **net** (what the trainer means by "put 94.2 g in"), stored as `gross = tare + net`.
- **Resolution**: readings are rounded to the scale's resolution (0.1 g precision, 1 g floor) — integer mg arithmetic only.
- **Ramp (eased pour)**: stateless in time — on each read, net is computed from `(now − start) / duration` with an ease-out curve (fast first, slowing near the end, like a person pouring), `stable: false` until the duration has elapsed, then exactly `toMg` and `stable: true`. No timers; deterministic with the injected clock. Default duration 3 000 ms. Tare during a ramp re-bases the ramp to the new zero.
- **Faults**: `{ fault: 'NO_READING' }` returns `netMg: null, error: 'NO_READING'`. Negative or over-capacity net values are returned as the indicator would show them, with `overload: true` above capacity. **Judging validity is not this unit's job** — WeighingMS validation (bolt 008, FR-30) rejects them.
- **Offline**: weight and tare return `503 SCALE_UNAVAILABLE`; status and list still answer (report `OFFLINE`) so the station can display it.
- **Scanner**: in-memory events with a monotonic `seq`; feed returns events after `since`; codes are trimmed; offline → 503 for inject and feed.
- **Reset**: `dummy-scales` (reseed config, zero all state, online) and `dummy-scanner` (clear events, seq 0, online) registered with the reset registry.
- **Ports**: `ScalePort { listScales, getStatus, readWeight, tare }`, `ScannerPort { readEvents(sinceSeq), isOnline }` — Dummy adapters call the in-process Dummy services, same pattern as `OrgatexPort`.

### Proposed Clarification (needs your OK)

Story **003-scale-simulator-drives-weight** AC-3 mentions an "overshoot preset for the active component target/tolerance". The Dummy Scale does not (and should not) know which component is being weighed — that is WeighingMS session state. I propose: **the simulator API stays generic (`ramp to toMg`) and the "Simulate dispense / Simulate overshoot" presets are computed by the trainer panel (bolt 007, story 006-009)** from the active component's target and tolerance. I will amend the AC wording of story 003 accordingly.

### Acceptance Criteria

- [ ] `GET /api/scales` returns `scale-3kg` (PRECISION, capacity 3 000 000 mg, resolution 100 mg) and `scale-32kg` (FLOOR, capacity 32 000 000 mg, resolution 1 000 mg)
- [ ] Status, weight, tare endpoints per table; unknown scale → `404 SCALE_NOT_FOUND`
- [ ] Simulator set 93.5 g → weight `netMg 93500, stable true`
- [ ] Ramp to 94.2 g over 3 s → intermediate readings increase with `stable false`, fast early then slower; ending exactly `94200`, `stable true`
- [ ] Tare with load → net 0; subsequent set/ramp relative to new tare; tare offline → 503
- [ ] Offline → weight/tare 503, status `OFFLINE`; online → readings resume from last state
- [ ] Injected −5 g, 3 500 g (overload true) and NO_READING are reported as-is for WeighingMS to reject
- [ ] Readings rounded to resolution (e.g. 94.23 g on precision → 94 200 mg; 24.0004 kg on floor → 24 000 000 mg)
- [ ] Scanner: inject `B-24187` → one event in feed; `since` filters; blank code → 400; offline → 503; status reports offline
- [ ] `ScalePort` / `ScannerPort` adapters return the same data and propagate 503/404 codes
- [ ] Reset restores both scales and scanner (registered in `POST /api/training/reset` response)
- [ ] Weight endpoint responds in < 20 ms locally (supports NFR-1)
- [ ] lint, format, typecheck, tests green; coverage ≥ 80% lines and branches
- [ ] Step 18 evidence extended with scale/scanner calls

### Out of Scope (later bolts)

Which scale a component uses and tolerance/validity judgement (bolt 006/008), trainer panel UI (007), station UI polling (007), printer (010).
