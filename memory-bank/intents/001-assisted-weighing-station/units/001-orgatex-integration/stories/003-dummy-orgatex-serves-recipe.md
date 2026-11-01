---
id: 003-dummy-orgatex-serves-recipe
unit: 001-orgatex-integration
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00.000Z
assigned_bolt: 001-orgatex-integration
implemented: true
---

# Story: 003-dummy-orgatex-serves-recipe

**Title**: Dummy OrgaTEX serves the batch recipe

## User Story

**As a** WeighingMS station
**I want** to read the recipe and its components with targets, tolerances, lots and containers
**So that** weighing is guided by OrgaTEX's recipe, which stays read-only (BR-04)

## Requirements

- **Unit**: `001-orgatex-integration`
- **Requirements**: DB-1, brief FR-05, IR-02

## Acceptance Criteria

- [ ] **Given** the seed, **When** `GET /api/batches/B-24187/recipe` is called, **Then** 5 components are returned in sequence with code, name, colourHex, barcode, targetMg, uom, toleranceMg, displayMaxMg, lotId, containerId (container tare is WeighingMS-owned and served in bolt 006 — clarified at bolt 001 plan approval)
- [ ] **Given** the response, **When** checked against the prototype, **Then** values match: Blue RSPL DYE-1180 1240.0 g ±6.0, Red RB DYE-2204 386.0 g ±2.0, Yellow RGB DYE-4471 94.0 g ±0.5, Sodium Sulphate AUX-0101 24.000 kg ±0.120, Soda Ash AUX-0107 9.600 kg ±0.048
- [ ] **Given** the Dummy API, **When** any write method is attempted on the recipe, **Then** it is not available (405/404)

## UI/UX Impact

Feeds Screen 2 recipe rail and component header.

## API Dependencies

- `GET /api/batches/:batchId/recipe`

## Test Expectations

- API: recipe values for all 5 components
- API: unknown batch → 404

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 002-dummy-orgatex-serves-batch-queue

### Enables
- 003-batch-management/002-select-released-batch-and-load-recipe

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Batch exists but has no recipe (QUEUED seeds) | 404 RECIPE_NOT_FOUND — not reachable via UI because QUEUED batches are rejected first |

## Out of Scope

- Recipe versioning
- Dyestuff master endpoint separate from recipe
