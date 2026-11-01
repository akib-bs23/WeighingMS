---
id: 005-weigh-actions
unit: 006-assisted-weighing-station-ui
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00Z
assigned_bolt: 011-assisted-weighing-station-ui
implemented: true
---

# Story: 005-weigh-actions

**Title**: Screen 2 · OK, Re-tare, Quit, Supervisor override and overshoot panel

## User Story

**As a** operator
**I want** action keys that are only enabled when valid, an override dialog for the supervisor, and a clear overshoot panel
**So that** I confirm good weighings and recover from bad ones safely (FR-17, FR-11, FR-20, FR-19, FR-21, FR-7)

## Requirements

- **Unit**: `006-assisted-weighing-station-ui`
- **Requirements**: FR-7, FR-11, FR-17, FR-19, FR-20, FR-21, NFR-3

## Acceptance Criteria

- [ ] **Given** zone ok, stable, scale online, no identity mismatch, **Then** `OK · Confirm F1` is enabled; otherwise disabled
- [ ] **Given** OK pressed, **Then** the component shows `✓ {actual}` and the next pending becomes active
- [ ] **Given** Re-tare / Quit, **Then** readout returns to 0 and nothing is recorded (Quit audited)
- [ ] **Given** Supervisor override, **Then** a dialog asks PIN + reason (both required); wrong PIN shows "Supervisor authentication failed"
- [ ] **Given** zone over, **Then** the surplus panel shows the Step 24-approved content and OK stays disabled
- [ ] **Given** keys, **Then** each is ≥ 62 px high and ≥ 150 px wide

## UI/UX Impact

Reproduces prototype actions and surplus panel (L544–L561) with real behaviour.

## API Dependencies

- 004 confirm, retare, quit, override, identity

## Test Expectations

- Component: enablement matrix
- E2E: confirm, override, quit; STEP-24/25 evidence

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 004-live-weight-readouts-and-progress-bar
- 004-weighing-station/005-confirm-in-tolerance-weighing
- 004-weighing-station/008-supervisor-override
- 004-weighing-station/009-quit-abandon-component
- 004-weighing-station/010-overshoot-detection-and-handling

### Enables
- 006-confirm-and-print-screen

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Double-tap OK | One confirmation (button disabled while pending) |

## Out of Scope

- None
