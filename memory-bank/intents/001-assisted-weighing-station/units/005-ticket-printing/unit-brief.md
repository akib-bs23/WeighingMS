---
unit: 005-ticket-printing
intent: 001-assisted-weighing-station
phase: inception
status: complete
unit_type: backend
default_bolt_type: simple-construction-bolt
created: 2026-10-29T09:24:35Z
updated: 2026-10-31T11:45:00Z
---

# Unit Brief: Ticket & Printing

## Purpose

Produce the physical record that travels with the container: compose the weighing ticket from a completed session, render a preview, and send it to the **Dummy Printer** via `PrinterPort`, with safe handling when the printer is unavailable and marked reprints.

## Scope

### In Scope
- Ticket composer: header `FCI DYEING — WEIGHING TICKET`, Batch, Order, Machine, Shade, Date, Operator, component TGT/ACT lines, tolerance summary, Code 128 barcode of batch id
- Dummy Printer: `POST /api/tickets` (job id, status, rendered content), status, online/offline toggle → `503 PRINTER_UNAVAILABLE`
- `PrinterPort` + Dummy adapter
- Preview always available; print error + Retry (TD-9)
- Reprint marked `REPRINT` + audit event (Could)

### Out of Scope
- Real printer language/layout (OQ-12); label printing beyond the ticket

---

## Assigned Requirements

| Req | Requirement | Priority |
|-----|-------------|----------|
| FR-25 | Generate and print weighing ticket (incl. printer-unavailable behaviour TD-9) | Must |
| FR-26 | Ticket reprint marked REPRINT | Could |
| DB-6 | Dummy Printer `POST /api/tickets` | Must |
| DB-7 | Printer unavailable → 503 | Must |

---

## Domain Concepts

### Key Entities
| Entity | Description | Attributes |
|--------|-------------|------------|
| Ticket | Composed ticket content | ticketId, sessionId, batchId, fields, lines[], toleranceSummary, barcodeValue, isReprint, createdAt |
| PrintJob | Dummy Printer job | jobId, ticketId, status QUEUED/PRINTED/FAILED, printedAt |

### Key Operations
| Operation | Description | Inputs | Outputs |
|-----------|-------------|--------|---------|
| composeTicket | Build from completed session | sessionId | Ticket |
| printTicket | Submit via port | ticketId | PrintJob / 503 |
| reprint | Submit again marked REPRINT | ticketId | PrintJob |

---

## Story Summary

- **Total Stories**: 3
- **Must Have**: 2
- **Should Have**: 0
- **Could Have**: 1

### Stories

- [ ] **001-dummy-printer-accepts-tickets**: Dummy printer accepts tickets - Must - Planned
- [ ] **002-compose-and-print-weighing-ticket**: Compose, preview and print the weighing ticket - Must - Planned
- [ ] **003-reprint-ticket**: Reprint a ticket marked REPRINT - Could - Planned

---

## Dependencies

### Depends On
| Unit | Reason |
|------|--------|
| 004-weighing-station | Completed session, records, operator |

### Depended By
| Unit | Reason |
|------|--------|
| 006-assisted-weighing-station-ui | Screen 3 ticket preview and print |

### External Dependencies
| System | Purpose | Risk |
|--------|---------|------|
| Ticket printer (real) | Replaced by Dummy | Low (A-04) |

---

## Technical Context

### Suggested Technology
NestJS `TicketsModule` + `PrinterModule`; barcode rendered as SVG (Code 128) in the UI from `barcodeValue`.

### Data Storage
| Data | Type | Volume | Retention |
|------|------|--------|-----------|
| Tickets, print jobs | SQLite | one+ per batch | until reset |

---

## Success Criteria

### Functional
- [ ] Ticket for B-24187 contains all fields with confirmed actuals
- [ ] Printer offline → error + Retry; preview still shown
- [ ] Reprint carries REPRINT and writes audit event

### Quality
- [ ] API + composer unit tests; coverage > 80 %

---

## Bolt Suggestions

| Bolt | Type | Focus |
|------|------|-------|
| bolt 1 | Simple | Composer, Dummy Printer, PrinterPort, offline, reprint |
