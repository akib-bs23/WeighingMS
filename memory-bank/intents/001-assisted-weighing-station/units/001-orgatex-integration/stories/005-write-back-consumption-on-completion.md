---
id: 005-write-back-consumption-on-completion
unit: 001-orgatex-integration
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00.000Z
assigned_bolt: 003-orgatex-integration
implemented: true
---

# Story: 005-write-back-consumption-on-completion

**Title**: Write back consumption on batch completion

## User Story

**As a** operator
**I want** the completed batch's actual consumption to be posted to OrgaTEX automatically, with a retry if OrgaTEX is down
**So that** actual consumption reaches OrgaTEX without re-keying (BR-12, BR-17 spirit)

## Requirements

- **Unit**: `001-orgatex-integration`
- **Requirements**: FR-24, TD-8, NFR-10

## Acceptance Criteria

- [ ] **Given** a completed session, **When** write-back runs, **Then** it posts via `OrgatexPort` with idempotency key = sessionId and sets status `CONFIRMED` with confirmedAt
- [ ] **Given** OrgaTEX is unavailable, **When** write-back runs, **Then** status is `PENDING` with lastError and the batch remains completed locally
- [ ] **Given** status PENDING and OrgaTEX back online, **When** retry is requested, **Then** status becomes `CONFIRMED` and Dummy OrgaTEX holds exactly one record
- [ ] **Given** write-back already CONFIRMED, **When** retry is requested again, **Then** no second record is created

## UI/UX Impact

Screen 3 "Written to OrgaTEX": `CONFIRMED HH:MM:SS` or `PENDING` + Retry button.

## API Dependencies

- `OrgatexPort.postConsumption`
- WeighingMS API: get write-back status, retry write-back (e.g. `POST /api/sessions/:id/write-back/retry`)

## Test Expectations

- Unit: status transitions
- API: offline → PENDING → retry → CONFIRMED
- API: double retry → one record

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 004-dummy-orgatex-receives-consumption
- 006-orgatex-availability-toggle

### Enables
- 004-weighing-station/012-complete-batch
- 006-assisted-weighing-station-ui/006-confirm-and-print-screen

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Timeout after OrgaTEX stored the record (ambiguous failure) | Retry with same key returns original — no duplicate |

## Out of Scope

- Automatic background sync / queue (deferred)
