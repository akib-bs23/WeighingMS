---
id: 002-shared-quantity-and-tolerance-rules
unit: 004-weighing-station
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00.000Z
assigned_bolt: 006-weighing-station
implemented: true
---

# Story: 002-shared-quantity-and-tolerance-rules

**Title**: Shared quantity, tolerance and zone rules

## User Story

**As a** operator
**I want** the station to judge weight against target and tolerance exactly and consistently on screen and server
**So that** I can trust OK is only offered for a valid weight (FR-15, FR-16, NFR-8)

## Requirements

- **Unit**: `004-weighing-station`
- **Requirements**: FR-15, FR-16, NFR-8, AS-3

## Acceptance Criteria

- [ ] **Given** Yellow RGB 94.0 g ± 0.5 g, **When** evaluated, **Then** 93.4 → near (not ok), 93.5 → ok, 94.0 → ok, 94.5 → ok, 94.6 → over
- [ ] **Given** the same component, **When** evaluated, **Then** 84.6 g (90 %) → near and 84.5 g → under
- [ ] **Given** target 94.0 g, **When** remaining is computed, **Then** net 60.0 → 34.0 g; net 96.0 → 0.0 g
- [ ] **Given** any quantity, **When** computed, **Then** arithmetic uses integer mg only; formatting gives `g` 1 dp and `kg` 3 dp
- [ ] **Given** status text rules, **When** zone changes, **Then** texts are exactly `DISPENSE — {x} {u} REMAINING`, `WITHIN TOLERANCE — PRESS OK TO CONFIRM`, `OVER TOLERANCE — SURPLUS +{x} {u}` (surplus definition finalised at Step 24)

## UI/UX Impact

Drives readout colours, progress bar, caption and status line on Screen 2.

## API Dependencies

- None (pure library in `src/shared`)

## Test Expectations

- Unit: tolerance boundary table (workbook Step 22 evidence)
- Unit: zones, remaining, formatting
- 100 % branch coverage

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 001-orgatex-integration/001-project-scaffold-and-training-seed

### Enables
- 005-confirm-in-tolerance-weighing
- 006-assisted-weighing-station-ui/004-live-weight-readouts-and-progress-bar

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Tolerance 0 | Band is the target only; still inclusive |
| Target 0 | Rejected as invalid recipe component |

## Out of Scope

- Percentage/banded tolerance modes (A-07)
