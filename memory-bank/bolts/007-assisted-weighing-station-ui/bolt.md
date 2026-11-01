---
id: 007-assisted-weighing-station-ui
unit: 006-assisted-weighing-station-ui
intent: 001-assisted-weighing-station
type: simple-construction-bolt
status: complete
stories:
  - 003-weigh-screen-recipe-rail-and-component-header
  - 004-live-weight-readouts-and-progress-bar
  - 009-trainer-simulator-panel
created: 2026-10-29T09:50:00Z
started: 2026-10-30T03:31:47Z
completed: "2026-10-30T10:25:00Z"
current_stage: null
stages_completed:
  - name: plan
    completed: 2026-10-30T03:55:49Z
    artifact: implementation-plan.md
  - name: implement
    completed: 2026-10-30T04:04:51Z
    artifact: implementation-walkthrough.md
  - name: test
    completed: 2026-10-30T10:20:00Z
    artifact: test-walkthrough.md

requires_bolts: [005-assisted-weighing-station-ui, 006-weighing-station, 002-device-integration]
enables_bolts: [011-assisted-weighing-station-ui]
requires_units: [002-device-integration, 004-weighing-station]
blocks: false

complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 2
  testing_scope: 3
---

# Bolt: 007-assisted-weighing-station-ui

## Overview

Build Screen 2's information display — recipe rail, component header, scale badge, live weight readouts, progress bar, status line — and the trainer simulator panel.

## Objective

Screen 2 reproduces the prototype layout with live polled weight (≤ 200 ms), correct zones/colours, g↔kg scale switch between Yellow RGB and Sodium Sulphate, and a separate trainer panel driving the Dummies.

## Workbook Steps Covered

Steps 20, 21, 22

## Stories Included

- **003-weigh-screen-recipe-rail-and-component-header**: Screen 2 · Recipe rail, component header and scale badge (Must)
- **004-live-weight-readouts-and-progress-bar**: Screen 2 · Live weight, readouts, progress bar and status line (Must)
- **009-trainer-simulator-panel**: Trainer simulator panel (Must)

## Bolt Type

**Type**: Simple Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- ✅ **1. Plan**: Complete → implementation-plan.md
- ✅ **2. Implement**: Complete → source code + implementation-walkthrough.md
- ✅ **3. Test**: Complete → tests + test-walkthrough.md

Each stage ends at a ⛔ human validation checkpoint.

## Expected Outputs

- Recipe rail, header, scale badge, readouts, progress bar, status line
- `useLiveWeight` 100 ms polling hook
- Trainer panel

## Test Expectations

- Component: zone rendering at boundary values, units switch
- Playwright: scale switch, latency
- Evidence: STEP-20 weigh screen, STEP-21 scale switch/API, STEP-22 tolerance UI

## Dependencies

### Requires
- 005-assisted-weighing-station-ui
- 006-weighing-station
- 002-device-integration

### Requires Units
- 002-device-integration
- 004-weighing-station

### Enables
- 011-assisted-weighing-station-ui

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] Tests passing (`pnpm lint`, `pnpm test`, `pnpm test:e2e`)
- [x] Code reviewed (human checkpoint)

## Notes

- Dummy contracts are training-only; they make no claim about real interfaces.
