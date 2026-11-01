---
id: 012-complete-batch
unit: 004-weighing-station
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00Z
assigned_bolt: 009-weighing-station
implemented: true
---

# Story: 012-complete-batch

**Title**: Complete the batch

## User Story

**As a** operator
**I want** the batch to complete only when all components are done, with a summary and OrgaTEX write-back started
**So that** incomplete batches never leave the station (FR-23)

## Requirements

- **Unit**: `004-weighing-station`
- **Requirements**: FR-23, FR-24 (trigger)

## Acceptance Criteria

- [ ] **Given** 5 of 5 done, **When** completion runs, **Then** session status COMPLETED, completedAt set, summary returned: components `5 of 5`, all within tolerance YES/NO (NO if any OVERRIDDEN), total dispensed (kg 3 dp), elapsed, operator
- [ ] **Given** fewer than 5 done, **When** completion is requested, **Then** `409 BATCH_INCOMPLETE`
- [ ] **Given** prototype actuals 1241.5 g, 385.4 g, 94.2 g, 23.980 kg, 9.621 kg, **When** summarised, **Then** total dispensed = `35.322 kg`
- [ ] **Given** completion, **When** it succeeds, **Then** write-back (001-005) is triggered and its status included in the summary

## UI/UX Impact

Screen 3 summary.

## API Dependencies

- WeighingMS: `POST /api/sessions/:id/complete`, `GET /api/sessions/:id/summary`
- 001 write-back service

## Test Expectations

- API: complete, 409, total
- E2E (Step 30): incomplete batch cannot complete

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 011-component-progression
- 001-orgatex-integration/005-write-back-consumption-on-completion

### Enables
- 005-ticket-printing/002-compose-and-print-weighing-ticket
- 006-assisted-weighing-station-ui/006-confirm-and-print-screen

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Complete called twice | Idempotent: same summary, no second write-back record |

## Out of Scope

- None
