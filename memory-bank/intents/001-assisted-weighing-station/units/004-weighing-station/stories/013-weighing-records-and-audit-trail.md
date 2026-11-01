---
id: 013-weighing-records-and-audit-trail
unit: 004-weighing-station
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00Z
assigned_bolt: 008-weighing-station
implemented: true
---

# Story: 013-weighing-records-and-audit-trail

**Title**: Weighing records and audit trail

## User Story

**As a** supervisor / QA
**I want** to retrieve every weighing and privileged action for a batch
**So that** I can reconstruct exactly what was weighed and by whom (FR-27, BR-14)

## Requirements

- **Unit**: `004-weighing-station`
- **Requirements**: FR-27, NFR-9

## Acceptance Criteria

- [ ] **Given** a completed B-24187 session, **When** records are requested, **Then** 5 records are returned, each with operator R. Karim and all traceability fields
- [ ] **Given** overrides/quits/reprints occurred, **When** the audit trail is requested, **Then** events OVERRIDE/ABANDON/REPRINT are listed in time order with actor and detail
- [ ] **Given** the API surface, **When** reviewed, **Then** there is no update/delete for records or audit events

## UI/UX Impact

None directly (evidence/API); supports Step 25 transaction JSON.

## API Dependencies

- WeighingMS: `GET /api/sessions/:id/weighings`, `GET /api/sessions/:id/audit`

## Test Expectations

- API: records and audit content/order
- Evidence: STEP-25-transaction.json

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 005-confirm-in-tolerance-weighing
- 008-supervisor-override
- 009-quit-abandon-component

### Enables
- 005-ticket-printing/003-reprint-ticket

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| — | — |

## Out of Scope

- History search by date/operator/dyestuff (brief FR-29, deferred)
