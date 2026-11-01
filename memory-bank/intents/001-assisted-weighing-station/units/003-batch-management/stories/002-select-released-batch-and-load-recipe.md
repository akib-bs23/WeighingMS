---
id: 002-select-released-batch-and-load-recipe
unit: 003-batch-management
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00.000Z
assigned_bolt: 004-batch-management
implemented: true
---

# Story: 002-select-released-batch-and-load-recipe

**Title**: Select a released batch and load its recipe

## User Story

**As a** operator
**I want** to select a batch by touch or scan and get its recipe, being refused for batches OrgaTEX has not released
**So that** I only weigh released work, quickly (FR-2, FR-3, FR-5)

## Requirements

- **Unit**: `003-batch-management`
- **Requirements**: FR-2, FR-3, FR-5, NFR-2, TD-1

## Acceptance Criteria

- [ ] **Given** B-24187 (RELEASED), **When** selected by touch or scanned, **Then** the station reads `GET /api/batches/B-24187` then `GET /api/batches/B-24187/recipe` and returns batch + recipe (5 components in sequence) in < 3 s
- [ ] **Given** B-24188 (QUEUED), **When** selected, **Then** `409 BATCH_NOT_RELEASED` with message "Batch B-24188 not released by OrgaTEX (status QUEUED)"
- [ ] **Given** unknown code `B-99999`, **When** scanned, **Then** `404 BATCH_NOT_FOUND` "Batch B-99999 not found"
- [ ] **Given** a recipe, **When** returned, **Then** it is read-only (no write path in WeighingMS)

## UI/UX Impact

Screen 1 → Screen 2 transition; rejection messages on Screen 1.

## API Dependencies

- `OrgatexPort.getBatch`, `getRecipe`
- Dummy `GET /api/batches/:batchId`, `GET /api/batches/:batchId/recipe`
- Shared `checkEligibility` / `classifyScan`; server `POST /api/station/batch-selection` (`BatchSelectionService`, enforces eligibility via `OrgatexPort`; reused by session start) — Option A, approved at bolt 004 plan

## Test Expectations

- API: success, 409, 404
- Network order check in E2E (workbook Step 19 evidence)

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 001-station-batch-queue
- 001-orgatex-integration/003-dummy-orgatex-serves-recipe
- 002-device-integration/005-dummy-scanner-delivers-scans

### Enables
- 004-weighing-station/001-start-and-resume-weighing-session

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Batch WEIGHING with this station's open session | Allowed — resumes (handled in 004-001) |

## Out of Scope

- Session creation (004)
