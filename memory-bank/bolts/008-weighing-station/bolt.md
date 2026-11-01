---
id: 008-weighing-station
unit: 004-weighing-station
intent: 001-assisted-weighing-station
type: ddd-construction-bolt
status: complete
stories:
  - 006-reading-safety-unstable-offline-invalid
  - 007-dyestuff-identity-verification
  - 008-supervisor-override
  - 009-quit-abandon-component
  - 013-weighing-records-and-audit-trail
created: 2026-10-29T09:50:00Z
started: 2026-10-30T10:30:00Z
completed: "2026-10-30T11:20:00Z"
current_stage: null
stages_completed:
  - name: model
    completed: 2026-10-30T10:30:00Z
    artifact: ddd-01-domain-model.md
  - name: design
    completed: 2026-10-30T10:40:00Z
    artifact: ddd-02-technical-design.md
  - name: adr
    completed: 2026-10-30T10:43:00Z
    artifact: null
  - name: implement
    completed: 2026-10-30T11:05:00Z
    artifact: implementation-walkthrough.md
  - name: test
    completed: 2026-10-30T11:15:00Z
    artifact: ddd-03-test-report.md

requires_bolts: [006-weighing-station]
enables_bolts: [009-weighing-station, 010-ticket-printing, 012-assisted-weighing-station-ui]
requires_units: [002-device-integration]
blocks: true

complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 008-weighing-station

## Overview

Extend the weighing domain with safety (offline/invalid readings), identity verification, supervisor override, Quit/abandon and the audit/records read model.

## Objective

Offline/invalid readings can never be confirmed; wrong dyestuff blocks OK; supervisor PIN + reason produces OVERRIDDEN records without leaking the PIN; Quit leaves no record but an audit event; records and audit are retrievable and immutable.

## Workbook Steps Covered

Steps 25, 30 (backend)

## Stories Included

- **006-reading-safety-unstable-offline-invalid**: Reading safety: offline and invalid readings (Must)
- **007-dyestuff-identity-verification**: Dyestuff identity verification by scan (Should)
- **008-supervisor-override**: Supervisor override with PIN and reason (Must)
- **009-quit-abandon-component**: Quit (abandon) the current component (Must)
- **013-weighing-records-and-audit-trail**: Weighing records and audit trail (Must)

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

- Domain model/design updates (`ddd-01`, `ddd-02` for this bolt)
- Override, identity, quit APIs; records/audit queries

## Test Expectations

- API: offline 503, invalid 422, identity mismatch 409, override 401/400/200, quit audit
- Security: PIN absent from responses/logs
- Evidence: STEP-25 transaction JSON

## Dependencies

### Requires
- 006-weighing-station

### Requires Units
- 002-device-integration

### Enables
- 009-weighing-station
- 010-ticket-printing
- 012-assisted-weighing-station-ui

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] Tests passing (`pnpm lint`, `pnpm test`)
- [x] Code reviewed (human checkpoint)

## Notes

- Dummy contracts are training-only; they make no claim about real interfaces.
