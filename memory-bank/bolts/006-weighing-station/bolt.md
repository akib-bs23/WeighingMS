---
id: 006-weighing-station
unit: 004-weighing-station
intent: 001-assisted-weighing-station
type: ddd-construction-bolt
status: complete
stories:
  - 001-start-and-resume-weighing-session
  - 002-shared-quantity-and-tolerance-rules
  - 003-activate-component-with-scale-selection-and-tare
  - 004-retare
  - 005-confirm-in-tolerance-weighing
  - 011-component-progression
created: 2026-10-29T09:50:00.000Z
started: 2026-10-29T12:08:33.000Z
completed: "2026-10-30T03:27:52Z"
current_stage: null
stages_completed:
  - name: model
    completed: 2026-10-29T12:11:18.000Z
    artifact: ddd-01-domain-model.md
  - name: design
    completed: 2026-10-29T12:14:46.000Z
    artifact: ddd-02-technical-design.md
  - name: adr
    completed: 2026-10-29T12:15:14.000Z
    artifact: null
  - name: implement
    completed: 2026-10-29T18:22:12.000Z
    artifact: implementation-walkthrough.md
  - name: test
    completed: 2026-10-30T03:28:16Z
    artifact: ddd-03-test-report.md
requires_bolts:
  - 004-batch-management
  - 002-device-integration
enables_bolts:
  - 007-assisted-weighing-station-ui
  - 008-weighing-station
requires_units:
  - 002-device-integration
  - 003-batch-management
blocks: false
complexity:
  avg_complexity: 3
  avg_uncertainty: 1
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 006-weighing-station

## Overview

Model and build the weighing-session core: quantities, tolerance and zones, scale selection, tare, confirmation with immutable records, and progression.

## Objective

A session for B-24187 can be started/resumed; each component activates on the right scale with tare; confirmation succeeds only in tolerance and stable (server re-validates) and records full traceability; components progress in order.

## Workbook Steps Covered

Steps 20, 21, 22, 23, 25 (backend)

## Stories Included

- **001-start-and-resume-weighing-session**: Start and resume a weighing session (Must)
- **002-shared-quantity-and-tolerance-rules**: Shared quantity, tolerance and zone rules (Must)
- **003-activate-component-with-scale-selection-and-tare**: Activate a component with automatic scale selection and tare (Must)
- **004-retare**: Re-tare the scale (Must)
- **005-confirm-in-tolerance-weighing**: Confirm an in-tolerance weighing (Must)
- **011-component-progression**: Component progression (Must)

## Bolt Type

**Type**: DDD Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/ddd-construction-bolt.md`

## Stages

- ✅ **1. Domain Model**: Complete → ddd-01-domain-model.md
- ✅ **2. Technical Design**: Complete → ddd-02-technical-design.md
- ✅ **3. ADR Analysis (optional)**: Skipped — no ADR-worthy decisions → adr-{n}-{slug}.md
- ✅ **4. Implement**: Complete → source code
- ✅ **5. Test**: Complete → tests + ddd-03-test-report.md

Each stage ends at a ⛔ human validation checkpoint.

## Expected Outputs

- `ddd-01-domain-model.md`, `ddd-02-technical-design.md`, ADRs as needed
- `src/shared` rules (Quantity mg, ToleranceBand, zone, remaining, format)
- `WeighingModule` session/activate/retare/confirm APIs, Drizzle schema

## Test Expectations

- Unit: tolerance boundary table 93.4/93.5/94.0/94.5/94.6 (STEP-22 evidence), zones, threshold 3 000 g
- API: start/resume, activate, retare, confirm 200/422, progression order
- 100 % branch coverage on tolerance/confirm rules

## Dependencies

### Requires
- 004-batch-management
- 002-device-integration

### Requires Units
- 002-device-integration
- 003-batch-management

### Enables
- 007-assisted-weighing-station-ui
- 008-weighing-station

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] Tests passing (`pnpm lint`, `pnpm test`)
- [x] Code reviewed (human checkpoint)

## Notes

- Dummy contracts are training-only; they make no claim about real interfaces.
