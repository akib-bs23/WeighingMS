---
id: 001-orgatex-integration
unit: 001-orgatex-integration
intent: 001-assisted-weighing-station
type: simple-construction-bolt
status: complete
stories:
  - 001-project-scaffold-and-training-seed
  - 002-dummy-orgatex-serves-batch-queue
  - 003-dummy-orgatex-serves-recipe
  - 006-orgatex-availability-toggle
created: 2026-10-29T09:50:00.000Z
started: 2026-10-29T09:52:04.000Z
completed: "2026-10-29T10:11:50Z"
current_stage: null
stages_completed:
  - name: plan
    completed: 2026-10-29T09:53:57.000Z
    artifact: implementation-plan.md
  - name: implement
    completed: 2026-10-29T10:05:14.000Z
    artifact: implementation-walkthrough.md
  - name: test
    completed: 2026-10-29T10:11:59Z
    artifact: test-walkthrough.md
requires_bolts: []
enables_bolts:
  - 002-device-integration
  - 003-orgatex-integration
  - 004-batch-management
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 001-orgatex-integration

## Overview

Create the runnable project skeleton and the Dummy OrgaTEX read side with the training seed and reset.

## Objective

`pnpm dev` runs API + UI; `curl /api/batches`, `/api/batches/B-24187`, `/api/batches/B-24187/recipe` return the seeded training scenario; OrgaTEX can be toggled offline (503); reset restores the seed.

## Workbook Steps Covered

Steps 16, 17, 18

## Stories Included

- **001-project-scaffold-and-training-seed**: Project scaffold and training seed/reset (Must)
- **002-dummy-orgatex-serves-batch-queue**: Dummy OrgaTEX serves batch queue and batch detail (Must)
- **003-dummy-orgatex-serves-recipe**: Dummy OrgaTEX serves the batch recipe (Must)
- **006-orgatex-availability-toggle**: Toggle Dummy OrgaTEX availability (Must)

## Bolt Type

**Type**: Simple Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- ✅ **1. Plan**: Complete → implementation-plan.md
- ✅ **2. Implement**: Complete → source code + implementation-walkthrough.md
- ✅ **3. Test**: Complete → tests + test-walkthrough.md

Each stage ends at a ⛔ human validation checkpoint.

## Expected Outputs

- pnpm workspace config, NestJS app, Vite React app, shared package folder, Drizzle + SQLite, Vitest, Playwright, ESLint/Prettier
- `data/seed.json` (STEP-17 evidence) + seed loader + reset endpoint
- Dummy OrgaTEX read endpoints, `OrgatexPort` + Dummy adapter, availability toggle

## Test Expectations

- API tests: list/detail/recipe/404/503
- Unit: seed loader g/kg → mg
- Smoke: app boots
- Evidence: STEP-17 dummy data, STEP-18 curl outputs

## Dependencies

### Requires
- None

### Requires Units
- None

### Enables
- 002-device-integration
- 003-orgatex-integration
- 004-batch-management

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] Tests passing (`pnpm lint`, `pnpm test`)
- [x] Code reviewed (human checkpoint)

## Notes

- First construction target (workbook Step 16). Seed values from requirements.md *Seed scenario*.
- Dummy contracts are training-only; they make no claim about real interfaces.
