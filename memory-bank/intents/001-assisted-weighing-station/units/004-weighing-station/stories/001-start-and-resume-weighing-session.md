---
id: 001-start-and-resume-weighing-session
unit: 004-weighing-station
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00.000Z
assigned_bolt: 006-weighing-station
implemented: true
---

# Story: 001-start-and-resume-weighing-session

**Title**: Start and resume a weighing session

## User Story

**As a** operator
**I want** selecting a released batch to open a weighing session under my name, and to resume it after a reload
**So that** my work is attributed to me and never lost (FR-2, FR-27, NFR-6, NFR-7)

## Requirements

- **Unit**: `004-weighing-station`
- **Requirements**: FR-2 (session), FR-27, NFR-6, NFR-7, TD-2, TD-6

## Acceptance Criteria

- [ ] **Given** B-24187 selected and no open session, **When** a session is started, **Then** a session is persisted with batchId, stationId STN-01, operator R. Karim, startedAt, recipe snapshot, all 5 components pending and the first activated
- [ ] **Given** an open session for B-24187, **When** start is called again or the browser reloads, **Then** the same session is returned with its confirmed components and active component
- [ ] **Given** the server restarts, **When** the session is fetched, **Then** all acknowledged confirmations are present

## UI/UX Impact

Screen 2 opens with `0 of 5 components weighed`, Blue RSPL active; reload returns to the same state.

## API Dependencies

- WeighingMS: `POST /api/sessions` (start/resume), `GET /api/sessions/:id`
- 003 recipe service

## Test Expectations

- API: start, resume idempotent, persistence across restart

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 003-batch-management/002-select-released-batch-and-load-recipe

### Enables
- 003-activate-component-with-scale-selection-and-tare

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Second batch selected while a session is open | Rejected: "Finish or abandon B-24187 first" (one open session per station, AS-6) |

## Out of Scope

- Multi-station sessions
