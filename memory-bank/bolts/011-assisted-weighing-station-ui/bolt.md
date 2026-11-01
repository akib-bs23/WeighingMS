---
id: 011-assisted-weighing-station-ui
unit: 006-assisted-weighing-station-ui
intent: 001-assisted-weighing-station
type: simple-construction-bolt
status: complete
stories:
  - 005-weigh-actions
  - 006-confirm-and-print-screen
  - 008-function-keys
created: 2026-10-29T09:50:00Z
started: 2026-10-31T09:00:00Z
completed: "2026-10-31T10:15:00Z"
current_stage: null
stages_completed:
  - name: plan
    completed: 2026-10-31T09:00:00Z
    artifact: implementation-plan.md
  - name: implement
    completed: 2026-10-31T09:40:00Z
    artifact: implementation-walkthrough.md
  - name: test
    completed: 2026-10-31T10:10:00Z
    artifact: test-walkthrough.md

requires_bolts: [007-assisted-weighing-station-ui, 009-weighing-station, 010-ticket-printing, 003-orgatex-integration]
enables_bolts: [012-assisted-weighing-station-ui]
requires_units: [001-orgatex-integration, 004-weighing-station, 005-ticket-printing]
blocks: true

complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 2
  testing_scope: 3
---

# Bolt: 011-assisted-weighing-station-ui

## Overview

Make Screen 2 actionable (OK, Re-tare, Quit, Supervisor override, overshoot panel) and build Screen 3 · Confirm & print with F-keys.

## Objective

The operator can weigh all five components through the UI, override with PIN + reason, see the overshoot panel per the Step 24 rule, reach Screen 3 with `Written to OrgaTEX · CONFIRMED` (or PENDING + Retry), print the ticket, and go to the next batch; F1–F4 work.

## Workbook Steps Covered

Steps 23, 24, 25, 26, 27

## Stories Included

- **005-weigh-actions**: Screen 2 · OK, Re-tare, Quit, Supervisor override and overshoot panel (Must)
- **006-confirm-and-print-screen**: Screen 3 · Confirm & print (Must)
- **008-function-keys**: Function keys F1–F4 (Should)

## Bolt Type

**Type**: Simple Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- ✅ **1. Plan**: Complete → implementation-plan.md
- ✅ **2. Implement**: Complete → source code + implementation-walkthrough.md
- ✅ **3. Test**: Complete → tests + test-walkthrough.md

Each stage ends at a ⛔ human validation checkpoint.

## Expected Outputs

- Action keys + override dialog + surplus panel
- Screen 3 summary, write-back status, ticket preview (Code 128), print/retry, next batch
- F-key handling

## Test Expectations

- Component: enablement matrix, dialog validation, Screen 3 states
- Playwright: confirm/override/quit, completion, ticket
- Evidence: STEP-23 five-component demo, STEP-24 UI, STEP-25 confirmation, STEP-26 UI, STEP-27 ticket

## Dependencies

### Requires
- 007-assisted-weighing-station-ui
- 009-weighing-station
- 010-ticket-printing
- 003-orgatex-integration

### Requires Units
- 001-orgatex-integration
- 004-weighing-station
- 005-ticket-printing

### Enables
- 012-assisted-weighing-station-ui

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] Tests passing (`pnpm lint`, `pnpm test`, `pnpm test:e2e`)
- [x] Code reviewed (human checkpoint)

## Notes

- Dummy contracts are training-only; they make no claim about real interfaces.
