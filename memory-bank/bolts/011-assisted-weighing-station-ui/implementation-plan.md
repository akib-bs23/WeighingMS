---
stage: plan
bolt: 011-assisted-weighing-station-ui
created: 2026-10-31T09:00:00Z
---

## Implementation Plan: assisted-weighing-station-ui (bolt 3 of 4 — workbook Steps 23–27, UI)

Makes Screen 2 fully actionable (identity, override, Quit — the three actions bolt 007 left
disabled behind "available in a later bolt") and builds Screen 3 · Confirm & print, backed
entirely by the already-built and already-tested APIs from bolts 008, 009 and 010. No new backend
work — every endpoint this bolt calls already exists.

### Stories in Scope

- **005-weigh-actions** (Must) — FR-7, FR-11, FR-17, FR-19, FR-20, FR-21, NFR-3
- **006-confirm-and-print-screen** (Must) — FR-23, FR-24, FR-25, FR-26, TD-8, TD-9
- **008-function-keys** (Should) — FR-33

### Deliverables (files)

**Client net** (thin wrappers, same pattern as every existing `net/*.ts` file)
- `src/client/net/weighing.ts` — add `verifyIdentity`, `authoriseOverride`, `quit`, `complete`, `getSummary`
- `src/client/net/ticket.ts` (new) — `getTicket`, `submitTicket`, `retryTicket`, `reprintTicket`
- `src/client/net/write-back.ts` (new) — `getWriteBack`, `retryWriteBack`

