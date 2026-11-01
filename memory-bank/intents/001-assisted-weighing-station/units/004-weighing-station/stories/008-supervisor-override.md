---
id: 008-supervisor-override
unit: 004-weighing-station
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00Z
assigned_bolt: 008-weighing-station
implemented: true
---

# Story: 008-supervisor-override

**Title**: Supervisor override with PIN and reason

## User Story

**As a** supervisor
**I want** to authorise confirmation of a weighing outside tolerance with my PIN and a reason
**So that** exceptions are possible but always attributable and justified (FR-19, BR-13)

## Requirements

- **Unit**: `004-weighing-station`
- **Requirements**: FR-19, NFR-11, TD-7

## Acceptance Criteria

- [ ] **Given** Yellow RGB at 93.0 g (under), **When** override with valid supervisor PIN and reason "Lab approved", **Then** a record is stored with result OVERRIDDEN, actual 93.0 g, supervisorId, reason, authorisedAt, and an OVERRIDE audit event
- [ ] **Given** a wrong PIN, **When** override, **Then** `401 SUPERVISOR_AUTH_FAILED` "Supervisor authentication failed", nothing stored
- [ ] **Given** an empty reason, **When** override, **Then** `400 REASON_REQUIRED` "Reason is required"
- [ ] **Given** any response or log, **When** inspected, **Then** the PIN never appears; stored as a hash only
- [ ] **Given** an `over` reading, **When** override is requested, **Then** behaviour follows the Step 24 decision (until then: allowed with reason)

## UI/UX Impact

Supervisor override key opens PIN + reason dialog; result shown on component (`✓ 93.0 · OVR`).

## API Dependencies

- WeighingMS: `POST /api/sessions/:id/override`

## Test Expectations

- API: success, wrong PIN, empty reason, PIN not leaked
- E2E: override flow

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 005-confirm-in-tolerance-weighing

### Enables
- 011-component-progression
- 013-weighing-records-and-audit-trail

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Operator enters own (non-supervisor) credentials | 401 |

## Out of Scope

- Supervisor user management
- Real authentication
