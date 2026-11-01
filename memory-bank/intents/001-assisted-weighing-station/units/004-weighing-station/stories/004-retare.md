---
id: 004-retare
unit: 004-weighing-station
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00.000Z
assigned_bolt: 006-weighing-station
implemented: true
---

# Story: 004-retare

**Title**: Re-tare the scale

## User Story

**As a** operator
**I want** to re-tare the selected scale
**So that** I can restart the reading from zero without recording anything (FR-11)

## Requirements

- **Unit**: `004-weighing-station`
- **Requirements**: FR-11

## Acceptance Criteria

- [ ] **Given** net 50.0 g on Yellow RGB, **When** Re-tare, **Then** tare is sent, net reads 0.0 g, still-to-weigh = 94.0 g, OK disabled
- [ ] **Given** Re-tare, **When** completed, **Then** no weighing record is created

## UI/UX Impact

Re-tare (F2) key.

## API Dependencies

- WeighingMS: `POST /api/sessions/:id/retare`
- `ScalePort.tare`

## Test Expectations

- API: retare → tare called, no record
- E2E (Step 30): Re-tare → weight reset

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 003-activate-component-with-scale-selection-and-tare

### Enables
- 006-assisted-weighing-station-ui/005-weigh-actions

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Scale offline | 503 SCALE_UNAVAILABLE; message shown |

## Out of Scope

- None
