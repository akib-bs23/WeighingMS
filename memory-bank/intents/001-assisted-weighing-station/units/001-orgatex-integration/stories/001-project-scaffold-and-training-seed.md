---
id: 001-project-scaffold-and-training-seed
unit: 001-orgatex-integration
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00.000Z
assigned_bolt: 001-orgatex-integration
implemented: true
---

# Story: 001-project-scaffold-and-training-seed

**Title**: Project scaffold and training seed/reset

## User Story

**As a** trainer
**I want** a runnable WeighingMS project that loads the versioned training scenario and can reset it
**So that** every demo and test starts from the same known state

## Requirements

- **Unit**: `001-orgatex-integration`
- **Requirements**: DB-8, NFR-12, NFR-13 (tooling)

## Acceptance Criteria

- [ ] **Given** a fresh clone, **When** I run `pnpm install && pnpm dev`, **Then** the NestJS API and Vite UI start and `pnpm lint`, `pnpm test`, `pnpm test:e2e` commands exist and run
- [ ] **Given** the seed file `data/seed.json`, **When** the app starts with an empty database, **Then** migrations run and the B-24187 scenario (4 batches, 5-component recipe, dyestuffs, lots, containers, scales, operator R. Karim, one supervisor) is loaded
- [ ] **Given** any changed state, **When** I call the reset endpoint (training prefix), **Then** all seeded data, Dummy device state and WeighingMS sessions return to the seed state in < 2 s
- [ ] **Given** the seed, **When** I inspect quantities, **Then** they are stored as integer milligrams

## UI/UX Impact

None directly (enables all screens). Reset is triggered from the trainer panel (006-009).

## API Dependencies

- Training reset endpoint (training prefix, e.g. `POST /api/training/reset`)

## Test Expectations

- Unit: seed loader maps g/kg seed values to integer mg
- API: reset restores seed after mutation
- Smoke: app boots, health endpoint 200

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- None (first story)

### Enables
- All other stories

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Seed file invalid | Startup fails with a clear validation error |
| Reset during open session | Session discarded; station returns to queue on next poll |

## Out of Scope

- Production database setup
- Real OrgaTEX data import
