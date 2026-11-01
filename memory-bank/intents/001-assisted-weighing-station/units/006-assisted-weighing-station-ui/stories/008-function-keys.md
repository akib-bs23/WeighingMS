---
id: 008-function-keys
unit: 006-assisted-weighing-station-ui
intent: 001-assisted-weighing-station
status: complete
priority: should
created: 2026-10-29T09:40:00Z
assigned_bolt: 011-assisted-weighing-station-ui
implemented: true
---

# Story: 008-function-keys

**Title**: Function keys F1–F4

## User Story

**As a** operator
**I want** physical keys F1 OK/Print, F2 Re-tare, F3 Next batch, F4 Quit
**So that** I can work without touching the screen with dirty gloves (FR-33)

## Requirements

- **Unit**: `006-assisted-weighing-station-ui`
- **Requirements**: FR-33

## Acceptance Criteria

- [ ] **Given** OK enabled on Screen 2, **When** F1, **Then** confirm; **When** OK disabled, **Then** F1 does nothing
- [ ] **Given** Screen 2, **When** F2 / F4, **Then** Re-tare / Quit
- [ ] **Given** Screen 3, **When** F1 / F3, **Then** Print ticket / Next batch
- [ ] **Given** a dialog open (override), **Then** F-keys do not trigger station actions

## UI/UX Impact

Key hints `F1`…`F4` on buttons as prototype.

## API Dependencies

- Same as the buttons

## Test Expectations

- Component/E2E: key handling

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 005-weigh-actions
- 006-confirm-and-print-screen

### Enables
- None

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Keyboard-wedge scan text contains F-key codes | Not possible — wedge sends characters + Enter only |

## Out of Scope

- None
