---
id: 003-orgatex-integration
unit: 001-orgatex-integration
intent: 001-assisted-weighing-station
type: simple-construction-bolt
status: complete
stories:
  - 004-dummy-orgatex-receives-consumption
  - 005-write-back-consumption-on-completion
created: 2026-10-29T09:50:00.000Z
started: 2026-10-29T10:46:49.000Z
completed: "2026-10-29T10:56:57Z"
current_stage: null
stages_completed:
  - name: plan
    completed: 2026-10-29T10:48:51.000Z
    artifact: implementation-plan.md
  - name: implement
    completed: 2026-10-29T10:53:43.000Z
    artifact: implementation-walkthrough.md
  - name: test
    completed: 2026-10-29T10:56:57Z
    artifact: test-walkthrough.md
requires_bolts:
  - 001-orgatex-integration
enables_bolts:
  - 009-weighing-station
  - 011-assisted-weighing-station-ui
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 003-orgatex-integration

## Overview

Complete the Dummy OrgaTEX with an idempotent consumption receiver and build the WeighingMS write-back service.

## Objective

`POST /api/batches/:batchId/consumption` stores exactly one record per idempotency key; write-back service reaches CONFIRMED, or PENDING when OrgaTEX is offline, and Retry recovers without duplicates.

## Workbook Steps Covered

Steps 16, 26 (backend)

## Stories Included

- **004-dummy-orgatex-receives-consumption**: Dummy OrgaTEX receives consumption idempotently (Must)
- **005-write-back-consumption-on-completion**: Write back consumption on batch completion (Must)

## Bolt Type

**Type**: Simple Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- ✅ **1. Plan**: Complete → implementation-plan.md
- ✅ **2. Implement**: Complete → source code + implementation-walkthrough.md
- ✅ **3. Test**: Complete → tests + test-walkthrough.md

Each stage ends at a ⛔ human validation checkpoint.

## Expected Outputs

- Consumption endpoint + store + training inspection read
- Write-back service with PENDING/CONFIRMED status and retry endpoint

## Test Expectations

- API: 200/400/404/409-conflict, idempotent repeat
- Service: offline → PENDING → retry → CONFIRMED; double retry → one record

## Dependencies

### Requires
- 001-orgatex-integration

### Requires Units
- None

### Enables
- 009-weighing-station
- 011-assisted-weighing-station-ui

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] Tests passing (`pnpm lint`, `pnpm test`)
- [x] Code reviewed (human checkpoint)

## Notes

- Dummy contracts are training-only; they make no claim about real interfaces.