**Screen 2 (extend bolt 007's work, no redesign)**
- `src/client/features/weighing/OverrideDialog.tsx` (new) — PIN + mandatory reason, inline `"Supervisor authentication failed"` / `"Reason is required"`, Submit/Cancel
- `src/client/components/ComponentHeader.tsx` — fill the `identity-slot` placeholder (bolt 007 left it `aria-hidden`, inert) with a verified/mismatch indicator
- `src/client/features/weighing/WeighActions.tsx` — Quit and Supervisor override become real (no longer `disabled`); OK's enablement gains the identity-mismatch condition
- `src/client/features/weighing/WeighScreen.tsx` — wires identity scanning (`useScanInput`, reused as-is — it already works on any active screen), Quit, override dialog open/submit, and the no-active-component branch (see Decision 5 below)
- `src/client/features/weighing/useWeighActions.ts` (new) — the action/dialog state currently inlined in `WeighScreen.tsx` grows enough (override dialog state, busy flags per action) to warrant its own hook, same reasoning bolt 005 used for `use-batch-queue`

**Screen 3 (new)**
- `src/client/features/confirm-print/ConfirmPrintScreen.tsx` — orchestrates the summary, write-back status + Retry, ticket preview + Print/Retry/Reprint, Next batch
- `src/client/features/confirm-print/Barcode.tsx` — a simple decorative bar rendering from `barcodeValue` (Decision 2)
- `src/client/features/confirm-print/use-confirm-print.ts` — fetches/holds summary + ticket state, exposes `print`/`retryTicket`/`reprint`/`retryWriteBack`
- `src/client/features/confirm-print/format-elapsed.ts` — `elapsedMs` → `"6 min 41 s"`; `confirmedAt` → `"CONFIRMED HH:MM:SS"` (client-only display formatting, no server equivalent needed)

**Wiring**
- `src/client/App.tsx` — new `'done'` view; `WeighScreen` gains `onBatchCompleted`; resuming an already-`COMPLETED` session (reload) goes straight to `'done'` (Decision 4); `ConfirmPrintScreen`'s Next batch returns to `'queue'`
- `src/client/i18n/messages.ts` — replace the stale `batchFullyWeighed` placeholder; add the Screen 3 strings and the new "select a pending component" message (Decision 5)
- `src/client/styles/station.css` — override dialog, identity indicator, Screen 3 layout, barcode bars; bump `.wms-key` to `min-height: 62px` (story 005's own AC is 62 px, 2 px above the general NFR-3 minimum the existing rule used)

**Tests**
- `tests/client/net/weighing.test.ts`, `ticket.test.ts` (new), `write-back.test.ts` (new) — path/method/body per call
- `tests/client/weighing/OverrideDialog.test.tsx`, `ComponentHeader.test.tsx` (extend), `WeighActions.test.tsx` (new), `WeighScreen.test.tsx` (extend) — enablement matrix, dialog validation, Quit, identity scan, F-key handling
- `tests/client/confirm-print/ConfirmPrintScreen.test.tsx`, `use-confirm-print.test.ts` — summary rendering, write-back states, ticket print/retry/reprint
- `playwright/confirm-print.spec.ts` (new) — full five-component flow through to ticket print and Next batch (workbook Steps 23–27)

### Decisions Needing Your OK (Rule 2)

1. **No separate "surplus panel" component.** Story 005's AC says the OVER zone must show "the Step 24-approved content" — which, per TD-11, is *nothing beyond* the surplus magnitude and the two recovery actions. The existing `StatusLine` already renders `"OVER TOLERANCE — SURPLUS +X g"` (bolt 007), and this bolt makes Quit/Override real. Building a dedicated panel would either duplicate that text or tempt reintroducing the recalculation table TD-11 explicitly rejected — so there isn't one.
2. **Barcode is a simple decorative bar rendering**, deterministically derived from `barcodeValue` (re-implemented from spec, not the prototype's literal PRNG) — not a real, scannable Code 128 encoder. The brief leaves barcode symbology genuinely open (OQ-12) and the prototype's own notes call its rendering invented; a training-only visual stand-in is proportionate.
3. **F-keys are handled per-screen** (a keydown effect scoped to each screen while it's active, same pattern `useScanInput`/`useLiveWeight` already use), not a new app-wide key-router. Simpler, and consistent with how this codebase already scopes "only listen while this screen is active" behaviour.
4. **Resuming an already-`COMPLETED` session (e.g. a page reload) goes straight to Screen 3**, not briefly through Screen 2 — a direct reading of NFR-6 ("resumable after reload"): resume means landing back wherever the session actually is, not always Screen 2.
5. **The no-active-component banner is split into two cases.** Bolt 007's placeholder text ("All components weighed...") was always shown whenever `activeComponentId` was `null` — including right after a Quit, when components remain pending and the message was actively misleading (flagged in bolt 008's own test report as a known UI gap). This bolt fixes it: all-done → triggers completion automatically (Decision below); some-pending-but-none-active (post-Quit) → a distinct "select a pending component to continue" prompt.

### Acceptance Criteria

- [ ] OK enabled only when zone `OK`, reading stable, scale online, no identity mismatch; disabled otherwise
- [ ] Confirm shows `✓ {actual}`, advances to the next pending component
- [ ] Re-tare / Quit reset the readout to 0; neither creates a weighing record; Quit is audited
- [ ] Supervisor override dialog requires both fields; wrong PIN shows the exact message; success produces an `OVERRIDDEN` record
- [ ] OVER zone: OK stays disabled, the existing surplus status line is visible, Override/Quit are the ways forward
- [ ] All station keys are ≥ 62 px high, ≥ 150 px wide
- [ ] Screen 3 shows `Batch {id} weighed`, the full summary, and `Written to OrgaTEX · CONFIRMED HH:MM:SS` (or `PENDING` + Retry)
- [ ] Print ticket shows the preview with barcode; printer offline → `"Printer unavailable"` + Retry; a successful second print is a Reprint
- [ ] Next batch returns to Screen 1's queue
- [ ] F1/F2/F4 work on Screen 2, F1/F3 on Screen 3; no F-key fires while the override dialog is open
- [ ] No hard-coded batch/recipe/ticket data in `src/client` (existing `no-hardcoded-data` test extended if needed)
- [ ] lint, format, typecheck, `pnpm test`, `pnpm test:e2e` all green
