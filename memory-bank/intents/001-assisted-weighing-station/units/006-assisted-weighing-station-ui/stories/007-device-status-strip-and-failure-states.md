---
id: 007-device-status-strip-and-failure-states
unit: 006-assisted-weighing-station-ui
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00Z
assigned_bolt: 012-assisted-weighing-station-ui
implemented: true
---

# Story: 007-device-status-strip-and-failure-states

**Title**: Status strip and failure states

## User Story

**As a** operator
**I want** to always see the state of scales, scanner, printer and OrgaTEX, and get a safe screen when one fails
**So that** I understand why I cannot proceed and what to do (FR-28, FR-29, FR-30, FR-32)

## Requirements

- **Unit**: `006-assisted-weighing-station-ui`
- **Requirements**: FR-28, FR-29, FR-30, FR-32, UQ-1

## Acceptance Criteria

- [ ] **Given** all online, **Then** the strip shows `SCALE 3 kg · READY`, `SCALE 32 kg · READY`, `SCANNER`, `PRINTER`, `ORGATEX · LINKED HH:MM` with green dots, `EN`, and a live clock
- [ ] **Given** any device or OrgaTEX taken offline, **Then** its dot turns red within 2 s, and back on recovery
- [ ] **Given** the selected scale offline, **Then** Weighed now shows `SCALE OFFLINE`, status line explains, OK disabled
- [ ] **Given** an invalid reading, **Then** `INVALID READING`, OK disabled
- [ ] **Given** scanner offline, **Then** touch selection still works

## UI/UX Impact

Reproduces prototype strip (L618–L627) with live data.

## API Dependencies

- Status endpoints of 001, 002, 005

## Test Expectations

- Component: indicator states
- E2E: STEP-30 scenarios

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 001-station-shell-and-api-client
- 004-weighing-station/006-reading-safety-unstable-offline-invalid

### Enables
- 010-end-to-end-and-failure-test-suites

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| — | — |

## Out of Scope

- None
