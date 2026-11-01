---
stage: plan
bolt: 003-orgatex-integration
created: 2026-10-29T10:48:00Z
---

## Implementation Plan: orgatex-integration (bolt 2 of 2)

### Objective

Complete the OrgaTEX integration: the **Dummy OrgaTEX consumption receiver** (`POST /api/batches/:batchId/consumption`, idempotent) and the WeighingMS **write-back service** that posts a completed session's actual consumption through `OrgatexPort`, tracks `PENDING` / `CONFIRMED`, and supports a manual **Retry** that never double-posts. Session completion itself (the trigger) arrives in bolt 009; this bolt delivers the service it will call.

### Stories in Scope

- **004-dummy-orgatex-receives-consumption** (Must) — DB-2, NFR-10
- **005-write-back-consumption-on-completion** (Must) — FR-24, TD-8, NFR-10

Workbook: completes the Dummy OrgaTEX set of **Step 16**; provides the backend for **Step 26** (write-back request, 200 response, stored record).

### What Will Change

1. **Dummy OrgaTEX consumption store**: two new Dummy tables (consumption header + lines), cleared by the existing `dummy-orgatex` reset hook.
2. **Consumption receiver** on the Dummy OrgaTEX controller, with validation against the batch's recipe and idempotency by key.
3. **Training inspection** endpoint to show stored consumption records (Step 26 "stored data" evidence).
4. **`OrgatexPort.postConsumption`** added to the port and Dummy adapter.
5. **Write-back service** (WeighingMS-owned) with its own table and two HTTP endpoints for status and retry; registered with the reset registry.
6. **Shared contracts** for consumption and write-back.

### Deliverables (files to be created / modified)

Shared
- `src/shared/contracts/orgatex.ts` — add `ConsumptionRequest`, `ConsumptionLine`, `ConsumptionReceipt`, `WeighingResult`
- `src/shared/contracts/write-back.ts` — `WriteBackStatus` (`PENDING` | `CONFIRMED`), `WriteBackState`

Server
- `src/server/database/schema/orgatex.ts` — `orgatex_consumptions`, `orgatex_consumption_lines`
- `src/server/database/schema/write-backs.ts` (+ export) — `write_backs`
- migration `0002_consumption_write_back`
- `src/server/integrations/orgatex/dummy/consumption.dto.ts` — request validation (class-validator)
- `src/server/integrations/orgatex/dummy/dummy-orgatex.service.ts` — `receiveConsumption`, `listConsumption`, reset clears consumption
- `src/server/integrations/orgatex/dummy/dummy-orgatex.controller.ts` — `POST :batchId/consumption`
- `src/server/integrations/orgatex/dummy/orgatex-training.controller.ts` — `GET /api/training/orgatex/consumption?batchId=`
- `src/server/integrations/orgatex/orgatex.port.ts`, `dummy/dummy-orgatex.adapter.ts` — `postConsumption`
- `src/server/integrations/orgatex/write-back/write-back.service.ts` — submit, retry, get; status transitions
- `src/server/integrations/orgatex/write-back/write-back.controller.ts` — status + retry endpoints
- `src/server/integrations/orgatex/orgatex.module.ts` — register and export `WriteBackService`

Tests
- `tests/server/integrations/orgatex/consumption.api.test.ts`
- `tests/server/integrations/orgatex/write-back.service.test.ts`
- `tests/server/integrations/orgatex/write-back.api.test.ts`
- `tests/server/integrations/orgatex/dummy-orgatex.adapter.test.ts` — extend for `postConsumption`

### APIs Involved

**Dummy OrgaTEX** (training contract — no claim about the real OrgaTEX interface, OQ-02):

`POST /api/batches/:batchId/consumption`
- Header `Idempotency-Key: <string>` (required)
- Body: `{ stationId, operatorId, completedAt, lines: [{ componentId, dyestuffCode, lotId, targetMg, actualMg, uom, scaleId, result }] }` — `result` is `IN_TOLERANCE` | `OVERRIDDEN`; quantities integer mg
- `200` `{ consumptionId, batchId, idempotencyKey, confirmedAt, lineCount }`

