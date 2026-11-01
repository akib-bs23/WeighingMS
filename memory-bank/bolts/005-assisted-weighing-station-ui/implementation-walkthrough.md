---
stage: implement
bolt: 005-assisted-weighing-station-ui
created: 2026-10-29T17:40:00Z
---

## Implementation Walkthrough: assisted-weighing-station-ui (bolt 1 of 4, workbook Step 19)

### Summary

The station now has a real React shell and a working **Screen 1 · Select batch**, fed entirely by the API. The operator sees the HMI frame, top bar with the operator chip, the batch queue from OrgaTEX, and can select a batch by touch or by a batch-card scan (Dummy scanner feed or keyboard-wedge); a non-released batch is refused with the reason, and an OrgaTEX outage shows an error with Retry. Selecting a batch opens a placeholder weigh view (real Screen 2 is bolt 007) showing the batch's recipe, proving the whole selection pipeline reaches the right data.

### Structure Overview

The server gained one small `StationModule` exposing the training operator and station name. The client is organised as `net/` (the only place that calls `fetch`, one module per backend concern), `components/` (frame, top bar, status strip, a shared `Key` button), `features/batch-selection/` (the queue hook, the selection hook, the table and the screen), `features/scan/` (one hook combining the Dummy scanner feed and keyboard-wedge input), and `features/weighing/` (the placeholder). `i18n/messages.ts` holds every operator-facing string, and `styles/station.css` carries the prototype's dark HMI tokens, rebuilt as a CSS grid rather than a real `<table>`.

### Completed Work

- [x] `src/server/station/station.controller.ts`, `station.module.ts` — `GET /api/station`: station id/name + the seeded training operator, PIN never exposed
- [x] `src/shared/contracts/station.ts` — added `StationOperator`, `StationContext`
- [x] `src/shared/quantity/format-quantity.ts` — integer-mg → display string (g 1dp / kg 3dp), used by the weigh placeholder
- [x] `src/client/net/http.ts` — the one `fetch` wrapper; maps the standard error body to `ApiError`, falls back to HTTP status for non-JSON errors, wraps network failures as `NETWORK_ERROR`
- [x] `src/client/net/orgatex.ts`, `scanner.ts`, `station.ts` — thin typed wrappers over `http.ts` for each backend concern
- [x] `src/client/i18n/messages.ts` — every operator-facing string (NFR-14)
- [x] `src/client/styles/station.css` — station frame, top bar, scan prompt, queue grid, banners, keys (≥ 60 px)
- [x] `src/client/components/StationFrame.tsx`, `TopBar.tsx`, `StatusStrip.tsx`, `Key.tsx` — device bezel/screen, brand/crumb/operator chip, EN + live clock (no fake device dots — real status arrives in bolt 012), shared action-key button
- [x] `src/client/features/scan/use-scan-input.ts` — merges Dummy scanner feed (polled 500 ms, only events after the screen opened) and keyboard-wedge input (typed + Enter, ignored in text fields)
- [x] `src/client/features/batch-selection/use-batch-queue.ts` — loads `GET /api/batches`, records the "received at" time, exposes Retry
- [x] `src/client/features/batch-selection/use-batch-selection.ts` — classifies the code, reads the batch, applies `checkEligibility`, only then reads the recipe (the two-call sequence Step 19 asks for)
- [x] `src/client/features/batch-selection/QueueTable.tsx` — accessible grid (`role="table"/"row"/"cell"`) so each row is one clickable `<button>`
- [x] `src/client/features/batch-selection/BatchSelectionScreen.tsx` — Screen 1: scan prompt, queue, refusal/error banners, empty state
- [x] `src/client/features/weighing/WeighPlaceholder.tsx` — shows the selected batch's recipe; "Back to queue"
- [x] `src/client/App.tsx` — station-context load, full-screen error if it fails, state-driven navigation between queue and weigh (no router)
- [x] `src/client/main.tsx` — imports the station stylesheet
- [x] Test tooling: `vitest.config.mts` split (SWC scoped to server/shared, React plugin + jsdom directive for client), `tsconfig.test.client.json`, `tsconfig.playwright.json`, `tests/client/setup.ts`, two-entry `playwright.config.ts` web servers

### Key Decisions

- **`GET /api/station`** supplies the operator chip (approved decision 1) — no sign-in screen, per TD-6.
- **Status strip shows only `EN` + a live clock** (approved decision 2); device/OrgaTEX indicators wait for bolt 012's real data rather than showing invented "READY" dots.
- **Queue rows and keys are ≥ 60 px high** (approved decision 3), slightly taller than the prototype, for gloved hands (NFR-3).
- **Selection never calls `/api/station/batch-selection`** (approved decision 4); the browser makes exactly the two Step 19 reads, and the server's independent enforcement is exercised from bolt 006 onward (session start).
- **Queue rendered as an ARIA grid, not a real `<table>`**: a `<button>` cannot legally contain table markup, so each row is one button with `role="row"`/`"cell"` children, styled with CSS grid.
- **One quantity formatter in `src/shared`**, reused later by the live weigh screen, so g/kg display rules are defined once.

### Deviations from Plan

- **`src/client/api/` renamed to `src/client/net/`** (and the mirrored test folder). Vite serves `src/client/api/*.ts` at the URL `/api/*.ts` (client root = `src/client`), which collided with the dev-server proxy's `/api` prefix for the real backend — every one of the UI's own module imports was being intercepted by the proxy and 404'd, so the app failed to mount in a real browser. This was invisible to the Vitest suite (fetch is mocked there) and only surfaced under Playwright; found with a temporary diagnostic script capturing browser console/network errors, removed once fixed. The backend's own `/api/...` paths are untouched — those are string literals inside `net/http.ts`, not file-system paths.
- **`playwright.config.ts` webServer split into two entries** (API on :3000, client on :5173), each with its own readiness URL, instead of one combined `pnpm dev` check — the single check only waited on Vite, which starts before Nest finishes booting, so the first test's API call could race a server that wasn't listening yet.
- Two extra shared/helper files not in the original file list: `src/client/components/Key.tsx` (planned) is now actually used by every action button rather than left unused; no new files beyond what was planned otherwise.

### Dependencies Added

- [x] `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` — client test tooling
- [x] Playwright Chromium browser binary (`pnpm exec playwright install chromium`)

### Developer Notes

- `pnpm dev` starts both servers; `pnpm exec playwright test` boots its own pair via the two `webServer` entries.
- The scan feed hook discards events already in the queue when a screen opens (`since = lastSeq` on the first poll), so stale scans from before the screen was shown are never delivered.
- `GET /api/station` currently returns the first seeded `OPERATOR`; a supervisor PIN is never included in this response (checked by a dedicated test).
