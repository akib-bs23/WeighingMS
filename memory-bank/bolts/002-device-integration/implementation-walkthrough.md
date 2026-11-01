---
stage: implement
bolt: 002-device-integration
created: 2026-10-29T10:18:30Z
---

## Implementation Walkthrough: device-integration

### Summary

The station's shop-floor devices now exist as Dummy APIs behind ports. Two Dummy Scales report net weight, stability, overload and faults with a working tare, and a training simulator can set a weight, simulate an eased pour, inject bad readings and take a scale offline. A Dummy Scanner accepts injected scans and serves them through a sequence-numbered feed. Both reset with the training scenario.

### Structure Overview

`integrations/scale` and `integrations/scanner` mirror the OrgaTEX layout: a port contract at the top and a `dummy` folder with the Dummy service (state and behaviour), the workbook-facing controller, a training-simulator controller and the port adapter. Scale configuration is a seeded WeighingMS table; live device state is in memory. A global clock provider supplies time so simulated pours are deterministic in tests. Shared device contracts live in `src/shared/contracts/devices.ts`.

### Completed Work

- [x] `src/shared/contracts/devices.ts` - scale, reading, tare, scan and availability contract types
- [x] `src/server/common/clock/clock.ts` - injectable clock (system clock by default)
- [x] `src/server/common/async/settle.ts` - shared helper that exposes Dummy calls as promises (used by all adapters)
- [x] `src/server/training/dto/availability.dto.ts` - shared online/offline request body for training controls
- [x] `src/server/database/schema/scales.ts`, `schema/index.ts` - scale configuration table
- [x] `src/server/database/migrations/0001_scales.sql` (+ meta) - generated migration
- [x] `src/server/integrations/scale/scale.port.ts` - ScalePort contract and DI token
- [x] `src/server/integrations/scale/dummy/dummy-scale.service.ts` - gross/tare/net model, resolution rounding, eased ramp, faults, offline, reset hook
- [x] `src/server/integrations/scale/dummy/dummy-scale.controller.ts` - the four workbook scale endpoints
- [x] `src/server/integrations/scale/dummy/scale-training.controller.ts` - simulator: availability, set weight / fault, ramp
- [x] `src/server/integrations/scale/dummy/dummy-scale.adapter.ts` - ScalePort implementation
- [x] `src/server/integrations/scale/scale.module.ts` - binds ScalePort to the Dummy adapter
- [x] `src/server/integrations/scanner/scanner.port.ts` - ScannerPort contract and DI token
- [x] `src/server/integrations/scanner/dummy/dummy-scanner.service.ts` - scan events, sequence, offline, reset hook
- [x] `src/server/integrations/scanner/dummy/dummy-scanner.controller.ts` - status and event feed
- [x] `src/server/integrations/scanner/dummy/scanner-training.controller.ts` - inject scan, availability
- [x] `src/server/integrations/scanner/dummy/dummy-scanner.adapter.ts` - ScannerPort implementation
- [x] `src/server/integrations/scanner/scanner.module.ts` - binds ScannerPort to the Dummy adapter
- [x] `src/server/app.module.ts` - imports ClockModule, ScaleModule, ScannerModule
- [x] `src/server/integrations/orgatex/dummy/dummy-orgatex.adapter.ts`, `orgatex-training.controller.ts` - refactored onto the shared `settle` helper and availability DTO (no behaviour change)
- [x] `tests/server/training/reset.api.test.ts` - reset assertion now checks inclusion (more modules register)

### Key Decisions

- **Net is what the simulator sets**: matches how a trainer thinks ("94.2 g poured"); gross = tare + net.
- **Readings passed through as an indicator reports them**: negative, overload (gross above capacity) and `NO_READING` are reported, not rejected — FR-30 validity belongs to WeighingMS (bolt 008).
- **Offline keeps status answering**: weight and tare return 503 while list/status report `OFFLINE`, so the station can display the state.
- **Pour computed from elapsed time**: no timers or background work; ease-out cubic, unstable until finished, then exactly the target. The eased position is rounded back to whole milligrams and to the scale resolution (simulation-only use of a fractional factor).
- **Tare during a pour** re-bases the pour on the new zero for the remaining time.
- **Simulator presets stay in the trainer panel** (approved clarification): the API is component-agnostic.

### Deviations from Plan

- Added `src/server/common/async/settle.ts` and `src/server/training/dto/availability.dto.ts` to remove duplication with bolt 001's OrgaTEX adapter and training controller (planned files unchanged otherwise).
- Fault injection uses `{ fault: 'NO_READING' }` (plan: same); exactly one of `netMg` / `fault` is required (400 otherwise).

### Dependencies Added

None.

### Developer Notes

- The dev watcher must be restarted after a Playwright run that started its own server; a stale API process on :3000 kept serving the bolt 001 build until restarted.
- Simulator examples: `POST /api/training/scales/scale-3kg/weight {"netMg":93500}`, `POST /api/training/scales/scale-3kg/ramp {"toMg":94200,"durationMs":3000}`, `PUT /api/training/scales/scale-32kg {"online":false}`, `POST /api/training/scanner/scans {"code":"B-24187"}`.
