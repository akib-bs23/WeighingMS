---
stage: test
bolt: 005-assisted-weighing-station-ui
created: 2026-10-29T17:50:00Z
---

## Test Report: assisted-weighing-station-ui (bolt 1 of 4, workbook Step 19)

### Summary

- **Vitest**: 262/262 passed (32 files; 34 new client files in this bolt, plus 1 server file; all prior server tests still green)
- **Coverage** (src/server + src/shared + src/client): statements 97.9%, **branches 87.6%**, functions 97.4%, lines 98.4%
- **Playwright**: 3/3 passed (`playwright/batch-selection.spec.ts`), run from a cold start against freshly booted API + client servers
- **Quality gates**: `pnpm lint` ✅, `pnpm format:check` ✅, `pnpm typecheck` ✅ (4 tsconfigs: server, client, test-client, playwright)

### Test Files (new in this bolt)

- [x] `tests/server/station/station.api.test.ts` — station context returns the seeded operator; no PIN ever exposed
- [x] `tests/client/net/http.test.ts` — request() URL prefixing, ApiError mapping, non-JSON fallback, network failure
- [x] `tests/client/net/orgatex.test.ts`, `scanner.test.ts`, `station.test.ts` — each client wrapper calls the exact backend path
- [x] `tests/client/batch-selection/BatchSelectionScreen.test.tsx` — queue render with tags, empty state, batch→recipe call order on selection, refusal message with no recipe fetch, OrgaTEX-unavailable + Retry reload, keyboard-wedge scans (unknown batch, dyestuff code)
- [x] `tests/client/batch-selection/use-scan-input.test.tsx` — scanner feed ignores pre-existing events on open, delivers new ones (`since` tracked), silent on scanner failure, stops polling when inactive
- [x] `tests/client/App.test.tsx` — brand/operator chip from the station API, full-screen error when station context fails, batch crumb appears only after selection and clears on Back
- [x] `tests/client/no-hardcoded-data.test.ts` — scans every `src/client` file for seed values (batch ids, orders, machines, dyestuff names, operator); all clean
- [x] `tests/shared/format-quantity.test.ts` — g/kg display formatting incl. zero and negative
- [x] `playwright/batch-selection.spec.ts` — full-stack: queue from the real API, select B-24187 (network order asserted), refuse B-24188, OrgaTEX-unavailable + Retry

### Acceptance Criteria Validation

- ✅ **HMI frame with `WeighingMS · STATION 01` and `Operator R. Karim · Shift A` from `GET /api/station`**: App test, Playwright
- ✅ **Screen 1 lists 4 batches with prototype columns/values and status tags; "Queue received from OrgaTEX at HH:MM"**: BatchSelectionScreen test, Playwright screenshot (`evidence/STEP-19-batch-screen.png`)
- ✅ **Touching B-24187 → `GET /batches/B-24187` then `/recipe`, opens weigh view, crumb shows batch/order/machine**: component test (call order) + Playwright (`evidence/STEP-19-network.txt`, network order asserted)
- ✅ **Touching B-24188 → refusal message, stays on Screen 1, no recipe request**: component test (recipe spy not called) + Playwright
- ✅ **Scan (keyboard-wedge or Dummy feed) behaves like touch; unknown batch and dyestuff-code scans show the right messages**: component test (keyboard-wedge) + dedicated `use-scan-input` tests (feed sequencing)
- ✅ **OrgaTEX offline → error + Retry, no rows; Retry after recovery loads the queue**: component test + Playwright
- ✅ **Scanner offline → touch still works**: `use-scan-input` test ("does nothing while unavailable")
- ✅ **No scenario data in `src/client`**: static test, all files clean
- ✅ **Rows/keys ≥ 60 px high; strings from the message catalogue**: `station.css` `min-height: 60px`; all UI text sourced from `i18n/messages.ts`
- ✅ **Tests green; lint/format/typecheck green**: see Summary
- ✅ **Evidence**: `evidence/STEP-19-batch-screen.png`, `evidence/STEP-19-network.txt`, `playwright/report/index.html` (for `STEP-19-test.png`)

Story acceptance criteria covered: 006-001 (shell, API client, operator chip, NFR-14 message catalogue) and 006-002 (queue, selection, refusal, 404/503, scanner fallback).

### Issues Found and Fixed

1. **react-hooks v7 stricter rules** (`set-state-in-effect`, `refs`, `no-confusing-void-expression`): fixed by separating the queue hook's mount-fetch from its Retry path, moving the scan-input ref assignment into an effect, and adding braces to arrow-function event handlers.
2. **`getByText` only matches an element's own text**, not an adjacent bare text node: the operator's shift text needed its own `<span>` to be queryable; fixed in `TopBar.tsx`.
3. **Test fixture collision**: two mock batches shared an `orderRef`, causing a false "multiple elements" failure; gave the QUEUED fixture a distinct order.
4. **`<table>` nested inside `<button>` is invalid HTML**: replaced the planned real `<table>` queue with an ARIA `role="table"`/`"row"`/`"cell"` grid so each row can be one clickable button.
5. **`environmentMatchGlobs` does not exist in this Vitest version**: switched to a `// @vitest-environment jsdom` directive on each client test file; the default stays `node` for server/shared tests.
6. **Critical: Vite module URLs collided with the API proxy.** `src/client/api/*.ts` was served by Vite at `/api/*.ts` (root = `src/client`), which matched the `/api` proxy prefix meant for the backend — every one of the UI's own module imports (`http.ts`, `orgatex.ts`, `scanner.ts`, `station.ts`) 404'd through the proxy, so the app silently failed to mount in a real browser (invisible to Vitest's mocked-fetch tests). **Fixed by renaming the client folder to `src/client/net/`** (and `tests/client/net/` to match) — the backend's real `/api/...` paths are untouched, since those are string literals inside `http.ts`, not file-system paths. Found via a temporary Playwright diagnostic script that captured console/network errors in the headless browser; removed after the fix.
7. **Playwright `webServer` only waited on the Vite client (:5173)**, which starts before Nest finishes booting (:3000) — the first test's API reset call could race a server that wasn't listening yet. Fixed by splitting into two `webServer` entries, one per port, each with its own readiness URL.
8. **Playwright spec matched requests by the backend's own origin**, but browser requests go to the Vite origin and are proxied — the network-order assertion always saw an empty list. Fixed by matching on `URL(...).pathname` instead.

### Notes

- `evidence/STEP-18-api-tests.txt` is unaffected by this bolt (no new Dummy endpoints); Step 19 evidence is new.
- The full fresh-start Playwright run (killed all dev servers, `pnpm exec playwright test`) passed 3/3 in ~14 s including both servers booting.
