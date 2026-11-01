---
stage: implement
bolt: 010-ticket-printing
created: 2026-10-30T18:15:00Z
---

## Implementation Walkthrough: ticket-printing (workbook Step 27, backend)

### Summary

Built the Dummy Printer (in-memory, mirrors the Dummy Scanner) and `TicketService` (mirrors
`WriteBackService` deliberately — one row per session, retried in place while `PENDING`, with a
separate explicit `reprint` once `PRINTED`). Live-verified end-to-end against the running dev
server: ticket composition blocked before completion, the full B-24187 ticket matching the
prototype's content exactly (header fields, 5 component TGT/ACT lines in recipe order, `ALL WITHIN
TOLERANCE`, barcode value), a successful reprint producing a `REPRINT` audit event, and a failed
reprint attempt (printer offline) correctly leaving the ticket `PENDING` until a subsequent retry
clears the reprint flag.

### Completed Work

- [x] `src/shared/contracts/devices.ts` — `PrintTicketRequest`, `PrintJobResult`
- [x] `src/shared/contracts/ticket.ts` (new) — `TicketLineView`, `TicketView`, `TicketPrintStatus`, `TicketState`
- [x] `src/server/integrations/printer/` — `PrinterPort`, `DummyPrinterService` (in-memory), `DummyPrinterAdapter`, `DummyPrinterController` (`POST /api/tickets`, `GET /api/printer/status`), `PrinterTrainingController` (`PUT /api/training/printer`), `PrinterModule`
- [x] `src/server/database/schema/tickets.ts` — `tickets` table (content + print status in one row, mirroring `write_backs`)
- [x] `src/server/tickets/ticket.service.ts`, `ticket.controller.ts`, `tickets.module.ts`
- [x] `src/server/app.module.ts` — registers `PrinterModule`, `TicketsModule`

### Key Decisions

- **No separate `TicketRepository`** — deviating from the Plan's file list, everything lives
  directly in `TicketService`, mirroring `WriteBackService` exactly (bolt 003 also has no separate
  repository class for write-backs). Keeping the two mirrored structures literally parallel made
  more sense than introducing an extra layer bolt 003 itself doesn't have.
- **Ticket lines are built from `session.components` (always sequence-ordered), not from
  confirmation order** — story 011's "operator jumped ahead" case means components can be
  confirmed out of recipe order; the printed ticket must still read like the recipe, not like the
  order things happened to be weighed in.
- **A failed `reprint` attempt leaves the ticket `PENDING` and does *not* write a `REPRINT` audit
  event** — only a successful reprint is a fact worth auditing; an attempt that never actually
  reprinted anything has nothing to record. `retry`'s own success path always clears the reprint
  flag (sets `isReprint: false`), regardless of whether the attempt it's retrying was itself an
  initial print or a failed reprint — satisfying story 003's "a retried failure is never marked
  reprint" for either case.

### Deviations from Plan

- **No separate `TicketRepository`** (see above).
- **Discovered mid-implementation: `SessionView` had nowhere to carry `orderRef`/`machineRef`/
  `shadeCode`.** The ticket needs these (story 002 AC1), but the aggregate (bolt 006) only ever
  stored `batchId`, discarding the rest of the `OrgatexBatch` it already fetches at session start.
  Composing the ticket by calling `OrgatexPort.getBatch` again at print time was rejected: it would
  make ticket printing depend on OrgaTEX being reachable long after weighing is done, contradicting
  TD-8's own reasoning ("an outage must not stop weighing already in progress" — printing after
  completion is exactly the kind of thing that shouldn't be blocked by an unrelated system being
  down). **Fixed** by adding `orderRef`/`machineRef`/`shadeCode` to `SessionView` and the
  `weighing_sessions` table, populated once at `start()` from data the service already has in hand
  — a small, additive change to bolt 006's closed aggregate, not a redesign of anything it decided.
  Flagging this clearly since it touches a different, already-completed bolt.

### Dependencies Added

None.

### Developer Notes

- `pnpm lint`/`pnpm typecheck`/`pnpm format:check` green on the first pass.
- Full live walkthrough against the running dev stack: `BATCH_INCOMPLETE` before completion, the
  full ticket content (verified field-by-field against the prototype's own ticket HTML), reprint
  with its audit event, a failed reprint leaving `PENDING`, and retry clearing the reprint flag on
  success.
