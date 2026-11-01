---
id: 007-dyestuff-identity-verification
unit: 004-weighing-station
intent: 001-assisted-weighing-station
status: complete
priority: should
created: 2026-10-29T09:40:00Z
assigned_bolt: 008-weighing-station
implemented: true
---

# Story: 007-dyestuff-identity-verification

**Title**: Dyestuff identity verification by scan

## User Story

**As a** operator
**I want** to scan the dyestuff and be warned if it is not the recipe component
**So that** the wrong dyestuff is not weighed into the batch (FR-7)

## Requirements

- **Unit**: `004-weighing-station`
- **Requirements**: FR-7, TD-5, brief BR-10

## Acceptance Criteria

- [ ] **Given** Yellow RGB active, **When** its barcode is scanned, **Then** identity = VERIFIED
- [ ] **Given** Yellow RGB active, **When** Red RB's barcode is scanned, **Then** identity = MISMATCH "Wrong dyestuff: scanned DYE-2204, expected DYE-4471" and confirm returns `409 IDENTITY_MISMATCH` even in tolerance
- [ ] **Given** a mismatch, **When** the correct code is scanned or the component is quit, **Then** the block is cleared
- [ ] **Given** no scan, **When** in tolerance, **Then** confirmation is allowed (light verification)

## UI/UX Impact

Identity indicator on component header; error banner.

## API Dependencies

- WeighingMS: `POST /api/sessions/:id/identity` (code)
- Scanner feed (002-005)

## Test Expectations

- API: verified / mismatch / cleared
- E2E: mismatch blocks OK

## Technical Notes

- Follow `memory-bank/standards/` (integer mg, typed domain errors, shared contracts).
- Dummy contracts are training-only; do not present them as real OrgaTEX/device interfaces.

## Dependencies

### Requires
- 003-activate-component-with-scale-selection-and-tare
- 002-device-integration/005-dummy-scanner-delivers-scans

### Enables
- 006-assisted-weighing-station-ui/005-weigh-actions

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Batch-card code scanned on Screen 2 | Ignored for identity; message "Not a dyestuff barcode" |

## Out of Scope

- Mandatory verification
- Lot barcode scanning
