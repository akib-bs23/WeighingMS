---
id: 010-ticket-printing
unit: 005-ticket-printing
intent: 001-assisted-weighing-station
type: simple-construction-bolt
status: complete
stories:
  - 001-dummy-printer-accepts-tickets
  - 002-compose-and-print-weighing-ticket
  - 003-reprint-ticket
created: 2026-10-29T09:50:00Z
started: 2026-10-30T18:10:00Z
completed: "2026-10-30T18:30:00Z"
current_stage: null
stages_completed:
  - name: plan
    completed: 2026-10-30T18:10:00Z
    artifact: implementation-plan.md
  - name: implement
    completed: 2026-10-30T18:15:00Z
    artifact: implementation-walkthrough.md
  - name: test
    completed: 2026-10-30T18:20:00Z
    artifact: test-walkthrough.md

requires_bolts: [009-weighing-station, 008-weighing-station]
enables_bolts: [011-assisted-weighing-station-ui]
requires_units: [004-weighing-station]
blocks: true

complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 010-ticket-printing

## Overview

Compose the weighing ticket and print it through the Dummy Printer, with offline handling and reprint.

## Objective

`POST /api/tickets` prints the B-24187 ticket with all prototype fields and a Code 128 batch barcode; printer offline returns an error with retry while the ticket stays available; reprints are marked REPRINT and audited.

## Workbook Steps Covered

Steps 27 (backend)

## Stories Included

- **001-dummy-printer-accepts-tickets**: Dummy printer accepts tickets (Must)
- **002-compose-and-print-weighing-ticket**: Compose, preview and print the weighing ticket (Must)
- **003-reprint-ticket**: Reprint a ticket marked REPRINT (Could)

## Bolt Type

**Type**: Simple Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- ✅ **1. Plan**: Complete → implementation-plan.md
- ✅ **2. Implement**: Complete → source code + implementation-walkthrough.md
- ✅ **3. Test**: Complete → tests + test-walkthrough.md

Each stage ends at a ⛔ human validation checkpoint.

## Expected Outputs

- Dummy Printer endpoint + `PrinterPort`
- Ticket composer
- Reprint + audit

## Test Expectations

- Unit: composer content
- API: 201/503, reprint marking
- Evidence: STEP-27 printer API, ticket test

## Dependencies

### Requires
- 009-weighing-station
- 008-weighing-station

### Requires Units
- 004-weighing-station

### Enables
- 011-assisted-weighing-station-ui

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] Tests passing (`pnpm lint`, `pnpm test`)
- [x] Code reviewed (human checkpoint)

## Notes

- Dummy contracts are training-only; they make no claim about real interfaces.
