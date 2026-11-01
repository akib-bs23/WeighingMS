---
id: 001-dummy-scales-report-weight-and-status
unit: 002-device-integration
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00.000Z
assigned_bolt: 002-device-integration
implemented: true
---

# Story: 001-dummy-scales-report-weight-and-status

**Title**: Dummy scales report weight and status

## User Story

**As a** WeighingMS station
**I want** to read net weight, stability and status from the 3 kg precision and 32 kg floor scales
**So that** the operator sees live weight from the correct scale

## Requirements

- **Unit**: `002-device-integration`
- **Requirements**: DB-3, brief IR-10, IR-11

## Acceptance Criteria

- [ ] **Given** the seed, **When** `GET /api/scales` is called, **Then** `scale-3kg` (PRECISION, capacity 3 000 g, resolution 0.1 g) and `scale-32kg` (FLOOR, capacity 32 kg, resolution 1 g / displayed 0.001 kg) are returned
- [ ] **Given** a scale, **When** `GET /api/scales/:scaleId/weight` is called, **Then** `{ scaleId, netMg, stable, status, readAt }` is returned
- [ ] **Given** a scale, **When** `GET /api/scales/:scaleId/status` is called, **Then** online/offline and capacity are returned
- [ ] **Given** an unknown scale id, **When** called, **Then** `404 SCALE_NOT_FOUND`

## UI/UX Impact

Feeds Weighed-now readout, scale badge, status strip.

## API Dependencies

- `GET /api/scales`
- `GET /api/scales/:scaleId/status`
- `GET /api/scales/:scaleId/weight`

## Test Expectations

- API: list, status, weight, 404
- Perf: weight endpoint < 20 ms locally

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 001-orgatex-integration/001-project-scaffold-and-training-seed

### Enables
- 002-scale-tare-command
- 003-scale-simulator-drives-weight

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Weight polled at 10 Hz by several clients | Consistent value; no state change from reads |

## Out of Scope

- Serial/Ethernet protocols (OQ-04)
