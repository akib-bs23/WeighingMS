---
id: 001-station-batch-queue
unit: 003-batch-management
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00.000Z
assigned_bolt: 004-batch-management
implemented: true
---

# Story: 001-station-batch-queue

**Title**: Station batch queue

## User Story

**As a** operator
**I want** to see the batch queue received from OrgaTEX with when it was received
**So that** I know what to weigh next (FR-1)

## Requirements

- **Unit**: `003-batch-management`
- **Requirements**: FR-1

## Acceptance Criteria

- [ ] **Given** OrgaTEX online, **When** the WeighingMS queue API is called, **Then** the station obtains the 4 seed batches (Batch, Order, Machine, Fabric description · weight, Shade, Comp., Status) and `receivedAt`
- [ ] **Given** the UI source, **When** inspected, **Then** no batch data is embedded (workbook Rule 5)

## UI/UX Impact

Screen 1 queue table and "Queue received from OrgaTEX at HH:MM".

## API Dependencies

- Station UI reads `GET /api/batches` through the single client OrgaTEX module (bolt 005); no separate WeighingMS queue endpoint (Option A, approved at bolt 004 plan); UI records `receivedAt`

## Test Expectations

- API: queue values + receivedAt
- Static check: no batch ids in `src/client`

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 001-orgatex-integration/002-dummy-orgatex-serves-batch-queue

### Enables
- 002-select-released-batch-and-load-recipe
- 006-assisted-weighing-station-ui/002-batch-selection-screen

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty queue | Empty-state message "No batches released for this station" |

## Out of Scope

- Sorting/filtering UI
