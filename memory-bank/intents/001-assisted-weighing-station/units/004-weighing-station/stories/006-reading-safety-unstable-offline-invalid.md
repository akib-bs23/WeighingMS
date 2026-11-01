---
id: 006-reading-safety-unstable-offline-invalid
unit: 004-weighing-station
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00Z
assigned_bolt: 008-weighing-station
implemented: true
---

# Story: 006-reading-safety-unstable-offline-invalid

**Title**: Reading safety: offline and invalid readings

## User Story

**As a** operator
**I want** the station to refuse confirmation when the scale is offline or the reading is invalid
**So that** a bad reading can never be recorded (FR-29, FR-30)

## Requirements

- **Unit**: `004-weighing-station`
- **Requirements**: FR-29, FR-30, brief IR-13

## Acceptance Criteria

- [ ] **Given** the selected scale offline, **When** confirm is attempted, **Then** `503 SCALE_UNAVAILABLE` and nothing recorded
- [ ] **Given** a reading of −5 g, NaN, or 3 500 g on scale-3kg, **When** evaluated, **Then** it is invalid (`INVALID READING`), and confirm returns `422 INVALID_READING`
- [ ] **Given** the shared rule, **When** used by the UI, **Then** the same invalid classification disables OK

## UI/UX Impact

Screen 2 `SCALE OFFLINE` / `INVALID READING` states (rendered in 006-007).

## API Dependencies

- `ScalePort.readWeight`; shared `isValidReading`

## Test Expectations

- Unit: invalid classification
- API: offline 503, invalid 422
- E2E (Step 30): scale unavailable, invalid weight

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 005-confirm-in-tolerance-weighing
- 002-device-integration/004-scale-offline-simulation

### Enables
- 006-assisted-weighing-station-ui/007-device-status-strip-and-failure-states

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Scale goes offline mid-ramp | Confirmation impossible until online and stable again |

## Out of Scope

- None
