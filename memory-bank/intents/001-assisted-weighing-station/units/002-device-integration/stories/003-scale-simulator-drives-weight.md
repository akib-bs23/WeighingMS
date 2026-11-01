---
id: 003-scale-simulator-drives-weight
unit: 002-device-integration
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00.000Z
assigned_bolt: 002-device-integration
implemented: true
---

# Story: 003-scale-simulator-drives-weight

**Title**: Scale simulator drives the weight

## User Story

**As a** trainer
**I want** to set an exact weight or simulate a pour (dispense / overshoot) on a Dummy scale, or inject an invalid reading
**So that** I can demonstrate tolerance, confirmation and overshoot without a physical scale

## Requirements

- **Unit**: `002-device-integration`
- **Requirements**: DB-4, UI R14 (eased pour)

## Acceptance Criteria

- [ ] **Given** scale-3kg, **When** simulator sets 93.5 g, **Then** next weight read returns 93 500 mg with `stable: true`
- [ ] **Given** a ramp to 94.2 g, **When** reads are taken during the ramp, **Then** values increase (fast then easing) with `stable: false`, ending at 94 200 mg `stable: true`
- [ ] **Given** a ramp to a value above the active component's upper bound (e.g. 96.4 g for Yellow RGB — computed by the trainer panel preset, bolt 007), **When** run, **Then** the ramp ends at that value (simulator API stays component-agnostic — clarified at bolt 002 plan approval)
- [ ] **Given** invalid injection (−5 g, 3 500 g on scale-3kg, NaN), **When** read, **Then** the raw value is returned flagged so validation can reject it

## UI/UX Impact

Trainer panel buttons (006-009).

## API Dependencies

- Simulator: set weight, ramp/dispense, overshoot, inject invalid (training prefix)

## Test Expectations

- API: set → read; ramp produces unstable then stable; invalid flagged

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 001-dummy-scales-report-weight-and-status

### Enables
- 004-scale-offline-simulation
- 006-assisted-weighing-station-ui/009-trainer-simulator-panel

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Reduced-motion/fast mode | Ramp may complete immediately (`mode: instant`) |

## Out of Scope

- Noise/drift simulation
