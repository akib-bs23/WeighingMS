---
id: 010-overshoot-detection-and-handling
unit: 004-weighing-station
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00Z
assigned_bolt: 009-weighing-station
implemented: true
---

# Story: 010-overshoot-detection-and-handling

**Title**: Overshoot detection and handling

## User Story

**As a** operator
**I want** to be told clearly when I have overshot and to have a defined recovery
**So that** an over-dose never slips through and is handled the same way every time (FR-21, BR-08)

## Requirements

- **Unit**: `004-weighing-station`
- **Requirements**: FR-21, OQ-07, OQ-16

## Acceptance Criteria

- [ ] **Given** Yellow RGB at 96.4 g, **When** evaluated, **Then** zone over, status `OVER TOLERANCE — SURPLUS +…`, surplus panel data returned, confirm `422 OUT_OF_TOLERANCE`
- [ ] **Given** over, **When** Quit and re-weigh, **Then** the component can be weighed again from zero
- [ ] **Given** the human decision recorded at workbook Step 24, **When** this story is constructed, **Then** surplus definition and handling follow that decision exactly (acceptance criteria amended at Step 24)

## UI/UX Impact

Red zone, surplus panel on Screen 2.

## API Dependencies

- Shared zone rule; WeighingMS overshoot policy (pluggable)

## Test Expectations

- Unit/API per Step 24 decision
- Evidence: STEP-24 decision, test, UI

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 005-confirm-in-tolerance-weighing
- 008-supervisor-override
- 009-quit-abandon-component

### Enables
- 006-assisted-weighing-station-ui/005-weigh-actions

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Overshoot on last component | Same handling; completion blocked until resolved |

## Out of Scope

- Automatic recipe recalculation unless approved at Step 24
