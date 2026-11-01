---
id: 006-orgatex-availability-toggle
unit: 001-orgatex-integration
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00.000Z
assigned_bolt: 001-orgatex-integration
implemented: true
---

# Story: 006-orgatex-availability-toggle

**Title**: Toggle Dummy OrgaTEX availability

## User Story

**As a** trainer
**I want** to take Dummy OrgaTEX offline and online
**So that** I can demonstrate OrgaTEX-unavailable behaviour (workbook Step 30)

## Requirements

- **Unit**: `001-orgatex-integration`
- **Requirements**: DB-7

## Acceptance Criteria

- [ ] **Given** OrgaTEX set offline via the simulator, **When** any Dummy OrgaTEX endpoint is called, **Then** `503` with `ORGATEX_UNAVAILABLE`
- [ ] **Given** OrgaTEX set online, **When** endpoints are called, **Then** normal responses resume
- [ ] **Given** a status request, **When** called, **Then** link status and last successful contact time are reported (for the status strip)

## UI/UX Impact

Status strip `ORGATEX · LINKED HH:MM` (green) / `UNAVAILABLE` (red).

## API Dependencies

- Simulator: set OrgaTEX online/offline (training prefix)
- OrgaTEX link status

## Test Expectations

- API: offline → 503 on all four endpoints; online → 200

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 001-project-scaffold-and-training-seed

### Enables
- 005-write-back-consumption-on-completion
- 003-batch-management/003-orgatex-unavailable-on-load

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Toggle while a request is in flight | In-flight request completes; next request sees new state |

## Out of Scope

- Latency/flaky simulation
