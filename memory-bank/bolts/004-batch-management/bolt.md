---
id: 004-batch-management
unit: 003-batch-management
intent: 001-assisted-weighing-station
type: simple-construction-bolt
status: complete
stories:
  - 001-station-batch-queue
  - 002-select-released-batch-and-load-recipe
  - 003-orgatex-unavailable-on-load
created: 2026-10-29T09:50:00.000Z
started: 2026-10-29T10:57:45.000Z
completed: "2026-10-29T11:04:48Z"
current_stage: null
stages_completed:
  - name: plan
    completed: 2026-10-29T11:00:31.000Z
    artifact: implementation-plan.md
  - name: implement
    completed: 2026-10-29T11:02:56.000Z
    artifact: implementation-walkthrough.md
  - name: test
    completed: 2026-10-29T11:04:50Z
    artifact: test-walkthrough.md
requires_bolts:
  - 001-orgatex-integration
  - 002-device-integration
enables_bolts:
  - 005-assisted-weighing-station-ui
  - 006-weighing-station
requires_units:
  - 001-orgatex-integration
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 004-batch-management

## Overview

Expose the station's batch queue, batch eligibility rule (RELEASED only) and recipe retrieval over `OrgatexPort`.

## Objective

Station API returns the queue with receivedAt; selecting B-24187 loads batch then recipe; B-24188 is refused with the reason; unknown code 404; OrgaTEX offline 503.

## Workbook Steps Covered

Steps 19 (backend)

## Stories Included

- **001-station-batch-queue**: Station batch queue (Must)
- **002-select-released-batch-and-load-recipe**: Select a released batch and load its recipe (Must)
- **003-orgatex-unavailable-on-load**: OrgaTEX unavailable when loading work (Must)

## Bolt Type

**Type**: Simple Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- ✅ **1. Plan**: Complete → implementation-plan.md
- ✅ **2. Implement**: Complete → source code + implementation-walkthrough.md
- ✅ **3. Test**: Complete → tests + test-walkthrough.md

Each stage ends at a ⛔ human validation checkpoint.

## Expected Outputs

- `BatchesModule` (queue, select, recipe) + error mapping

## Test Expectations

- API: queue, select success/409/404/503
- Call-order check batch → recipe

## Dependencies

### Requires
- 001-orgatex-integration
- 002-device-integration

### Requires Units
- 001-orgatex-integration

### Enables
- 005-assisted-weighing-station-ui
- 006-weighing-station

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] Tests passing (`pnpm lint`, `pnpm test`)
- [x] Code reviewed (human checkpoint)

## Notes

- Dummy contracts are training-only; they make no claim about real interfaces.
