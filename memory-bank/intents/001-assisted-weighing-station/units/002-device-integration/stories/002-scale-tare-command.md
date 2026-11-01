---
id: 002-scale-tare-command
unit: 002-device-integration
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00.000Z
assigned_bolt: 002-device-integration
implemented: true
---

# Story: 002-scale-tare-command

**Title**: Scale tare command

## User Story

**As a** WeighingMS station
**I want** to tare the selected scale
**So that** the net reading starts from zero with the container on the scale (FR-10, FR-11)

## Requirements

- **Unit**: `002-device-integration`
- **Requirements**: DB-3, brief IR-12

## Acceptance Criteria

- [ ] **Given** scale-3kg reads gross 264.0 g, **When** `POST /api/scales/scale-3kg/tare` is called, **Then** net becomes 0 mg and subsequent reads are relative to the new tare
- [ ] **Given** the scale is offline, **When** tare is requested, **Then** `503 SCALE_UNAVAILABLE`

## UI/UX Impact

Re-tare key and component activation reset the readout to `0.0 g` / `0.000 kg`.

## API Dependencies

- `POST /api/scales/:scaleId/tare`

## Test Expectations

- API: tare zeroes net; offline 503

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 001-dummy-scales-report-weight-and-status

### Enables
- 004-weighing-station/003-activate-component-with-scale-selection-and-tare
- 004-weighing-station/004-retare

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Tare while ramping | Net zeroed; ramp continues from new zero |

## Out of Scope

- Container-master tare persistence (004)
