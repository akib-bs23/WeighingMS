---
id: 002-batch-selection-screen
unit: 006-assisted-weighing-station-ui
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00.000Z
assigned_bolt: 005-assisted-weighing-station-ui
implemented: true
---

# Story: 002-batch-selection-screen

**Title**: Screen 1 · Select batch

## User Story

**As a** operator
**I want** to see the queue and start a batch by touching a row or scanning its card
**So that** I begin weighing quickly and only on released batches (FR-1, FR-2, FR-3, FR-31)

## Requirements

- **Unit**: `006-assisted-weighing-station-ui`
- **Requirements**: FR-1, FR-2, FR-3, FR-31, FR-32 (scanner fallback)

## Acceptance Criteria

- [ ] **Given** the queue, **When** Screen 1 loads, **Then** the scan prompt and table show the 4 batches from `GET /api/batches` (via WeighingMS) with status tags, and "Queue received from OrgaTEX at HH:MM"
- [ ] **Given** I touch B-24187 or scan its card (Dummy scanner or keyboard-wedge + Enter), **Then** Screen 2 opens; network shows `/api/batches/B-24187` then `/recipe` (workbook Step 19)
- [ ] **Given** I touch B-24188, **Then** the message "Batch B-24188 not released by OrgaTEX (status QUEUED)" shows and I stay on Screen 1
- [ ] **Given** OrgaTEX offline, **Then** "OrgaTEX unavailable — Retry" and no rows
- [ ] **Given** an open session, **Then** that batch row shows the `WEIGHING` tag

## UI/UX Impact

Reproduces prototype view 1 (L448–L487).

## API Dependencies

- 003 queue + select
- 002 scan feed

## Test Expectations

- Component: rows, rejection, error
- E2E: select B-24187; reject B-24188
- Evidence: STEP-19 screenshots/network

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 001-station-shell-and-api-client
- 003-batch-management/002-select-released-batch-and-load-recipe

### Enables
- 003-weigh-screen-recipe-rail-and-component-header

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Rows touched rapidly twice | Single selection request |

## Out of Scope

- None
