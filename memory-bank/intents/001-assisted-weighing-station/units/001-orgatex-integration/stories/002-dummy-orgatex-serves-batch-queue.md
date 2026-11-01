---
id: 002-dummy-orgatex-serves-batch-queue
unit: 001-orgatex-integration
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00.000Z
assigned_bolt: 001-orgatex-integration
implemented: true
---

# Story: 002-dummy-orgatex-serves-batch-queue

**Title**: Dummy OrgaTEX serves batch queue and batch detail

## User Story

**As a** WeighingMS station
**I want** to read the released batch queue and batch details from (Dummy) OrgaTEX
**So that** the operator works from OrgaTEX's queue, not a separate list (BR-01)

## Requirements

- **Unit**: `001-orgatex-integration`
- **Requirements**: DB-1, brief FR-01, IR-01

## Acceptance Criteria

- [ ] **Given** the seed, **When** `GET /api/batches` is called, **Then** 4 batches are returned with batchId, orderRef, machineRef, fabricDesc, fabricWeightKg, shadeCode, componentCount, status (B-24187 RELEASED, others QUEUED)
- [ ] **Given** the seed, **When** `GET /api/batches/B-24187` is called, **Then** the batch detail is returned (SO-9931, JET-04, Teal 4C, 100% CTN knit, 480 kg, 5 components)
- [ ] **Given** an unknown id, **When** `GET /api/batches/B-00000` is called, **Then** `404` with `{ error: { code: 'BATCH_NOT_FOUND' } }`

## UI/UX Impact

Feeds Screen 1 queue (via 003).

## API Dependencies

- `GET /api/batches`
- `GET /api/batches/:batchId`

## Test Expectations

- API: list returns 4 seeded batches with exact values
- API: detail and 404
- Evidence: `curl` outputs for workbook Step 18

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 001-project-scaffold-and-training-seed

### Enables
- 003-batch-management/001-station-batch-queue
- 003-dummy-orgatex-serves-recipe

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Batch id case differs (b-24187) | Treated as not found (ids are exact) |

## Out of Scope

- Filtering by station/status query params (brief illustrative API) — not required
