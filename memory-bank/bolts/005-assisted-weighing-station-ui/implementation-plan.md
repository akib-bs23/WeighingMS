---
stage: plan
bolt: 005-assisted-weighing-station-ui
created: 2026-10-29T11:08:00Z
---

## Implementation Plan: assisted-weighing-station-ui (bolt 1 of 4)

### Objective

Build the station's React shell and **Screen 1 · Select batch**, reproducing the prototype's view 1 (`docs/customize-weighing-station.html` L437–L487, L618–L627) with live data only: the dark HMI station frame, top bar (brand, station, batch crumb, operator chip), scan prompt, batch queue from `GET /api/batches`, selection by touch or batch-card scan, the refusal message for non-released batches, and the OrgaTEX-unavailable state. Delivers workbook **Step 19 · Connect Batch Selection**.

### Stories in Scope

- **006-001-station-shell-and-api-client** (Must) — FR-4, NFR-3, NFR-14 (Could), TD-6
- **006-002-batch-selection-screen** (Must) — FR-1, FR-2, FR-3, FR-31, FR-32 (scanner fallback)

### What Will Change

1. **Station context endpoint** (server): `GET /api/station` → station id/name and the session operator (TD-6: fixed training operator *R. Karim · Shift A* from the seed). Needed so the operator chip is data, not hard-coded (Rule 5).
2. **Typed client API layer** (`src/client/api/`) — the only place the UI calls `fetch`; converts the standard error body to an `ApiError { status, code, message }`.
   - `orgatex.ts` — `listBatches`, `getBatch`, `getRecipe` (Option A: the browser-side OrgaTEX module)
   - `scanner.ts` — scan feed
   - `station.ts` — station context
3. **Station frame** components: device bezel + screen, top bar, bottom strip. The strip shows **language `EN` and a live clock** now; the device/OrgaTEX indicators are bolt 012 (FR-28) — no fake "READY" dots in the meantime.
4. **Screen 1 · Select batch**: scan prompt with animated beam, "Queue received from OrgaTEX at HH:MM" (time of the successful fetch), queue table (Batch, Order, Machine, Fabric / lot, Shade, Comp., Status tag), empty state, error state with **Retry**, refusal / not-found messages.
5. **Selection flow** (state-driven navigation, no free screen switcher): touch row or scan → `GET /api/batches/:id` → shared `checkEligibility` → if refused show reason and stay; else `GET /api/batches/:id/recipe` → go to the weigh view. Exactly the two reads of Step 19.
6. **Weigh view placeholder**: shows the selected batch and its five components with a "Back to queue" key — the real Screen 2 is bolt 007. Crumb switches to `BATCH B-24187 · ORDER SO-9931 · MACHINE JET-04`.
7. **Scan input**: (a) keyboard-wedge — characters typed then Enter, outside text fields; (b) Dummy scanner feed polled every 500 ms while Screen 1 is shown (only scans after the screen opened). Codes classified with shared `classifyScan`; a dyestuff code on Screen 1 shows "DYE-4471 is not a batch card". Scanner offline → feed ignored, touch still works.
8. **Message catalogue** (`src/client/i18n/messages.ts`, English) for all operator-facing text (NFR-14).
9. **Styling** (`src/client/styles/station.css`): prototype design tokens (dark HMI palette, zone colours, monospace tabular numerals), queue rows and keys ≥ 60 px high for gloved hands (NFR-3).
10. **Test tooling**: Vitest split into two projects — `server` (node + SWC, unchanged) and `client` (jsdom + React plugin) — plus React Testing Library; Playwright web servers for API (:3000) and client (:5173); first Playwright spec.

### Deliverables (files)

Server
- `src/server/station/station.controller.ts`, `station.module.ts` (+ `app.module.ts` import)
- `src/shared/contracts/station.ts` — add `StationContext`

Client
- `src/client/api/http.ts`, `orgatex.ts`, `scanner.ts`, `station.ts`
- `src/client/i18n/messages.ts`
- `src/client/styles/station.css`
- `src/client/App.tsx` (rewritten), `src/client/main.tsx` (styles import)
- `src/client/components/StationFrame.tsx`, `TopBar.tsx`, `StatusStrip.tsx`, `Key.tsx`
- `src/client/features/batch-selection/BatchSelectionScreen.tsx`, `QueueTable.tsx`, `use-batch-queue.ts`, `use-batch-selection.ts`
- `src/client/features/scan/use-scan-input.ts` (keyboard wedge + scanner feed)
- `src/client/features/weighing/WeighPlaceholder.tsx`

