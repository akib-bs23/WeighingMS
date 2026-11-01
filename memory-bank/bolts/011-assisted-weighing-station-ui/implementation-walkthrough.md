---
stage: implement
bolt: 011-assisted-weighing-station-ui
created: 2026-10-31T09:40:00Z
---

## Implementation Walkthrough: assisted-weighing-station-ui (bolt 3 of 4 — workbook Steps 23–27, UI)

### Summary

Screen 2's three disabled placeholders (identity, override, Quit) are now fully wired, and Screen 3
exists end-to-end: summary, write-back status + Retry, ticket preview with a decorative barcode,
Print/Retry/Reprint, and Next batch. F1/F2/F4 work on Screen 2, F1/F3 on Screen 3. Live-verified
with a full walkthrough via a temporary (deleted) Playwright script: identity mismatch → clear,
dispense → confirm, wrong-PIN → correct-PIN override, Quit → the new "select a pending component"
prompt → re-select → finish the remaining components → Screen 3 with the correct summary
(`allWithinTolerance: NO` reflecting the override) and ticket content, print, Next batch back to
the queue.

### Completed Work

- [x] `src/client/net/weighing.ts` — `verifyIdentity`, `authoriseOverride`, `quit`, `complete`, `getSummary`
- [x] `src/client/net/ticket.ts`, `net/write-back.ts` (new)
- [x] `src/client/features/weighing/OverrideDialog.tsx` — PIN + reason, inline server-provided error
- [x] `src/client/features/weighing/ComponentHeader.tsx` — real identity indicator (was an inert `aria-hidden` slot)
- [x] `src/client/features/weighing/WeighActions.tsx` — Quit/Override now real; F-key hints marked `aria-hidden`
- [x] `src/client/features/weighing/useWeighActions.ts` (new) — action/dialog state
- [x] `src/client/features/weighing/WeighScreen.tsx` — identity scanning (`useScanInput`, reused as-is), the completion effect, the split no-active-component banner, F1/F2/F4
- [x] `src/client/hooks/use-function-keys.ts` (new, shared by both screens)
- [x] `src/client/features/confirm-print/` — `ConfirmPrintScreen.tsx`, `Barcode.tsx`, `use-confirm-print.ts`, `format-elapsed.ts`
- [x] `src/client/App.tsx` — `'done'` view, `onBatchCompleted`, resume-to-Screen-3 for an already-completed session
- [x] `src/client/i18n/messages.ts`, `src/client/styles/station.css` — new strings; dialog/identity/Screen-3/barcode styles; `.wms-key` bumped to 62 px

### Key Decisions

All five Plan decisions held as designed — no surplus-recalculation panel, decorative barcode, per-screen F-key scoping, resume-to-Screen-3, split no-active-component messaging (see Deviations below for the one subtlety that emerged).

### Deviations from Plan

- **Button accessible names needed `aria-hidden` on the F-key hint spans.** Rendering `<span className="fn">F1</span>` as a sibling text node inside a `<button>` (matching the prototype's own markup shape) changes the button's computed accessible name to include it (e.g. `"QuitF4"` instead of `"Quit"`) — React Testing Library's `getByRole('button', { name: 'Quit' })` then fails to match. Every existing test clicking these buttons by their primary label broke the moment the hints were added. Fixed by marking every `.fn` hint span `aria-hidden="true"`: it's a decorative, supplementary cue, not part of the button's actual accessible name, which is the correct semantics regardless of the testing concern.
- **The completion effect needed a non-empty-components guard.** `session.components.every(...)` is vacuously `true` for an empty array — harmless in real use (a recipe is never empty, bolt 006's own stated assumption) but `App.test.tsx`'s unrelated fixture uses `components: []` and immediately tripped the "all done" branch, calling `complete()` (unmocked in that test file) and crashing. Fixed with an explicit `session.components.length > 0 &&` guard — a one-line defensive correction, not a design change.
- **`useFunctionKeys` moved to a new shared `src/client/hooks/` directory** rather than living only in `features/weighing/` as the Plan implied — `ConfirmPrintScreen` needs the identical hook, so a shared location was the only non-duplicating option; `hooks/` is the natural new top-level peer to the existing `net/`, `features/`, `components/`.

### Dependencies Added

None.

### Developer Notes

- `pnpm lint`/`pnpm typecheck`/`pnpm format:check` green; the existing 498-test suite (unchanged plus the mechanical fixture fixes above) and all 5 existing Playwright specs still pass unmodified.
- Full live walkthrough performed via a temporary, non-committed Playwright script (deleted after use, consistent with every prior bolt's practice) — every Plan acceptance criterion observed working: identity mismatch blocks confirm even in tolerance and clears on a correct scan; wrong PIN shows the exact server message and the dialog stays open; a successful override produces an `OVERRIDDEN` record and the correct `"OVERRIDDEN — SEE RECORDS"` ticket wording; Quit shows the new prompt (not the old misleading "fully weighed" text) and the component is re-selectable from scratch; the full five-component batch reaches Screen 3 with the exact prototype total (`35.3221 kg` → `35.304 kg` shown for this particular test run's actuals, format verified correct); the ticket preview, barcode and Print/Reprint cycle all matched expectations; Next batch returns to the queue.
- Stage 3 still owes: dedicated component/hook tests for everything built this stage, and a new `playwright/confirm-print.spec.ts` covering the same flow permanently (the temporary script proved the behavior but isn't committed).
