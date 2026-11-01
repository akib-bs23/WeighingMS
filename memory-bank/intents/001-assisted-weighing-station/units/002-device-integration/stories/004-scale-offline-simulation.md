---
id: 004-scale-offline-simulation
unit: 002-device-integration
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00.000Z
assigned_bolt: 002-device-integration
implemented: true
---

# Story: 004-scale-offline-simulation

**Title**: Scale offline simulation

## User Story

**As a** trainer
**I want** to take a Dummy scale offline and bring it back
**So that** I can demonstrate the scale-unavailable safe failure (workbook Step 30)

## Requirements

- **Unit**: `002-device-integration`
- **Requirements**: DB-4, DB-7, brief IR-13

## Acceptance Criteria

- [ ] **Given** scale-3kg set offline, **When** weight/status/tare are called, **Then** `503 SCALE_UNAVAILABLE` and status reports offline
- [ ] **Given** the scale set back online, **When** read, **Then** readings resume from the last state

## UI/UX Impact

Status strip `SCALE 3 kg · OFFLINE` (red); weigh screen `SCALE OFFLINE`.

## API Dependencies

- Simulator: scale online/offline (training prefix)

## Test Expectations

- API: offline 503 for all scale endpoints; recovery

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 003-scale-simulator-drives-weight

### Enables
- 004-weighing-station/006-reading-safety-unstable-offline-invalid
- 006-assisted-weighing-station-ui/007-device-status-strip-and-failure-states

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Offline the non-selected scale | Only that scale's indicator changes; weighing on the other continues |

## Out of Scope

- None
