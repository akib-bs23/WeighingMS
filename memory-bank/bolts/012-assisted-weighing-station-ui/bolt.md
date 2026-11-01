---
id: 012-assisted-weighing-station-ui
unit: 006-assisted-weighing-station-ui
intent: 001-assisted-weighing-station
type: simple-construction-bolt
status: complete
stories:
  - 007-device-status-strip-and-failure-states
  - 010-end-to-end-and-failure-test-suites
created: 2026-10-29T09:50:00Z
started: 2026-10-31T10:30:00Z
completed: "2026-10-31T11:45:00Z"
current_stage: null
stages_completed:
  - name: plan
    completed: 2026-10-31T10:30:00Z
    artifact: implementation-plan.md
  - name: implement
    completed: 2026-10-31T11:05:00Z
    artifact: implementation-walkthrough.md
  - name: test
    completed: 2026-10-31T11:40:00Z
    artifact: test-walkthrough.md

requires_bolts: [011-assisted-weighing-station-ui, 008-weighing-station]
enables_bolts: []
requires_units: [001-orgatex-integration, 002-device-integration, 003-batch-management, 004-weighing-station, 005-ticket-printing]
blocks: true

complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 3
  testing_scope: 3
---

# Bolt: 012-assisted-weighing-station-ui

## Overview

Finish the live status strip and failure states, then prove the whole product with the Playwright end-to-end and failure suites.

## Objective

Status strip reflects every device/OrgaTEX state within 2 s; every Step 30 failure scenario behaves as defined; the full B-24187 Playwright run and failure suite are green with report and video.

## Workbook Steps Covered

Steps 28, 29, 30

## Stories Included

- **007-device-status-strip-and-failure-states**: Status strip and failure states (Must)
- **010-end-to-end-and-failure-test-suites**: End-to-end and failure Playwright suites (Must)

## Bolt Type

**Type**: Simple Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- ✅ **1. Plan**: Complete → implementation-plan.md
- ✅ **2. Implement**: Complete → source code + implementation-walkthrough.md
- ✅ **3. Test**: Complete → tests + test-walkthrough.md

Each stage ends at a ⛔ human validation checkpoint.

## Expected Outputs

- Status strip + failure banners
- Playwright `e2e/` happy path and `failures/` specs, HTML report, video

## Test Expectations

- Playwright happy path (STEP-29 report + video)
- Playwright failure suite (STEP-30 table)
- UI validation vs prototype (STEP-28)

## Dependencies

### Requires
- 011-assisted-weighing-station-ui
- 008-weighing-station

### Requires Units
- 001-orgatex-integration
- 002-device-integration
- 003-batch-management
- 004-weighing-station
- 005-ticket-printing

### Enables
- None (final bolt)

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] Tests passing (`pnpm lint`, `pnpm test`, `pnpm test:e2e`)
- [x] Code reviewed (human checkpoint)

## Notes

- Dummy contracts are training-only; they make no claim about real interfaces.
