---
id: 009-trainer-simulator-panel
unit: 006-assisted-weighing-station-ui
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00Z
assigned_bolt: 007-assisted-weighing-station-ui
implemented: true
---

# Story: 009-trainer-simulator-panel

**Title**: Trainer simulator panel

## User Story

**As a** trainer
**I want** a panel separate from the station screen to drive the Dummy devices and OrgaTEX
**So that** I can run every demo and failure scenario without editing code or data (FR-34)

## Requirements

- **Unit**: `006-assisted-weighing-station-ui`
- **Requirements**: FR-34, DB-4, DB-5, DB-7, DB-8

## Acceptance Criteria

- [ ] **Given** the panel, **Then** it offers: Simulate dispense (in-tolerance ramp), Simulate overshoot, Set weight, scale 3 kg / 32 kg online/offline, scanner/printer/OrgaTEX online/offline, Inject scan (code input), Reset scenario
- [ ] **Given** any panel action, **Then** it calls only Dummy simulator endpoints (never WeighingMS state directly)
- [ ] **Given** Simulate dispense on Yellow RGB, **Then** the station shows a pour easing into the band and OK enables

## UI/UX Impact

Replaces the prototype demo controls (L422–L434); visually distinct (training styling).

## API Dependencies

- Simulator endpoints of 001, 002, 005

## Test Expectations

- E2E helpers use the same endpoints
- Manual demo (Step 35)

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 002-device-integration/003-scale-simulator-drives-weight
- 001-orgatex-integration/006-orgatex-availability-toggle

### Enables
- 010-end-to-end-and-failure-test-suites

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| — | — |

## Out of Scope

- Exposing the panel on the station terminal in production
