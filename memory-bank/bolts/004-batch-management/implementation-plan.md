---
stage: plan
bolt: 004-batch-management
created: 2026-10-29T11:00:00Z
---

## Implementation Plan: batch-management

### Objective

Bring work from OrgaTEX into the station: the batch queue, the **RELEASED-only** eligibility rule (TD-1), batch-card scan recognition, and the batch + recipe a weighing session starts from — with safe behaviour when OrgaTEX is unavailable (FR-31). Enables bolt 005 (Screen 1 · Select batch, workbook Step 19) and bolt 006 (session start).

### Stories in Scope

- **001-station-batch-queue** (Must) — FR-1
- **002-select-released-batch-and-load-recipe** (Must) — FR-2, FR-3, FR-5, NFR-2, TD-1
- **003-orgatex-unavailable-on-load** (Must) — FR-31

### ⚠️ Decision Needed First: where the station reads batches from

Two approved artifacts pull in different directions:

- **Requirements FR-1 / FR-2 and workbook Step 19** require the *browser's network* to show the station reading `GET /api/batches`, then `GET /api/batches/B-24187`, then `GET /api/batches/B-24187/recipe` (evidence `STEP-19-network.png`; FR-1 AC: "Network inspection shows the rows came from `GET /api/batches`").
- **Unit brief 003 / story 003-001** describe a separate WeighingMS queue endpoint (e.g. `/api/station/queue`) that calls OrgaTEX server-side through `OrgatexPort` — then the browser would show `/api/station/...`, never `/api/batches`.

**Option A — workbook-literal (recommended)**
- The station UI reads the queue, batch and recipe from the OrgaTEX-contract endpoints (`/api/batches…`) through **one client module** (`src/client/api/orgatex.ts`, bolt 005) — the browser-side counterpart of `OrgatexPort`, so the integration is still confined to one replaceable place (IR-07), as already accepted for live weight (TD-10).
- The **eligibility rule** and **scan-code recognition** live in `src/shared` so the UI shows the refusal reason immediately and the server applies the identical rule.
- The server **enforces** eligibility where it matters: a `BatchSelectionService` (this bolt) re-reads batch + recipe through `OrgatexPort` and refuses non-released batches; session start (bolt 006) calls it, so the UI cannot be bypassed.
- Network evidence for Step 19 matches the workbook exactly. Stories 003-001 / 003-002 "API dependency" notes are amended (no `/api/station/queue`).

**Option B — station proxy**
- New WeighingMS endpoints (`GET /api/station/queue`, `POST /api/station/selection`) call OrgaTEX via `OrgatexPort`; the browser never calls `/api/batches`.
- Strictest boundary, but **FR-1 / FR-2 acceptance criteria and the Step 19 network evidence must be amended** (network shows `/api/station/...`; the `/api/batches` calls appear only in server logs).

The plan below is written for **Option A**; Option B differences are listed at the end.

### What Will Change (Option A)

1. **Shared eligibility rule**: `checkEligibility(batch)` → eligible, or refusal `BATCH_NOT_RELEASED` with the exact message *"Batch B-24188 not released by OrgaTEX (status QUEUED)"*.
2. **Shared scan-code recognition**: `classifyScan(code)` → `BATCH` (`B-nnnnn`), `DYESTUFF` (`DYE-nnnn` / `AUX-nnnn`) or `UNKNOWN`, used by Screen 1 (batch cards) and later Screen 2 (identity, FR-7).
3. **Server `BatchSelectionService`** (`BatchesModule`): `prepareForWeighing(batchId)` → batch + recipe via `OrgatexPort`, enforcing eligibility; maps errors to `409 BATCH_NOT_RELEASED`, `404 BATCH_NOT_FOUND` / `RECIPE_NOT_FOUND`, `503 ORGATEX_UNAVAILABLE`.
4. **Server endpoint** `POST /api/station/batch-selection` `{ code }` — the same check over HTTP for a scanned or touched code (returns `{ batch, recipe }`); lets bolt 005 verify a selection server-side and gives FR-3 an enforceable API.
5. **Shared station contracts** for the selection response.

