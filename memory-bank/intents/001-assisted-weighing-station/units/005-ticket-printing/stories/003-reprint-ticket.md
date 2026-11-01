---
id: 003-reprint-ticket
unit: 005-ticket-printing
intent: 001-assisted-weighing-station
status: complete
priority: could
created: 2026-10-29T09:40:00Z
assigned_bolt: 010-ticket-printing
implemented: true
---

# Story: 003-reprint-ticket

**Title**: Reprint a ticket marked REPRINT

## User Story

**As a** operator
**I want** to reprint a ticket that is marked as a reprint
**So that** duplicates are distinguishable (FR-26)

## Requirements

- **Unit**: `005-ticket-printing`
- **Requirements**: FR-26

## Acceptance Criteria

- [ ] **Given** a printed ticket, **When** reprinted, **Then** the new job carries `REPRINT` and a REPRINT audit event is recorded
- [ ] **Given** the first print failed, **When** Retry, **Then** it is not marked REPRINT

## UI/UX Impact

Print ticket after a successful print becomes Reprint.

## API Dependencies

- WeighingMS reprint endpoint; `POST /api/tickets`

## Test Expectations

- API: reprint marking + audit

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 002-compose-and-print-weighing-ticket
- 004-weighing-station/013-weighing-records-and-audit-trail

### Enables
- None

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| — | — |

## Out of Scope

- None
