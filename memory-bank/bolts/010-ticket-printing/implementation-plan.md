---
stage: plan
bolt: 010-ticket-printing
created: 2026-10-30T18:10:00Z
---

## Implementation Plan: ticket-printing (workbook Step 27, backend)

Two layers, mirroring every prior device integration: the **Dummy Printer** (a training device,
analogous to the Dummy Scale/Scanner — knows nothing about "tickets" as a business concept, just
prints lines of text and a barcode value under a caller-given id) and **WeighingMS's own ticket
composer/print orchestration** (analogous to bolt 003's `WriteBackService` — one record per
session, retry-on-failure, and a separate explicit reprint action), consuming the Dummy Printer
through `PrinterPort`.

### Stories in Scope

- **001-dummy-printer-accepts-tickets** (Must) — DB-6, DB-7, brief IR-16
- **002-compose-and-print-weighing-ticket** (Must) — FR-25, TD-9
- **003-reprint-ticket** (Could) — FR-26

### What Will Change

1. **Dummy Printer**: in-memory device (like the Dummy Scanner — no DB table of its own), accepts
   `{ ticketId, lines, barcodeValue }` and returns a job record, or throws `PRINTER_UNAVAILABLE`
   when offline.
2. **`PrinterPort`** + Dummy adapter, mirroring `ScalePort`/`ScannerPort`.
3. **Ticket composer + print orchestration** (`TicketService`, new `WeighingMS`-owned module):
   composes a ticket from a completed session exactly once, stores it, and manages its print
   status (`PENDING`/`PRINTED`) with retry — the exact same shape `WriteBackService` already
   uses for write-back, reused deliberately rather than inventing a second idempotency pattern.
4. **Reprint**: a separate explicit action, valid only once a ticket is already `PRINTED`; writes
   a `REPRINT` audit event (the type already exists in `audit_events`, bolt 008 — unused until now).

### Deliverables (files to be created / modified)

