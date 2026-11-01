---
unit: 001-orgatex-integration
intent: 001-assisted-weighing-station
phase: inception
status: complete
unit_type: backend
default_bolt_type: simple-construction-bolt
created: 2026-10-29T09:24:35.000Z
updated: 2026-10-29T09:34:26.000Z
---

# Unit Brief: OrgaTEX Integration

## Purpose

Own every interaction with OrgaTEX. Provide the `OrgatexPort` used by WeighingMS, a **Dummy OrgaTEX** that serves the training batch queue and recipes and receives consumption, the **consumption write-back service** (idempotent, PENDING/Retry), and the versioned **training seed + reset** mechanism. Also carries the project scaffold as its first bolt (first construction target, workbook Step 16).

## Scope

### In Scope
- Project scaffold: pnpm, NestJS + Vite, TypeScript strict, Drizzle + SQLite, Vitest, Playwright, lint/format (per standards)
- Dummy OrgaTEX endpoints: `GET /api/batches`, `GET /api/batches/:batchId`, `GET /api/batches/:batchId/recipe`, `POST /api/batches/:batchId/consumption`
- Dummy OrgaTEX availability toggle (simulator) → `503 ORGATEX_UNAVAILABLE`
- Consumption store in Dummy OrgaTEX with idempotency key
- `OrgatexPort` interface + Dummy adapter (Nest DI binding)
- Write-back service: post consumption for a completed session, track status `PENDING | CONFIRMED`, manual retry
- Seed JSON (training scenario B-24187 etc.) and reset orchestration; each unit contributes its own seed slice

### Out of Scope
- Batch eligibility / selection rules (003)
- Deciding *when* a batch is complete (004 triggers write-back)
- Real OrgaTEX/SETEX contract (OQ-01, OQ-02 — unknown)
- OrgaTEX batch status update (brief IR-06) and offline sync engine (deferred)

---

## Assigned Requirements

| Req | Requirement | Priority |
|-----|-------------|----------|
| FR-24 | Post consumption to OrgaTEX; CONFIRMED / PENDING + Retry; idempotent | Must |
| DB-1 | Dummy OrgaTEX serves queue, batch, recipe | Must |
| DB-2 | Dummy OrgaTEX accepts and stores consumption, honours idempotency key | Must |
| DB-7 | Dummy OrgaTEX can be made unavailable (503) | Must |
| DB-8 | Versioned seed reproduces prototype scenario; reset restores it | Must |
| NFR-10 | Idempotent write-back — one stored record per key | Must |
| NFR-12 | Deterministic reset < 2 s | Must |

---

## Domain Concepts

### Key Entities
| Entity | Description | Attributes |
|--------|-------------|------------|
| OrgatexBatch | Batch as served by Dummy OrgaTEX | batchId, orderRef, machineRef, fabricDesc, fabricWeightKg, shadeCode, componentCount, status (QUEUED/RELEASED/…), recipeId |
| OrgatexRecipe / Component | Recipe and components (read-only) | recipeId, shade, components[sequence, dyestuffCode, name, colourHex, barcode, targetMg, uom, toleranceMg, displayMaxMg, lotId, containerId] |
| ConsumptionRecord | Consumption received by Dummy OrgaTEX | batchId, idempotencyKey, lines[component, lot, targetMg, actualMg, uom, scaleId, result], operatorId, completedAt, receivedAt |
| WriteBackStatus | WeighingMS-side status of a session's posting | sessionId, status PENDING/CONFIRMED, confirmedAt, lastError, attempts |

### Key Operations
| Operation | Description | Inputs | Outputs |
|-----------|-------------|--------|---------|
| listBatches | Queue for station | — | OrgatexBatch[] |
| getBatch / getRecipe | Batch detail, recipe | batchId | OrgatexBatch / OrgatexRecipe or 404 |
| postConsumption | Send consumption | batchId, payload, idempotencyKey | 200 + confirmation time / 503 |
| writeBack | Post for completed session, set status | sessionId | WriteBackStatus |
| retryWriteBack | Manual retry | sessionId | WriteBackStatus |
| setAvailability (simulator) | Toggle online/offline | online: boolean | status |
| resetScenario | Restore seed | — | ok |

---

## Story Summary

- **Total Stories**: 6
- **Must Have**: 6
- **Should Have**: 0
- **Could Have**: 0

### Stories

- [ ] **001-project-scaffold-and-training-seed**: Project scaffold and training seed/reset - Must - Planned
- [ ] **002-dummy-orgatex-serves-batch-queue**: Dummy OrgaTEX serves batch queue and batch detail - Must - Planned
- [ ] **003-dummy-orgatex-serves-recipe**: Dummy OrgaTEX serves the batch recipe - Must - Planned
- [ ] **004-dummy-orgatex-receives-consumption**: Dummy OrgaTEX receives consumption idempotently - Must - Planned
- [ ] **005-write-back-consumption-on-completion**: Write back consumption on batch completion - Must - Planned
- [ ] **006-orgatex-availability-toggle**: Toggle Dummy OrgaTEX availability - Must - Planned

---

## Dependencies

### Depends On
| Unit | Reason |
|------|--------|
| — | Foundation unit |

### Depended By
| Unit | Reason |
|------|--------|
| 003-batch-management | Reads batches/recipes via `OrgatexPort` |
| 004-weighing-station | Triggers write-back on completion |
| 002, 005 | Use scaffold and seed/reset mechanism |

### External Dependencies
| System | Purpose | Risk |
|--------|---------|------|
| OrgaTEX (real) | Replaced by Dummy | High in real product (A-01, A-02); none for training |

---

## Technical Context

### Suggested Technology
NestJS module `OrgatexModule` (Dummy controller + adapter), `TrainingModule` (seed/reset); Drizzle tables prefixed `orgatex_`; integer mg quantities.

### Integration Points
| Integration | Type | Protocol |
|-------------|------|----------|
| Dummy OrgaTEX API | API | REST/JSON (training contract) |
| 003, 004 | In-process | `OrgatexPort` (DI) |

### Data Storage
| Data | Type | Volume | Retention |
|------|------|--------|-----------|
| Batches, recipes, master data (seed) | SQLite | tens of rows | reset on demand |
| Consumption records | SQLite | one per completed batch | until reset |

---

## Constraints

- Paths exactly as workbook Step 16; contracts labelled **training only**.
- WeighingMS code accesses OrgaTEX data **only** via `OrgatexPort`.

---

## Success Criteria

### Functional
- [ ] `curl /api/batches`, `/api/batches/B-24187`, `/api/batches/B-24187/recipe` return seed data (workbook Step 18)
- [ ] Posting consumption twice with the same key stores one record
- [ ] OrgaTEX offline → 503; write-back PENDING; Retry after online → CONFIRMED

### Non-Functional
- [ ] Reset restores seed in < 2 s

### Quality
- [ ] API tests for every endpoint incl. 404/503
- [ ] Code coverage > 80%

---

## Bolt Suggestions

| Bolt | Type | Focus |
|------|------|-------|
| bolt 1 | Simple | Scaffold + seed/reset + Dummy OrgaTEX read endpoints |
| bolt 2 | Simple | Consumption receiver + idempotency + write-back service + availability toggle |

## Notes

Seed values come from the prototype (see requirements.md *Seed scenario*). Blue RSPL code is `DYE-1180` (UQ-10).
