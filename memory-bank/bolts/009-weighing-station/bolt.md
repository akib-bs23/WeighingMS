---
id: 009-weighing-station
unit: 004-weighing-station
intent: 001-assisted-weighing-station
type: ddd-construction-bolt
status: complete
stories:
  - 010-overshoot-detection-and-handling
  - 012-complete-batch
created: 2026-10-29T09:50:00Z
started: 2026-10-30T14:25:00Z
completed: "2026-10-30T18:00:00Z"
current_stage: null
stages_completed:
  - name: model
    completed: 2026-10-30T14:25:00Z
    artifact: ddd-01-domain-model.md
  - name: design
    completed: 2026-10-30T14:35:00Z
    artifact: ddd-02-technical-design.md
  - name: adr
    completed: 2026-10-30T14:38:00Z
    artifact: null
  - name: implement
    completed: 2026-10-30T17:46:00Z
    artifact: implementation-walkthrough.md
  - name: test
    completed: 2026-10-30T17:55:00Z
    artifact: ddd-03-test-report.md

requires_bolts: [008-weighing-station, 003-orgatex-integration]
enables_bolts: [010-ticket-printing, 011-assisted-weighing-station-ui]
requires_units: [001-orgatex-integration]
blocks: true

complexity:
  avg_complexity: 3
  avg_uncertainty: 3
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 009-weighing-station

## Overview

Implement the human-approved overshoot rule and batch completion with OrgaTEX write-back trigger.

## Objective

Overshoot follows exactly the rule recorded in STEP-24-overshoot-decision.md; a batch completes only at 5/5 (409 otherwise) with a correct summary (35.322 kg for prototype actuals) and triggers write-back.

## Workbook Steps Covered

Steps 24, 26

## Stories Included

- **010-overshoot-detection-and-handling**: Overshoot detection and handling (Must)
- **012-complete-batch**: Complete the batch (Must)

## Bolt Type

**Type**: DDD Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/ddd-construction-bolt.md`

## Stages

- ✅ **1. Domain Model**: Complete → ddd-01-domain-model.md
- ✅ **2. Technical Design**: Complete → ddd-02-technical-design.md
- ✅ **3. ADR Analysis (optional)**: Skipped (no ADR-worthy decisions)
- ✅ **4. Implement**: Complete → source code + implementation-walkthrough.md
- ✅ **5. Test**: Complete → tests + ddd-03-test-report.md

Each stage ends at a ⛔ human validation checkpoint.

## Expected Outputs

- **Human decision gate:** STEP-24 overshoot decision recorded before Domain Model stage
- Overshoot policy, completion + summary APIs, write-back trigger

## Test Expectations

- Unit/API per approved overshoot rule (STEP-24 test)
- API: complete 409/200, total dispensed, write-back status in summary

## Dependencies

### Requires
- 008-weighing-station
- 003-orgatex-integration

### Requires Units
- 001-orgatex-integration

### Enables
- 010-ticket-printing
- 011-assisted-weighing-station-ui

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] Tests passing (`pnpm lint`, `pnpm test`)
- [x] Code reviewed (human checkpoint)

## Notes

- ⛔ **Workbook Step 24 gate:** before the Domain Model stage, present 2–3 safe overshoot options with impact and STOP for a human decision; record it in `STEP-24-overshoot-decision.md` and amend story 004-weighing-station/010 acceptance criteria. Do not copy the prototype's recalculation.
- Dummy contracts are training-only; they make no claim about real interfaces.
