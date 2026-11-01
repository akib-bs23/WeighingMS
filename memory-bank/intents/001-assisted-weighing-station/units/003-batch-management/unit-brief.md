---
unit: 003-batch-management
intent: 001-assisted-weighing-station
phase: inception
status: complete
unit_type: backend
default_bolt_type: simple-construction-bolt
created: 2026-10-29T09:24:35.000Z
updated: 2026-10-29T09:34:26.000Z
---

# Unit Brief: Batch Management

## Purpose

Bring work from OrgaTEX into the station: present the batch queue, decide which batches may be weighed (RELEASED only, TD-1), route batch-card scans, and provide the batch context and recipe that a weighing session starts from — degrading safely when OrgaTEX is unavailable.

## Scope

### In Scope
- WeighingMS batch API over `OrgatexPort`: queue (with fetch time), batch detail, recipe
- Eligibility rule and selection validation (`BATCH_NOT_RELEASED`, `BATCH_NOT_FOUND`)
- Batch-card scan → same selection path as touch
- OrgaTEX-unavailable mapping (`503 ORGATEX_UNAVAILABLE`) with no stale/invented data
- Recipe → session-ready view (components in sequence, unit, scale-relevant fields)

### Out of Scope
- Starting/holding the weighing session (004)
- Rendering the queue (006)

---

## Assigned Requirements

| Req | Requirement | Priority |
|-----|-------------|----------|
| FR-1 | Display batch queue from OrgaTEX (data + fetch time) | Must |
| FR-2 | Select batch by touch or scan (validation + batch/recipe retrieval) | Must |
| FR-3 | Reject non-released batches with reason | Must |
| FR-5 | Load recipe (read-only, sequence order) | Must |
| FR-31 | OrgaTEX unavailable on load → error + Retry | Must |
| NFR-2 | Selection → recipe ≤ 3 s | Must |

---

## Domain Concepts

### Key Entities
| Entity | Description | Attributes |
|--------|-------------|------------|
| QueueEntry | Batch as shown in queue | batchId, order, machine, fabric, fabricWeightKg, shade, componentCount, status |
| BatchSelection | Result of a select attempt | batchId, eligible, reason |
| RecipeView | Recipe for weighing | batchId, shade, components[] in sequence |

### Key Operations
| Operation | Description | Inputs | Outputs |
|-----------|-------------|--------|---------|
| getQueue | Queue + receivedAt | — | QueueEntry[], receivedAt |
| selectBatch | Validate eligibility | batchId (touch or scan) | BatchSelection / 404 / 409 |
| getRecipe | Recipe for session | batchId | RecipeView |

---

## Story Summary

- **Total Stories**: 3
- **Must Have**: 3
- **Should Have**: 0
- **Could Have**: 0

### Stories

- [ ] **001-station-batch-queue**: Station batch queue - Must - Planned
- [ ] **002-select-released-batch-and-load-recipe**: Select a released batch and load its recipe - Must - Planned
- [ ] **003-orgatex-unavailable-on-load**: OrgaTEX unavailable when loading work - Must - Planned

---

## Dependencies

### Depends On
| Unit | Reason |
|------|--------|
| 001-orgatex-integration | `OrgatexPort` |

### Depended By
| Unit | Reason |
|------|--------|
| 004-weighing-station | Recipe snapshot at session start |
| 006-assisted-weighing-station-ui | Screen 1 |

### External Dependencies
| System | Purpose | Risk |
|--------|---------|------|
| OrgaTEX via port | Queue and recipe | Low (Dummy) |

---

## Technical Context

### Suggested Technology
NestJS `BatchesModule`; no own tables (read-through to port).

### Integration Points
| Integration | Type | Protocol |
|-------------|------|----------|
| 001 | In-process | `OrgatexPort` |
| 006 | API | REST/JSON |

---

## Constraints

- Only RELEASED batches selectable (TD-1); WEIGHING overlay is computed by the UI from the open session.

---

## Success Criteria

### Functional
- [ ] Queue lists the 4 seed batches; B-24187 selectable; B-24188 → "not released (status QUEUED)"
- [ ] Unknown code → "not found"; OrgaTEX offline → 503 mapped error

### Non-Functional
- [ ] Recipe returned < 3 s (local: < 200 ms)

### Quality
- [ ] API tests incl. 404/409/503; coverage > 80%

---

## Bolt Suggestions

| Bolt | Type | Focus |
|------|------|-------|
| bolt 1 | Simple | Queue, selection rule, recipe, error mapping |
