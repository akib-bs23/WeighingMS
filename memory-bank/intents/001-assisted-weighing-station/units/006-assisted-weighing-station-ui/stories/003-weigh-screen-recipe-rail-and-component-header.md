---
id: 003-weigh-screen-recipe-rail-and-component-header
unit: 006-assisted-weighing-station-ui
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00Z
assigned_bolt: 007-assisted-weighing-station-ui
implemented: true
---

# Story: 003-weigh-screen-recipe-rail-and-component-header

**Title**: Screen 2 · Recipe rail, component header and scale badge

## User Story

**As a** operator
**I want** to see the recipe with each component's state and the active component's identity, lot, container, tare and scale
**So that** I know what to weigh, where, and how far I am (FR-5, FR-6, FR-12, FR-22)

## Requirements

- **Unit**: `006-assisted-weighing-station-ui`
- **Requirements**: FR-5, FR-6, FR-8, FR-9, FR-10, FR-12, FR-22, FR-7 (indicator)

## Acceptance Criteria

- [ ] **Given** B-24187 open, **Then** the rail shows `Recipe · Teal 4C`, `B-24187`, `0 of 5 components weighed` and 5 rows (swatch, name, code · scale, target, state)
- [ ] **Given** Yellow RGB active, **Then** the header shows name and `DYE-4471 · LOT 2026-0387 · CONTAINER C-12 · TARE 214.0 g`, and the badge `SCALE SELECTED / 3 kg precision / automatic`
- [ ] **Given** I touch Sodium Sulphate, **Then** badge `32 kg floor` and all units kg (workbook Step 21)
- [ ] **Given** a done row, **When** touched, **Then** nothing happens

## UI/UX Impact

Reproduces prototype rail and weigh header (L493–L513).

## API Dependencies

- 004 session + activate

## Test Expectations

- Component: rail states, header text, badge
- E2E: scale switch screenshot (STEP-21)

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 002-batch-selection-screen
- 004-weighing-station/003-activate-component-with-scale-selection-and-tare

### Enables
- 004-live-weight-readouts-and-progress-bar

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| — | — |

## Out of Scope

- None
