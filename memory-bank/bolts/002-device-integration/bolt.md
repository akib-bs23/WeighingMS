---
id: 002-device-integration
unit: 002-device-integration
intent: 001-assisted-weighing-station
type: simple-construction-bolt
status: complete
stories:
  - 001-dummy-scales-report-weight-and-status
  - 002-scale-tare-command
  - 003-scale-simulator-drives-weight
  - 004-scale-offline-simulation
  - 005-dummy-scanner-delivers-scans
created: 2026-10-29T09:50:00.000Z
started: 2026-10-29T10:12:46.000Z
completed: "2026-10-29T10:35:47Z"
current_stage: null
stages_completed:
  - name: plan
    completed: 2026-10-29T10:14:56.000Z
    artifact: implementation-plan.md
  - name: implement
    completed: 2026-10-29T10:31:48.000Z
    artifact: implementation-walkthrough.md
  - name: test
    completed: 2026-10-29T10:35:53Z
    artifact: test-walkthrough.md
requires_bolts:
  - 001-orgatex-integration
enables_bolts:
  - 004-batch-management
  - 006-weighing-station
  - 007-assisted-weighing-station-ui
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 002-device-integration

## Overview

Provide the Dummy Scale (×2) and Dummy Scanner APIs with simulator controls and their ports.

## Objective

Both scales report weight/stability/status, tare works, the simulator can set/ramp/overshoot/invalidate/offline a scale, and scans can be injected and read from a feed.

## Workbook Steps Covered

Steps 16, 18

## Stories Included

- **001-dummy-scales-report-weight-and-status**: Dummy scales report weight and status (Must)
- **002-scale-tare-command**: Scale tare command (Must)
- **003-scale-simulator-drives-weight**: Scale simulator drives the weight (Must)
- **004-scale-offline-simulation**: Scale offline simulation (Must)
- **005-dummy-scanner-delivers-scans**: Dummy scanner delivers scans (Must)

## Bolt Type

**Type**: Simple Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- ✅ **1. Plan**: Complete → implementation-plan.md
- ✅ **2. Implement**: Complete → source code + implementation-walkthrough.md
- ✅ **3. Test**: Complete → tests + test-walkthrough.md

Each stage ends at a ⛔ human validation checkpoint.

## Expected Outputs

- `/api/scales`, `/api/scales/:scaleId/status`, `/weight`, `/tare`
- Scale & scanner simulator endpoints (training prefix)
- `ScalePort`, `ScannerPort` + Dummy adapters

## Test Expectations

- API tests for every endpoint incl. offline 503 and invalid flag
- Perf: weight endpoint < 20 ms locally
- Evidence: STEP-18 api tests (scales)

## Dependencies

### Requires
- 001-orgatex-integration

### Requires Units
- None

### Enables
- 004-batch-management
- 006-weighing-station
- 007-assisted-weighing-station-ui

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] Tests passing (`pnpm lint`, `pnpm test`)
- [x] Code reviewed (human checkpoint)

## Notes

- Dummy contracts are training-only; they make no claim about real interfaces.
