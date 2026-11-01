---
id: 004-live-weight-readouts-and-progress-bar
unit: 006-assisted-weighing-station-ui
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00Z
assigned_bolt: 007-assisted-weighing-station-ui
implemented: true
---

# Story: 004-live-weight-readouts-and-progress-bar

**Title**: Screen 2 · Live weight, readouts, progress bar and status line

## User Story

**As a** operator
**I want** to see live weight, still-to-weigh and target with a progress bar showing the tolerance band and a clear status line
**So that** I can pour accurately into tolerance (FR-13, FR-14, FR-15, FR-16)

## Requirements

- **Unit**: `006-assisted-weighing-station-ui`
- **Requirements**: FR-13, FR-14, FR-15, FR-16, NFR-1, NFR-4, NFR-5, TD-10

## Acceptance Criteria

- [ ] **Given** the selected scale, **Then** the UI polls `GET /api/scales/:scaleId/weight` every 100 ms and the trainer's change appears within 200 ms
- [ ] **Given** Yellow RGB, **Then** readouts show Weighed now (≥ 52 px), Still to weigh, Target `94.0 g`; caption `TOLERANCE ±0.5 g (93.5 – 94.5)` and `125.0 g`
- [ ] **Given** readings 93.4 / 93.5 / 94.5 / 94.6 g, **Then** zone colours and status line match the shared rules (STEP-22 UI evidence)
- [ ] **Given** the bar, **Then** it has role=progressbar with aria values; reduced-motion disables fill animation

## UI/UX Impact

Reproduces prototype readout, bar and status (L515–L541).

## API Dependencies

- 002 weight endpoint
- src/shared rules

## Test Expectations

- Component: zone rendering for boundary values
- E2E: latency check ≤ 200 ms

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 003-weigh-screen-recipe-rail-and-component-header
- 004-weighing-station/002-shared-quantity-and-tolerance-rules
- 002-device-integration/001-dummy-scales-report-weight-and-status

### Enables
- 005-weigh-actions

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Poll response arrives out of order | Older readings ignored (by readAt) |

## Out of Scope

- Streaming (SSE/WebSocket)
