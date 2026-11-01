---
id: 011-component-progression
unit: 004-weighing-station
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00.000Z
assigned_bolt: 006-weighing-station
implemented: true
---

# Story: 011-component-progression

**Title**: Component progression

## User Story

**As a** operator
**I want** the next pending component to become active automatically after a confirmation, and to pick another pending one if I need to
**So that** I move through the recipe in order without mistakes (FR-22)

## Requirements

- **Unit**: `004-weighing-station`
- **Requirements**: FR-22

## Acceptance Criteria

- [ ] **Given** Blue RSPL confirmed, **When** progression runs, **Then** Red RB becomes active and the count shows `1 of 5`
- [ ] **Given** confirmations in order, **When** each completes, **Then** the sequence is Blue RSPL → Red RB → Yellow RGB → Sodium Sulphate → Soda Ash
- [ ] **Given** a done component, **When** activation is attempted, **Then** `409 COMPONENT_DONE`
- [ ] **Given** no component, **When** marked done, **Then** it always has a valid IN_TOLERANCE or OVERRIDDEN record

## UI/UX Impact

Recipe rail states done / active (`WEIGHING`) / pending.

## API Dependencies

- WeighingMS session endpoints

## Test Expectations

- API: progression order
- E2E: five-component run (workbook Step 23)

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 005-confirm-in-tolerance-weighing

### Enables
- 012-complete-batch

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Operator skipped ahead to component 4 | After confirming it, next active is the first pending by sequence (prototype R12) |

## Out of Scope

- None
