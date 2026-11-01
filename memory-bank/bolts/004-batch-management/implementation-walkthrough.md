---
stage: implement
bolt: 004-batch-management
created: 2026-10-29T11:04:00Z
---

## Implementation Walkthrough: batch-management

### Summary

The station now has one rule for which batches may be weighed (RELEASED only) and one way to recognise scanned codes, both shared between UI and server. A server-side batch selection service reads the batch and then its recipe through `OrgatexPort`, refusing non-released batches before any recipe is requested; it is exposed as `POST /api/station/batch-selection` and exported for session start. Per the approved Option A, the station UI will read the queue, batch and recipe from the OrgaTEX-contract endpoints itself (bolt 005), so the browser network matches workbook Step 19.

### Structure Overview

Pure rules live in `src/shared/batches` (no framework imports) so the React UI and NestJS use identical logic. The server part is a small `BatchesModule` under `src/server/batches` that depends only on `OrgatexPort` from the OrgaTEX module; it owns no tables (read-through).

### Completed Work

- [x] `src/shared/batches/eligibility.ts` - RELEASED-only rule with the operator-facing refusal message
- [x] `src/shared/batches/scan-code.ts` - classifies a scan as batch card, dyestuff barcode or unknown
- [x] `src/shared/contracts/station.ts` - `BatchSelection` (batch + recipe)
- [x] `src/server/batches/batch-selection.service.ts` - select by code, prepare a batch for weighing (batch → eligibility → recipe)
- [x] `src/server/batches/batch-selection.controller.ts` - `POST /api/station/batch-selection`
- [x] `src/server/batches/batches.module.ts` - module, exports the service for session start
- [x] `src/server/app.module.ts` - imports `BatchesModule`
- [x] Stories `003-batch-management/001` and `002` - API-dependency notes amended for Option A

### Key Decisions

- **Option A (approved)**: browser reads `/api/batches…` through one client module (bolt 005); the server enforces eligibility independently through `OrgatexPort`.
- **Refuse before fetching the recipe**: a non-released batch never triggers a recipe read.
- **Scanned dyestuff code on selection** → `422 NOT_A_BATCH_CODE` (distinguishes a wrong scan from an unknown batch).
- **Error details** include `batchId` and `status` so the UI can render the reason without parsing text.

### Deviations from Plan

None.

### Dependencies Added

None.

### Developer Notes

- Live check: B-24187 → 200 with 5 components (~2 ms); B-24188 → 409 "Batch B-24188 not released by OrgaTEX (status QUEUED)"; B-99999 → 404; DYE-4471 → 422; blank → 400; OrgaTEX offline → 503.
- Session start (bolt 006) should call `BatchSelectionService.prepareForWeighing`.