### Deliverables (files)

- `src/shared/batches/eligibility.ts` — eligibility rule and refusal message
- `src/shared/batches/scan-code.ts` — scan classification
- `src/shared/contracts/station.ts` — `BatchSelection` (`{ batch, recipe }`)
- `src/server/batches/batch-selection.service.ts`
- `src/server/batches/batch-selection.controller.ts` — `POST /api/station/batch-selection`
- `src/server/batches/batches.module.ts` (exports the service for bolt 006); `app.module.ts` import
- Tests: `tests/shared/eligibility.test.ts`, `tests/shared/scan-code.test.ts`, `tests/server/batches/batch-selection.service.test.ts`, `tests/server/batches/batch-selection.api.test.ts`

### APIs Involved

| Who | Call | Purpose |
|-----|------|---------|
| Station UI (bolt 005) | `GET /api/batches` | Queue (FR-1); UI records "received at" |
| Station UI (bolt 005) | `GET /api/batches/:batchId` → `GET /api/batches/:batchId/recipe` | Selection reads, in this order (FR-2, Step 19) |
| Station UI / session start | `POST /api/station/batch-selection` `{ code }` | Server-side eligibility + recipe (FR-2, FR-3) |
| Server | `OrgatexPort.getBatch`, `getRecipe` | Only path to OrgaTEX on the server |

`POST /api/station/batch-selection` responses: `200 { batch, recipe }`; `409 BATCH_NOT_RELEASED`; `404 BATCH_NOT_FOUND`; `422 NOT_A_BATCH_CODE` (e.g. a dyestuff barcode scanned on Screen 1); `400` empty code; `503 ORGATEX_UNAVAILABLE`.

### Dependencies

- Bolt 001 ✅ (`OrgatexPort`, Dummy OrgaTEX), bolt 002 ✅ (scanner feed used by bolt 005 for batch-card scans).

### Technical Approach

- Eligibility reads `status` only: `RELEASED` → eligible; anything else → refused with status in the message. The station-side `WEIGHING` overlay for an open session is shown by the UI and handled by session resume (bolt 006).
- Selection order on the server mirrors the UI: batch first (refuse early, no recipe fetch for a refused batch), then recipe.
- Codes are trimmed; batch ids remain exact (case-sensitive, as in bolt 001).
- No database tables; batch-management is read-through.

### Acceptance Criteria

- [ ] Shared rule: RELEASED eligible; QUEUED / WEIGHED / CANCELLED refused with message *"Batch {id} not released by OrgaTEX (status {status})"*
- [ ] Scan classification: `B-24187` → BATCH; `DYE-4471`, `AUX-0101` → DYESTUFF; `hello`, `` → UNKNOWN
- [ ] `prepareForWeighing('B-24187')` returns batch + 5-component recipe in sequence, via `OrgatexPort` (batch read before recipe)
- [ ] B-24188 → `409 BATCH_NOT_RELEASED` and **no recipe request** made
- [ ] Unknown batch → `404 BATCH_NOT_FOUND` "Batch B-99999 not found"; dyestuff code on selection → `422 NOT_A_BATCH_CODE`
- [ ] OrgaTEX offline → `503 ORGATEX_UNAVAILABLE` (no cached or invented data)
- [ ] Response < 3 s (NFR-2; local target < 200 ms)
- [ ] lint, format, typecheck, tests green; coverage ≥ 80 %

### Out of Scope

Screen 1 UI, queue rendering, "received at" display, keyboard-wedge input (bolt 005); session creation and WEIGHING overlay (bolt 006).

### If Option B is chosen instead

- Add `GET /api/station/queue` (`{ receivedAt, batches }`) and make `POST /api/station/selection` the only selection path; UI never calls `/api/batches`.
- Amend FR-1 / FR-2 acceptance criteria and the Step 19 evidence description (network shows `/api/station/*`; OrgaTEX calls proven by server log and tests).
- Shared rule and scan classification unchanged.
