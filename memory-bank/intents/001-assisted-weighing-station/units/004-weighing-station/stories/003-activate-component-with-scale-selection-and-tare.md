---
id: 003-activate-component-with-scale-selection-and-tare
unit: 004-weighing-station
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00.000Z
assigned_bolt: 006-weighing-station
implemented: true
---

# Story: 003-activate-component-with-scale-selection-and-tare

**Title**: Activate a component with automatic scale selection and tare

## User Story

**As a** operator
**I want** the active component to show its identity, lot, container and tare, with the right scale chosen and tared automatically
**So that** I weigh the right thing on the right scale from zero (FR-6, FR-8, FR-9, FR-10, FR-12)

## Requirements

- **Unit**: `004-weighing-station`
- **Requirements**: FR-6, FR-8, FR-9, FR-10, FR-12, TD-3, TD-4, TD-5

## Acceptance Criteria

- [ ] **Given** Yellow RGB activated, **When** the component view is returned, **Then** it shows `Remazol Yellow RGB`, `DYE-4471 · LOT 2026-0387 · CONTAINER C-12 · TARE 214.0 g`, scale `3 kg precision`, unit g
- [ ] **Given** Sodium Sulphate activated, **When** returned, **Then** scale `32 kg floor`, unit kg, `TARE 1.850 kg`
- [ ] **Given** target ≤ 3 000 g → precision; 3 000 g exactly → precision; 3 001 g → floor (unit test)
- [ ] **Given** activation, **When** it completes, **Then** a tare command was sent to the selected scale via `ScalePort`
- [ ] **Given** a pending component touched, **When** activated, **Then** the previous active component returns to pending without a record

## UI/UX Impact

Component header, scale badge, units switch g ↔ kg (workbook Step 21).

## API Dependencies

- WeighingMS: `POST /api/sessions/:id/components/:componentId/activate`
- `ScalePort.tare` → Dummy `POST /api/scales/:scaleId/tare`

## Test Expectations

- Unit: scale selection threshold
- API: activation returns correct view + tare called
- E2E: Yellow → Sodium Sulphate switch

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 001-start-and-resume-weighing-session
- 002-device-integration/002-scale-tare-command

### Enables
- 004-retare
- 005-confirm-in-tolerance-weighing

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Activate a done component | 409 COMPONENT_DONE |

## Out of Scope

- Manual scale reselection (brief FR-08, deferred)
