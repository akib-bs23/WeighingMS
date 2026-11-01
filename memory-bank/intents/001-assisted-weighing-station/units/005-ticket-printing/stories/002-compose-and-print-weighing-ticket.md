---
id: 002-compose-and-print-weighing-ticket
unit: 005-ticket-printing
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00Z
assigned_bolt: 010-ticket-printing
implemented: true
---

# Story: 002-compose-and-print-weighing-ticket

**Title**: Compose, preview and print the weighing ticket

## User Story

**As a** operator
**I want** to print a weighing ticket for the completed batch, and still see the preview if the printer fails
**So that** the container travels with a correct physical record (FR-25)

## Requirements

- **Unit**: `005-ticket-printing`
- **Requirements**: FR-25, TD-9, UQ-12

## Acceptance Criteria

- [ ] **Given** completed B-24187, **When** the ticket is composed, **Then** it contains `FCI DYEING — WEIGHING TICKET`, BATCH B-24187, ORDER SO-9931, MACHINE JET-04, SHADE Teal 4C, DATE (completion `YYYY-MM-DD HH:MM`), OPER. R. Karim, five component lines TGT/ACT in unit, tolerance summary, barcode value `B-24187` (Code 128)
- [ ] **Given** Print ticket, **When** the printer is online, **Then** the job is PRINTED and the preview matches the stored ticket
- [ ] **Given** the printer offline, **When** Print ticket, **Then** error "Printer unavailable" with Retry; preview still shown; batch stays completed
- [ ] **Given** an overridden component, **When** composed, **Then** the summary line notes the override instead of `ALL WITHIN TOLERANCE`

## UI/UX Impact

Screen 3 ticket preview and Print ticket (F1).

## API Dependencies

- WeighingMS: `POST /api/sessions/:id/ticket` (compose), print via `PrinterPort` → `POST /api/tickets`

## Test Expectations

- Unit: composer content
- API: print online/offline
- E2E: ticket visible (STEP-27)

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 001-dummy-printer-accepts-tickets
- 004-weighing-station/012-complete-batch

### Enables
- 003-reprint-ticket
- 006-assisted-weighing-station-ui/006-confirm-and-print-screen

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Print before completion | 409 BATCH_INCOMPLETE |

## Out of Scope

- Configurable label layouts (brief IR-16)