| Case | Response |
|------|----------|
| Same key, same payload (retry) | `200` with the **original** `consumptionId` / `confirmedAt`; still one record |
| Same key, different payload | `409 IDEMPOTENCY_CONFLICT`; original kept |
| Different key for a batch already posted | `409 CONSUMPTION_ALREADY_POSTED` (see decision 2) |
| Missing key / invalid body | `400 VALIDATION_FAILED` |
| Lines not matching the batch recipe (unknown, duplicate or missing component; dyestuff/lot mismatch) | `422 CONSUMPTION_MISMATCH` |
| Unknown batch | `404 BATCH_NOT_FOUND` |
| OrgaTEX offline | `503 ORGATEX_UNAVAILABLE` |

Training inspection: `GET /api/training/orgatex/consumption?batchId=B-24187` → stored records with lines.

**WeighingMS write-back** (internal application API):

| Method | Path | Result |
|--------|------|--------|
| GET | `/api/sessions/:sessionId/write-back` | `{ sessionId, batchId, status, confirmedAt, consumptionId, attempts, lastError }` or `404 WRITE_BACK_NOT_FOUND` |
| POST | `/api/sessions/:sessionId/write-back/retry` | re-posts if `PENDING`; no-op if `CONFIRMED`; returns state |

The service method `submit(sessionId, batchId, request)` is called in-process by session completion (bolt 009).

### Dependencies

- **Bolt 001** ✅ — Dummy OrgaTEX, `OrgatexPort`, reset registry, availability toggle.
- No new packages (Node `crypto` for payload hashing).

### Technical Approach

- **Idempotency** at the receiver: store `idempotencyKey` (unique) and a SHA-256 hash of the canonical request; same key + same hash → return original receipt; same key + different hash → 409.
- **Write-back key = sessionId** (as specified in story 005). The full request is stored with the write-back so Retry re-sends exactly the same payload — this guarantees the receiver sees the same key and hash, so an ambiguous failure can never double-post.
- **Status transitions**: `submit` → `CONFIRMED` on success; `ORGATEX_UNAVAILABLE` → `PENDING` with `lastError`, `attempts` incremented; `retry` on `CONFIRMED` returns the stored state without calling OrgaTEX. Other OrgaTEX errors (409/422/404) are **not** retried automatically: status stays `PENDING` with the error code in `lastError` and the error is logged — they indicate a data problem, not an outage.
- **Recipe check** in the Dummy: each recipe component exactly once, `dyestuffCode` and `lotId` must match the recipe — mimics OrgaTEX refusing consumption for the wrong batch (BR-12 "against the correct batch").
- **Reset**: Dummy consumption tables cleared by the `dummy-orgatex` hook; `write_backs` cleared by a new `write-back` hook.

### Decisions Needing Your OK (Rule 2)

1. **Idempotency key transport**: `Idempotency-Key` HTTP header (common REST practice) rather than a body field.
2. **One consumption per batch** in the Dummy: a second posting for the same batch with a *different* key is refused with `409 CONSUMPTION_ALREADY_POSTED`. The brief does not say whether OrgaTEX accepts partial/multiple postings (OQ-02); this is the safest training assumption against double-counting.
3. **No batch status change**: receiving consumption does **not** move the Dummy batch to `WEIGHED` — status update (brief IR-06) is out of scope for this build.

### Acceptance Criteria

- [ ] Valid post with key K → `200`, receipt, one stored record with all lines (lot, target, actual, uom, scale, result, operator, completedAt)
- [ ] Same key + same payload → `200`, original receipt, still one record
- [ ] Same key + different payload → `409 IDEMPOTENCY_CONFLICT`, original kept
- [ ] Missing key / invalid body → `400`; recipe mismatch → `422`; unknown batch → `404`; offline → `503`
- [ ] Training inspection returns the stored record(s)
- [ ] `OrgatexPort.postConsumption` returns the receipt and propagates errors
- [ ] Write-back `submit` online → `CONFIRMED` with `confirmedAt` and `consumptionId`
- [ ] Write-back `submit` with OrgaTEX offline → `PENDING`, `lastError ORGATEX_UNAVAILABLE`, batch data kept
- [ ] Retry after OrgaTEX back online → `CONFIRMED`; Dummy holds exactly one record
- [ ] Retry when already `CONFIRMED` → no second post, no second record
- [ ] Status/retry endpoints return state; unknown session → `404 WRITE_BACK_NOT_FOUND`
- [ ] Reset clears consumption and write-backs
- [ ] lint, format, typecheck, tests green; coverage ≥ 80 % lines and branches

### Out of Scope (later bolts)

Deciding *when* a batch is complete and building the request from weighing records (bolt 009); Screen 3 "Written to OrgaTEX" display and Retry button (bolt 011); automatic background sync (deferred).
