---
id: 006-confirm-and-print-screen
unit: 006-assisted-weighing-station-ui
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00Z
assigned_bolt: 011-assisted-weighing-station-ui
implemented: true
---

# Story: 006-confirm-and-print-screen

**Title**: Screen 3 · Confirm & print

## User Story

**As a** operator
**I want** to see the completed batch summary, OrgaTEX write-back status and the ticket, print it, and go to the next batch
**So that** I finish the batch and hand over the container with its ticket (FR-23, FR-24, FR-25)

## Requirements

- **Unit**: `006-assisted-weighing-station-ui`
- **Requirements**: FR-23, FR-24, FR-25, FR-26, TD-8, TD-9

## Acceptance Criteria

- [ ] **Given** 5/5 done, **Then** Screen 3 shows `Batch B-24187 weighed`, summary (5 of 5, all within tolerance, total, elapsed, operator) and `Written to OrgaTEX · CONFIRMED HH:MM:SS`
- [ ] **Given** OrgaTEX was offline, **Then** `PENDING` with Retry; after Retry with OrgaTEX online → CONFIRMED
- [ ] **Given** Print ticket (F1), **Then** the ticket preview (Code 128 barcode) shows and the print result is displayed; printer offline → "Printer unavailable" + Retry
- [ ] **Given** Next batch (F3), **Then** Screen 1 reloads the queue

## UI/UX Impact

Reproduces prototype view 3 (L567–L616) with computed values.

## API Dependencies

- 004 summary
- 001 write-back status/retry
- 005 ticket compose/print

## Test Expectations

- Component: summary + statuses
- E2E: STEP-26 UI, STEP-27 ticket

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 005-weigh-actions
- 004-weighing-station/012-complete-batch
- 005-ticket-printing/002-compose-and-print-weighing-ticket
- 001-orgatex-integration/005-write-back-consumption-on-completion

### Enables
- 010-end-to-end-and-failure-test-suites

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| — | — |

## Out of Scope

- None