Tests
- `vitest.config.mts` → projects `server` / `client`; `tests/client/setup.ts`
- `tests/server/station/station.api.test.ts`
- `tests/client/api/http.test.ts`
- `tests/client/batch-selection/BatchSelectionScreen.test.tsx`, `use-scan-input.test.tsx`
- `tests/client/App.test.tsx` (top bar, crumb, navigation)
- `tests/client/no-hardcoded-data.test.ts` (static check: no batch ids / seed values in `src/client`)
- `playwright.config.ts` (two web servers), `playwright/batch-selection.spec.ts`

Dev dependencies to add: `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`; Playwright Chromium browser download (`pnpm exec playwright install chromium`).

### APIs Involved

| Call | When |
|------|------|
| `GET /api/station` (new) | App start — station name, operator chip |
| `GET /api/batches` | Screen 1 load and Retry |
| `GET /api/batches/:batchId` → `GET /api/batches/:batchId/recipe` | Selection (in this order; recipe only if eligible) |
| `GET /api/scanner/events?since=N` | Every 500 ms on Screen 1 |

### Dependencies

- Bolt 004 ✅ (shared `checkEligibility`, `classifyScan`), bolt 001 ✅ (Dummy OrgaTEX), bolt 002 ✅ (scanner feed).
- Session start (bolt 006) is not yet available: selecting a batch opens the placeholder weigh view without creating a session; the `WEIGHING` overlay for an open session arrives with bolt 006/007.

### Technical Approach

- **State**: a small reducer in `App` (`view: queue | weigh`, `selection`); no router — navigation follows state as in the prototype's real flow.
- **No hard-coded scenario data** in `src/client` (Rule 5), enforced by a static test that scans client sources for seed values (batch ids, orders, machines, dyestuff names, operator name).
- **Quantities** shown on the placeholder use a shared formatter from integer mg (g 1 dp / kg 3 dp); full formatting rules arrive with bolt 006.
- **Accessibility/usability**: queue rows are buttons (keyboard + touch), ≥ 60 px; scan beam animation off under `prefers-reduced-motion`.
- **Re-implementation, not copy**: layout and tokens follow the prototype; no prototype JavaScript reused (workbook Step 20 rule).

### Decisions Needing Your OK (Rule 2)

1. **`GET /api/station`** as the source of station name and operator chip (TD-6 operator from the training seed). Operators move to the weighing-station tables in bolt 006; the endpoint contract stays.
2. **Status strip shows only `EN` + clock** until bolt 012 wires real device/OrgaTEX status (FR-28) — rather than static "READY" dots that would be fake data.
3. **Queue rows ≥ 60 px high** (prototype rows are ~45 px) to meet NFR-3's 15 mm gloved-touch target; otherwise layout follows the prototype.
4. **Selection does not call `/api/station/batch-selection`**: the browser makes exactly the two Step 19 reads; server-side enforcement happens at session start (bolt 006).

### Acceptance Criteria

- [ ] App shows the HMI frame with `WeighingMS · STATION 01` and `Operator R. Karim · Shift A` from `GET /api/station`
- [ ] Screen 1 lists the 4 batches from `GET /api/batches` with prototype columns/values and status tags; "Queue received from OrgaTEX at HH:MM"
- [ ] Touching B-24187 issues `GET /api/batches/B-24187` then `GET /api/batches/B-24187/recipe` and opens the weigh view; crumb shows `BATCH B-24187 · ORDER SO-9931 · MACHINE JET-04`
- [ ] Touching B-24188 shows "Batch B-24188 not released by OrgaTEX (status QUEUED)", stays on Screen 1, no recipe request
- [ ] Scanning `B-24187` (Dummy scanner inject **or** keyboard-wedge + Enter) behaves like touching it; scanning `B-99999` → "Batch B-99999 not found"; scanning `DYE-4471` → "DYE-4471 is not a batch card"
- [ ] OrgaTEX offline → "OrgaTEX unavailable" + Retry, no rows; Retry after recovery loads the queue
- [ ] Scanner offline → touch selection still works
- [ ] No scenario data in `src/client` (static test)
- [ ] Rows and keys ≥ 60 px high; operator-facing strings come from the message catalogue
- [ ] Component tests, API test and Playwright spec green; lint, format, typecheck green
- [ ] Evidence: `evidence/STEP-19-batch-screen.png` (Playwright screenshot), `evidence/STEP-19-network.txt` (recorded request sequence), Playwright report for `STEP-19-test.png`

### Out of Scope

Real Screen 2 (bolt 007), session creation/resume and WEIGHING overlay (bolt 006/007), device status indicators (bolt 012), F-keys (bolt 011).
