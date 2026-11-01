---
stage: implement
bolt: 003-orgatex-integration
created: 2026-10-29T10:52:00Z
---

## Implementation Walkthrough: orgatex-integration (bolt 2 of 2)

### Summary

The Dummy OrgaTEX now accepts actual consumption for a batch: the request is validated against the batch's recipe, stored with its lines, and made idempotent by the `Idempotency-Key` header, with one consumption allowed per batch. On the WeighingMS side a write-back service posts a completed session's consumption through `OrgatexPort`, records `PENDING` or `CONFIRMED`, and offers a manual retry that re-sends the identical request so it can never double-post.

### Structure Overview

Consumption reception extends the existing Dummy OrgaTEX service, controller and training controller, with its own request DTO and two Dummy tables. `OrgatexPort` gains `postConsumption`. The write-back lives in `integrations/orgatex/write-back` (service + controller) with a WeighingMS-owned `write_backs` table; it is exported from the OrgaTEX module for session completion (bolt 009) to call. Both the Dummy consumption store and the write-backs are cleared by training reset.

### Completed Work

- [x] `src/shared/contracts/orgatex.ts` - consumption line/request/receipt, stored consumption, weighing result types
- [x] `src/shared/contracts/write-back.ts` - write-back status and state
- [x] `src/server/database/schema/orgatex.ts` - Dummy consumption header and line tables (batch and key unique)
- [x] `src/server/database/schema/write-backs.ts`, `schema/index.ts` - write-back table
- [x] `src/server/database/migrations/0002_consumption_write_back.sql` (+ meta) - generated migration
- [x] `src/server/integrations/orgatex/dummy/consumption.dto.ts` - request validation incl. nested lines
- [x] `src/server/integrations/orgatex/dummy/dummy-orgatex.service.ts` - receive (recipe check, idempotency, one per batch), list stored consumption, reset clears consumption
- [x] `src/server/integrations/orgatex/dummy/dummy-orgatex.controller.ts` - `POST /api/batches/:batchId/consumption` with required `Idempotency-Key`
- [x] `src/server/integrations/orgatex/dummy/orgatex-training.controller.ts` - `GET /api/training/orgatex/consumption?batchId=`
- [x] `src/server/integrations/orgatex/orgatex.port.ts` - `postConsumption`; wording now "talks to" OrgaTEX
- [x] `src/server/integrations/orgatex/dummy/dummy-orgatex.adapter.ts` - `postConsumption` via the Dummy
- [x] `src/server/integrations/orgatex/write-back/write-back.service.ts` - submit, retry, get; PENDING/CONFIRMED transitions; reset hook
- [x] `src/server/integrations/orgatex/write-back/write-back.controller.ts` - `GET /api/sessions/:sessionId/write-back`, `POST .../retry`
- [x] `src/server/integrations/orgatex/orgatex.module.ts` - registers and exports `WriteBackService`

### Key Decisions

- **Idempotency key in `Idempotency-Key` header** (approved); missing or blank key → `400`.
- **Payload hash** (SHA-256 of a canonical form) stored with the key: same key + same payload returns the original receipt, different payload → `409 IDEMPOTENCY_CONFLICT`.
- **One consumption per batch** (approved): different key for a posted batch → `409 CONSUMPTION_ALREADY_POSTED`.
- **Recipe check** returns all problems at once in `422 CONSUMPTION_MISMATCH` details (unknown, duplicate or missing component; dyestuff, lot or unit mismatch).
- **Write-back stores the exact request** and uses the session id as key, so retries are byte-for-byte the same posting.
- **Only `ORGATEX_UNAVAILABLE` is treated as an outage** (warning); other rejections stay `PENDING` with the code in `lastError` and are logged as errors for manual attention.
- **`submit` is repeat-safe**: a second call for the same session behaves like retry.
- **No batch status change** on receipt (approved; IR-06 out of scope).

### Deviations from Plan

- None in scope. The inspection endpoint is available even while the Dummy is "offline" (it inspects training data, it is not part of the OrgaTEX contract).

### Dependencies Added

None (Node `crypto` only).

### Developer Notes

- Example: `curl -X POST -H 'content-type: application/json' -H 'Idempotency-Key: K1' -d @consumption.json localhost:3000/api/batches/B-24187/consumption`.
- Live check: first post 200, repeat with K1 → same consumptionId, K2 → 409 already posted, no key → 400; stored record has 5 lines.
- The write-back endpoints return `404 WRITE_BACK_NOT_FOUND` until session completion (bolt 009) creates write-backs.
