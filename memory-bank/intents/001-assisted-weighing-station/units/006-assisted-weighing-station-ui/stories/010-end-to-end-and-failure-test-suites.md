---
id: 010-end-to-end-and-failure-test-suites
unit: 006-assisted-weighing-station-ui
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00Z
assigned_bolt: 012-assisted-weighing-station-ui
implemented: true
---

# Story: 010-end-to-end-and-failure-test-suites

**Title**: End-to-end and failure Playwright suites

## User Story

**As a** trainer / reviewer
**I want** automated Playwright runs of the full B-24187 scenario and the failure scenarios
**So that** the product's behaviour is proven automatically (NFR-13, workbook Steps 29–30)

## Requirements

- **Unit**: `006-assisted-weighing-station-ui`
- **Requirements**: NFR-13, workbook Steps 28–30

## Acceptance Criteria

- [ ] **Given** a reset scenario, **When** the E2E suite runs, **Then** it selects B-24187, weighs all 5 components in order, confirms each, completes, verifies OrgaTEX write-back CONFIRMED and the stored consumption, prints the ticket — all green
- [ ] **Given** the failure suite, **When** run, **Then** scale unavailable, OrgaTEX unavailable, printer unavailable, invalid weight, over tolerance, under tolerance, Re-tare, Quit and incomplete batch each pass with the defined behaviour
- [ ] **Given** the run, **Then** an HTML report and video are produced (STEP-29 evidence)

## UI/UX Impact

Validates all screens against the prototype behaviour.

## API Dependencies

- All Dummy simulator endpoints; all WeighingMS endpoints

## Test Expectations

- Playwright: e2e + failure specs; report + video

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 006-confirm-and-print-screen
- 007-device-status-strip-and-failure-states
- 009-trainer-simulator-panel

### Enables
- None

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| — | — |

## Out of Scope

- Load/performance testing
