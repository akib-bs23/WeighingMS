---
id: 005-confirm-in-tolerance-weighing
unit: 004-weighing-station
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00.000Z
assigned_bolt: 006-weighing-station
implemented: true
---

# Story: 005-confirm-in-tolerance-weighing

**Title**: Confirm an in-tolerance weighing

## User Story

**As a** operator
**I want** to confirm a weighing only when it is in tolerance and stable, and have it recorded with full traceability
**So that** only valid, traceable weighings reach production (FR-17, FR-18)

## Requirements

- **Unit**: `004-weighing-station`
- **Requirements**: FR-17, FR-18, NFR-7, NFR-9

## Acceptance Criteria

- [ ] **Given** Yellow RGB at 94.2 g stable, **When** OK, **Then** a record is stored with actual 94 200 mg, operator, component, lot 2026-0387, container C-12, tare 214 g, scale-3kg, target/min/max snapshot, uom g, result IN_TOLERANCE, confirmedAt
- [ ] **Given** 93.4 g or 94.6 g, **When** confirm is attempted via API, **Then** `422 OUT_OF_TOLERANCE` and nothing recorded
- [ ] **Given** an unstable reading, **When** confirm is attempted, **Then** `422 READING_UNSTABLE`
- [ ] **Given** the server, **When** confirming, **Then** it reads the weight itself via `ScalePort` (does not trust a client-sent value) and re-evaluates the zone
- [ ] **Given** a stored record, **When** an update/delete is attempted, **Then** no such API exists (immutability)

## UI/UX Impact

OK · Confirm (F1) enabled only in ok zone; component turns done `✓ 94.2`.

## API Dependencies

- WeighingMS: `POST /api/sessions/:id/confirm`
- `ScalePort.readWeight`

## Test Expectations

- API: 93.5/94.0/94.5 accepted; 93.4/94.6 → 422; unstable 422
- Evidence: transaction JSON (workbook Step 25)

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 002-shared-quantity-and-tolerance-rules
- 003-activate-component-with-scale-selection-and-tare

### Enables
- 011-component-progression
- 008-supervisor-override

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Weight changes between screen and server read | Server value used; if now out of tolerance → 422 and UI refreshes |

## Out of Scope

- Overshoot handling (010)
