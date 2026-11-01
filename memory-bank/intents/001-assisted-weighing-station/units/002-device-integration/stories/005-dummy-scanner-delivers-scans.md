---
id: 005-dummy-scanner-delivers-scans
unit: 002-device-integration
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00.000Z
assigned_bolt: 002-device-integration
implemented: true
---

# Story: 005-dummy-scanner-delivers-scans

**Title**: Dummy scanner delivers scans

## User Story

**As a** operator
**I want** scans of batch cards and dyestuff barcodes to reach the station, and touch to keep working if the scanner is down
**So that** I can start a batch or verify a dyestuff by scanning (BR-02, BR-10)

## Requirements

- **Unit**: `002-device-integration`
- **Requirements**: DB-5, FR-32 (scanner part), brief IR-15

## Acceptance Criteria

- [ ] **Given** the trainer injects code `B-24187`, **When** the station reads the scan feed, **Then** it receives one event `{ seq, code: 'B-24187', scannedAt }`
- [ ] **Given** events already consumed, **When** the feed is read with `since=seq`, **Then** only newer events are returned
- [ ] **Given** the scanner set offline, **When** a scan is injected or the feed is read, **Then** `503 SCANNER_UNAVAILABLE` and status reports offline; touch actions are unaffected

## UI/UX Impact

Scan prompt on Screen 1; identity feedback on Screen 2; `SCANNER` indicator.

## API Dependencies

- Simulator: inject scan, scanner online/offline (training prefix)
- Scan feed (e.g. `GET /api/scanner/events?since=`)
- Scanner status

## Test Expectations

- API: inject → feed; since filter; offline 503

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 001-orgatex-integration/001-project-scaffold-and-training-seed

### Enables
- 003-batch-management/002-select-released-batch-and-load-recipe
- 004-weighing-station/007-dyestuff-identity-verification

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty or whitespace code | 400; no event |

## Out of Scope

- Physical keyboard-wedge handling (UI, 006-002)
