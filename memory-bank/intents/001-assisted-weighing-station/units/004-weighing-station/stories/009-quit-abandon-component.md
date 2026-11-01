---
id: 009-quit-abandon-component
unit: 004-weighing-station
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00Z
assigned_bolt: 008-weighing-station
implemented: true
---

# Story: 009-quit-abandon-component

**Title**: Quit (abandon) the current component

## User Story

**As a** operator
**I want** to abandon the current component weighing safely
**So that** I can start that component again without leaving a partial record (FR-20)

## Requirements

- **Unit**: `004-weighing-station`
- **Requirements**: FR-20

## Acceptance Criteria

- [ ] **Given** Yellow RGB at 60.0 g, **When** Quit, **Then** the reading is reset (tare), no weighing record exists for it, component remains not done, and an ABANDON audit event is recorded
- [ ] **Given** a mismatch or override dialog open, **When** Quit, **Then** they are cleared

## UI/UX Impact

Quit (F4) key.

## API Dependencies

- WeighingMS: `POST /api/sessions/:id/quit`
- `ScalePort.tare`

## Test Expectations

- API: no record + audit
- E2E (Step 30): Quit → safe exit

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 003-activate-component-with-scale-selection-and-tare

### Enables
- 013-weighing-records-and-audit-trail

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Quit with reading 0 | Still audited (operator intent) |

## Out of Scope

- Abandoning the whole batch/session
