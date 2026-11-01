---
id: 003-orgatex-unavailable-on-load
unit: 003-batch-management
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00.000Z
assigned_bolt: 004-batch-management
implemented: true
---

# Story: 003-orgatex-unavailable-on-load

**Title**: OrgaTEX unavailable when loading work

## User Story

**As a** operator
**I want** a clear message and Retry when the queue or recipe cannot be loaded
**So that** I am never shown stale or invented data (FR-31)

## Requirements

- **Unit**: `003-batch-management`
- **Requirements**: FR-31

## Acceptance Criteria

- [ ] **Given** OrgaTEX offline, **When** the queue is requested, **Then** `503 ORGATEX_UNAVAILABLE` is returned (no cached rows)
- [ ] **Given** OrgaTEX offline, **When** selecting a batch, **Then** `503 ORGATEX_UNAVAILABLE`
- [ ] **Given** OrgaTEX back online, **When** Retry, **Then** the queue loads normally

## UI/UX Impact

Screen 1 error state "OrgaTEX unavailable — Retry".

## API Dependencies

- Dummy OrgaTEX availability (001-006)

## Test Expectations

- API: 503 mapping for queue and select

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 001-station-batch-queue
- 001-orgatex-integration/006-orgatex-availability-toggle

### Enables
- 006-assisted-weighing-station-ui/002-batch-selection-screen

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| OrgaTEX goes offline after recipe loaded | Weighing continues (004); only completion write-back affected |

## Out of Scope

- Offline caching of master data (deferred)
