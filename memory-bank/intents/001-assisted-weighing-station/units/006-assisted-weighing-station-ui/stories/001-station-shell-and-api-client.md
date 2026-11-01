---
id: 001-station-shell-and-api-client
unit: 006-assisted-weighing-station-ui
intent: 001-assisted-weighing-station
status: complete
priority: must
created: 2026-10-29T09:40:00.000Z
assigned_bolt: 005-assisted-weighing-station-ui
implemented: true
---

# Story: 001-station-shell-and-api-client

**Title**: Station shell, top bar and typed API client

## User Story

**As a** operator
**I want** a station screen that always shows which station, batch and operator I am working on
**So that** I never lose context (FR-4)

## Requirements

- **Unit**: `006-assisted-weighing-station-ui`
- **Requirements**: FR-4, NFR-3, NFR-14 (Could), TD-6

## Acceptance Criteria

- [ ] **Given** the app, **When** loaded, **Then** the dark HMI frame shows top bar `WeighingMS · STATION 01` and operator chip `Operator R. Karim · Shift A`
- [ ] **Given** an open session for B-24187, **When** on any screen, **Then** the crumb shows `BATCH B-24187 · ORDER SO-9931 · MACHINE JET-04`
- [ ] **Given** the client code, **When** inspected, **Then** all network calls go through `src/client/api/` typed against `src/shared` contracts
- [ ] **Given** navigation, **When** state changes, **Then** screens switch by state (queue → weigh → done), with no free screen switcher
- [ ] **Given** operator-facing text, **When** inspected, **Then** strings come from one English message catalogue (NFR-14, Could)

## UI/UX Impact

Station frame per prototype tokens (colours, mono tabular numerals).

## API Dependencies

- Session/operator endpoints (004)

## Test Expectations

- Component: top bar renders from API data
- Static: no `fetch` outside `client/api`

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 001-orgatex-integration/001-project-scaffold-and-training-seed

### Enables
- All other UI stories

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| API unreachable at load | Full-screen "Station service unavailable — Retry" |

## Out of Scope

- Question pins, demo switcher