**Shared**
- `src/shared/contracts/devices.ts` — add `PrintTicketRequest { ticketId, lines, barcodeValue }`, `PrintJobResult { jobId, ticketId, status: 'PRINTED', renderedLines }`
- `src/shared/contracts/ticket.ts` (new) — `TicketLineView`, `TicketView`, `TicketPrintStatus` (`'PENDING' | 'PRINTED'`), `TicketState` (the stored row's shape: ticket + current print status, mirrors `WriteBackState`)

**Server**
- `src/server/integrations/printer/printer.port.ts` — `PrinterPort { print(request): Promise<PrintJobResult>; isOnline(): boolean }`, `PRINTER_PORT` token
- `src/server/integrations/printer/printer.module.ts`
- `src/server/integrations/printer/dummy/dummy-printer.service.ts` — in-memory (no DB table — same tier as the Dummy Scanner); `jobId` counter; registers with `ResetRegistry`
- `src/server/integrations/printer/dummy/dummy-printer.adapter.ts`
- `src/server/integrations/printer/dummy/dummy-printer.controller.ts` — `POST /api/tickets`, `GET /api/printer/status`
- `src/server/integrations/printer/dummy/printer-training.controller.ts` — `PUT /api/training/printer { online }` (reuses the existing `SetAvailabilityDto`)
- `src/server/database/schema/tickets.ts` (+ export) — `tickets` table (ticket content + print status in one row, mirroring `write_backs`)
- migration `0005_tickets`
- `src/server/tickets/ticket.repository.ts` — `findBySession`, `save`
- `src/server/tickets/ticket.service.ts` — `submit(sessionId)` (compose-if-missing + attempt), `retry(sessionId)`, `reprint(sessionId)`, `get(sessionId)`
- `src/server/tickets/ticket.controller.ts` — routes below
- `src/server/tickets/tickets.module.ts` — imports `PrinterModule`; depends on `WeighingSessionService`/`WeighingRecordRepository`/`AuditEventRepository` (exported by `WeighingModule`, already set up)
- `src/server/app.module.ts` — register `PrinterModule`, `TicketsModule`

**Tests**
- `tests/server/integrations/printer/dummy-printer.service.test.ts`, `dummy-printer.adapter.test.ts`
- `tests/server/integrations/printer/printer.api.test.ts` (ticket post, status, offline, training toggle)
- `tests/server/tickets/ticket.service.test.ts`
- `tests/server/tickets/ticket.api.test.ts`

### APIs Involved

**Dummy Printer** (training contract, no claim about a real printer protocol — OQ-12):

| Endpoint | Method | Request | Success | Notes |
|----------|--------|---------|---------|-------|
| `/api/tickets` | POST | `{ ticketId, lines: string[], barcodeValue }` | `201 { jobId, ticketId, status: 'PRINTED', renderedLines }` | `renderedLines` echoes `lines`, confirming content; offline → `503 PRINTER_UNAVAILABLE`; missing `barcodeValue` → `400` (story 001 edge case) |
| `/api/printer/status` | GET | — | `200 DeviceAvailability` | |
| `/api/training/printer` | PUT | `{ online }` | `200 DeviceAvailability` | Simulator toggle, same `SetAvailabilityDto` every other Dummy already uses |

**WeighingMS ticket** (application API, under `/api/sessions/:sessionId/ticket`):

| Endpoint | Method | Success | Notes |
|----------|--------|---------|-------|
| `POST /api/sessions/:sessionId/ticket` | — | `200 TicketState` | Composes once (409 `BATCH_INCOMPLETE` if the session isn't completed yet — story 002 edge case), then attempts print; if a ticket already exists, behaves exactly like `retry` (never recomposes) |
| `POST /api/sessions/:sessionId/ticket/retry` | — | `200 TicketState` | Re-attempts only while `PENDING`; a `PRINTED` ticket is returned unchanged — never marked reprint |
| `POST /api/sessions/:sessionId/ticket/reprint` | — | `200 TicketState` | Only valid once `PRINTED` (else `409 TICKET_NOT_PRINTED`); marks the resulting job `isReprint: true`, writes one `REPRINT` audit event |
| `GET /api/sessions/:sessionId/ticket` | — | `200 TicketState` | Preview reload; `404 TICKET_NOT_FOUND` if `submit` was never called |

**New error codes**: `PRINTER_UNAVAILABLE` (503, propagated unchanged like every other Dummy), `TICKET_NOT_FOUND` (404), `TICKET_NOT_PRINTED` (409, reprint-before-first-success).

**View shapes**:

```text
TicketLineView:  name, targetMg, actualMg, uom
TicketView:      ticketId, sessionId, batchId, orderRef, machineRef, shadeCode, date,
                 operatorName, lines: TicketLineView[], toleranceSummary, barcodeValue, isReprint
TicketState:     { ticket: TicketView, status: 'PENDING' | 'PRINTED', jobId, printedAt,
                   attempts, lastError }    // mirrors WriteBackState exactly
```

### Decisions Needing Your OK (Rule 2)

1. **Ticket line names use the full dyestuff name** (e.g. "Remazol Brill. Blue RSPL"), not the
   prototype's ad-hoc short forms ("Blue RSPL", "Na2SO4"). Nothing in the brief or stories defines
   an abbreviation rule, and the prototype itself invents these informally — rather than guess at
   a truncation algorithm nobody specified, the ticket uses the one name this domain already
   records (`dyestuff.name`, the recipe snapshot). Slightly longer lines, zero invented logic.
2. **Override tolerance-summary wording**: `"ALL WITHIN TOLERANCE"` when every record is
   `IN_TOLERANCE` (matches the prototype exactly); otherwise `"OVERRIDDEN — SEE RECORDS"`. The
   story only says the summary must "note the override instead of ALL WITHIN TOLERANCE" without
   specifying exact wording — this is a plain, literal statement of fact, not a design with
   alternatives worth presenting.
3. **`PrintJobResult.status` is `'PRINTED'` only** — no `QUEUED`/`FAILED` states as the unit
   brief's domain-concepts table speculatively listed. Every other Dummy device in this project
   throws on unavailability rather than returning a degraded status object (`ScalePort`,
   `ScannerPort`, `OrgatexPort`); the Dummy Printer follows the same rule rather than introducing
   a new pattern for one device.
4. **No visual barcode rendering** — this bolt is backend-only (its own "Workbook Steps Covered:
   Steps 27 (backend)"). `barcodeValue` is carried as plain string data (`= batchId`); rendering
   it as an actual Code 128 symbol is a UI concern for bolt 011/012, which is where the prototype's
   own barcode rendering (purely decorative random bars, confirmed by reading its source — "Label
   content is invented") would be re-implemented from spec if ever needed for the demo.

### Acceptance Criteria

- [ ] Valid ticket payload → `201`, job stored, `renderedLines` matches `lines`
- [ ] Printer offline → `503 PRINTER_UNAVAILABLE`
- [ ] Missing `barcodeValue` → `400`
- [ ] Printer status reflects online/offline within the existing 2 s status-strip expectation (unchanged mechanism, FR-28)
- [ ] Composed ticket for completed B-24187 contains header, batch/order/machine/shade/date/operator, 5 component TGT/ACT lines, tolerance summary, barcode value `B-24187`
- [ ] Print before completion → `409 BATCH_INCOMPLETE`
- [ ] Printer online → ticket `PRINTED`, preview matches stored ticket
- [ ] Printer offline → ticket stays `PENDING` with `lastError`, preview still available via `GET`
- [ ] An overridden component's ticket shows `"OVERRIDDEN — SEE RECORDS"` instead of `"ALL WITHIN TOLERANCE"`
- [ ] Reprint after a successful print → new job `isReprint: true`, one `REPRINT` audit event
- [ ] Retry after a failed print → not marked reprint
- [ ] lint, format, typecheck, tests green; coverage ≥ 80% lines and branches
