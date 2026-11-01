---
id: 005-assisted-weighing-station-ui
unit: 006-assisted-weighing-station-ui
intent: 001-assisted-weighing-station
type: simple-construction-bolt
status: complete
stories:
  - 001-station-shell-and-api-client
  - 002-batch-selection-screen
created: 2026-10-29T09:50:00.000Z
started: 2026-10-29T11:06:38.000Z
completed: "2026-10-29T12:06:54Z"
current_stage: null
stages_completed:
  - name: plan
    completed: 2026-10-29T11:08:49.000Z
    artifact: implementation-plan.md
  - name: implement
    completed: 2026-10-29T11:46:50.000Z
    artifact: implementation-walkthrough.md
  - name: test
    completed: 2026-10-29T12:06:34.000Z
    artifact: test-walkthrough.md
requires_bolts:
  - 004-batch-management
enables_bolts:
  - 007-assisted-weighing-station-ui
requires_units:
  - 003-batch-management
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 2
  testing_scope: 3
---

# Bolt: 005-assisted-weighing-station-ui

## Overview

Build the station frame, typed API client and Screen 1 · Select batch fed only by the API.

## Objective

The station UI shows the HMI frame, top bar and the queue from the API; touching or scanning B-24187 opens the (placeholder) weigh view; B-24188 shows the rejection; no batch data in UI code.

## Workbook Steps Covered

Steps 19

## Stories Included

- **001-station-shell-and-api-client**: Station shell, top bar and typed API client (Must)
- **002-batch-selection-screen**: Screen 1 · Select batch (Must)

## Bolt Type

**Type**: Simple Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- ✅ **1. Plan**: Complete → implementation-plan.md
- ✅ **2. Implement**: Complete → source code + implementation-walkthrough.md
- ✅ **3. Test**: Complete → tests + test-walkthrough.md

Each stage ends at a ⛔ human validation checkpoint.

## Expected Outputs

- React app shell + routing by state
- `src/client/api/` typed client
- Top bar, Screen 1 components
- Keyboard-wedge scan input + scan feed

## Test Expectations

- Component tests: queue rows, rejection, OrgaTEX error
- Playwright: select B-24187 / reject B-24188
- Evidence: STEP-19 batch screen, network, test

## Dependencies

### Requires
- 004-batch-management

### Requires Units
- 003-batch-management

### Enables
- 007-assisted-weighing-station-ui

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] Tests passing (`pnpm lint`, `pnpm test`, `pnpm test:e2e`)
- [x] Code reviewed (human checkpoint)

## Notes

- Dummy contracts are training-only; they make no claim about real interfaces.
