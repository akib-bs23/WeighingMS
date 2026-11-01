---
stage: test
bolt: 010-ticket-printing
created: 2026-10-30T18:20:00Z
---

## Test Report: ticket-printing (workbook Step 27, backend)

### Summary

- **Vitest**: 487/487 passed (49 files; 4 new test files for this bolt)
- **Coverage** (`src/server` + `src/shared` + `src/client`): statements 97.4%, **branches 87.5%**, functions 96.2%, lines 98.0%; `src/server/tickets` at 98.5% statements / 79.2% branches; `src/server/integrations/printer` at 100% statements
- **Playwright**: unchanged from bolt 009 (5/5) — no UI in this bolt's scope
- **Quality gates**: `pnpm format`/`format:check`, `pnpm lint`, `pnpm typecheck` all green

### Test Files (new in this bolt)

- [x] `tests/server/integrations/printer/dummy-printer.adapter.test.ts` — DI binding, print + echo, `PRINTER_UNAVAILABLE` when offline
- [x] `tests/server/integrations/printer/printer.api.test.ts` — `201` print, `503` offline, `400` missing `barcodeValue`, `400` missing body, status, training toggle, reset restores online
- [x] `tests/server/tickets/ticket.service.test.ts` — `BATCH_INCOMPLETE` before completion, full ticket content matching the prototype exactly, idempotent submit, offline-then-retry, `TICKET_NOT_FOUND`, reprint success/failure/audit, retry-clears-reprint-flag, reset clears tickets
- [x] `tests/server/tickets/ticket.api.test.ts` — the same over HTTP, plus the override tolerance-summary wording

### Acceptance Criteria Validation

**Story 001 — dummy-printer-accepts-tickets**
- ✅ Valid payload → `201 { jobId, ticketId, status: 'PRINTED', renderedLines }`, confirmed both at the adapter and API level
- ✅ Offline → `503 PRINTER_UNAVAILABLE`
- ✅ Status request reports online/offline
- ✅ Missing `barcodeValue` → `400 INVALID_TICKET` (edge case)

**Story 002 — compose-and-print-weighing-ticket**
- ✅ Composed ticket for completed B-24187 contains the header, batch/order/machine/shade/date/operator, all 5 component TGT/ACT lines in **recipe sequence order** (not confirmation order), tolerance summary, barcode value `B-24187` — field-by-field matching the prototype's own ticket HTML (verified by reading its source during Plan)
- ✅ Printer online → ticket `PRINTED`, `GET` preview matches exactly
- ✅ Printer offline → `PENDING` with `lastError`, preview still available via `GET`, batch stays `COMPLETED`
- ✅ An overridden component → `"OVERRIDDEN — SEE RECORDS"` instead of `"ALL WITHIN TOLERANCE"`
- ✅ Print before completion → `409 BATCH_INCOMPLETE` (edge case)

**Story 003 — reprint-ticket**
- ✅ Reprinting a printed ticket → new job `isReprint: true`, exactly one `REPRINT` audit event
- ✅ A failed reprint attempt → stays `PENDING`, **no** audit event written (nothing was actually reprinted)
- ✅ Retrying a failed attempt (whether the original failure was an initial print or a reprint) → succeeds with `isReprint: false`
- ✅ Reprinting a never-printed ticket → `409 TICKET_NOT_PRINTED`

### Issues Found

None during Test — the one real issue (`SessionView` missing `orderRef`/`machineRef`/`shadeCode`) was found and fixed during Implement, and is covered by this stage's tests (`orderRef: 'SO-9931'`, `machineRef: 'JET-04'`, `shadeCode: 'Teal 4C'` all asserted directly on the composed ticket).

### Known Limitations (by design, not bugs)

- `ticket.service.ts`'s one defensive guard (a completed component with no matching `WeighingRecord`) is genuinely unreachable — `submit` only composes once every component is `DONE`, and a component only ever becomes `DONE` together with its record (Invariant 3, bolt 006). Same honest-flagging convention as every prior bolt's defensive guards.

### Evidence

- `evidence/STEP-27-ticket.json` — full composed+printed ticket for B-24187, matching the prototype's content.
- `evidence/STEP-27-printer-api-offline.json` — a reprint attempt with the printer offline, showing `status: 'PENDING'`, `lastError: 'PRINTER_UNAVAILABLE'`.

### Recommendations

- This closes unit `005-ticket-printing`. Remaining units in the approved plan are the UI bolts (011, 012), which will build Screen 2's remaining actions (identity, override, Quit) and Screen 3 (completion summary, ticket preview, print/reprint) on top of everything bolts 006–010 already expose.
- No other follow-ups.
