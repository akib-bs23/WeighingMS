---
id: 004-dummy-orgatex-receives-consumption
unit: 001-orgatex-integration
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00.000Z
assigned_bolt: 003-orgatex-integration
implemented: true
---

# Story: 004-dummy-orgatex-receives-consumption

**Title**: Dummy OrgaTEX receives consumption idempotently

## User Story

**As a** WeighingMS station
**I want** OrgaTEX to accept actual consumption for a batch exactly once
**So that** consumption reconciles against the batch without duplicates (BR-12, IR-08)

## Requirements

- **Unit**: `001-orgatex-integration`
- **Requirements**: DB-2, NFR-10, brief IR-05, IR-08

## Acceptance Criteria

- [ ] **Given** a valid payload with idempotency key K, **When** `POST /api/batches/B-24187/consumption` is called, **Then** `200 OK` with `{ consumptionId, confirmedAt }` and one stored record
- [ ] **Given** the same key K is posted again, **When** the request completes, **Then** `200` returns the original consumptionId and still exactly one record exists
- [ ] **Given** an invalid payload (missing lines or quantities), **When** posted, **Then** `400` with validation error and nothing stored
- [ ] **Given** a stored record, **When** inspected (training inspection endpoint or DB), **Then** it shows all component lines with lot, target, actual, uom, scale, result, operator, completedAt

## UI/UX Impact

Indirect: drives "Written to OrgaTEX" status on Screen 3.

## API Dependencies

- `POST /api/batches/:batchId/consumption`
- Training inspection read of stored consumption (training prefix)

## Test Expectations

- API: 200 + stored record
- API: idempotent repeat
- API: 400 on invalid
- Evidence for workbook Step 26 (request, response, stored data)

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 003-dummy-orgatex-serves-recipe

### Enables
- 005-write-back-consumption-on-completion

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Same key, different payload | 409 IDEMPOTENCY_CONFLICT; original kept |
| Unknown batch | 404 |

## Out of Scope

- Real OrgaTEX consumption contract (OQ-02)
