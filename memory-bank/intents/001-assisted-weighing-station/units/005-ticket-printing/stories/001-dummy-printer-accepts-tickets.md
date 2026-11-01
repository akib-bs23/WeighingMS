---
id: 001-dummy-printer-accepts-tickets
unit: 005-ticket-printing
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00Z
assigned_bolt: 010-ticket-printing
implemented: true
---

# Story: 001-dummy-printer-accepts-tickets

**Title**: Dummy printer accepts tickets

## User Story

**As a** WeighingMS station
**I want** to send a ticket to the (Dummy) printer and know whether it printed
**So that** a physical record accompanies the container (BR-15)

## Requirements

- **Unit**: `005-ticket-printing`
- **Requirements**: DB-6, DB-7, brief IR-16

## Acceptance Criteria

- [ ] **Given** a ticket payload, **When** `POST /api/tickets` is called, **Then** `201` with `{ jobId, ticketId, status: 'PRINTED', renderedLines }` and the job is stored
- [ ] **Given** the printer offline, **When** posted, **Then** `503 PRINTER_UNAVAILABLE`
- [ ] **Given** a status request, **When** called, **Then** printer online/offline is reported

## UI/UX Impact

`PRINTER` indicator; print result on Screen 3.

## API Dependencies

- `POST /api/tickets`
- Printer status
- Simulator: printer online/offline (training prefix)

## Test Expectations

- API: 201, 503, status
- Evidence: STEP-27-printer-api

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 001-orgatex-integration/001-project-scaffold-and-training-seed

### Enables
- 002-compose-and-print-weighing-ticket

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Payload missing barcode value | 400 |

## Out of Scope

- Printer languages (ZPL etc.)
