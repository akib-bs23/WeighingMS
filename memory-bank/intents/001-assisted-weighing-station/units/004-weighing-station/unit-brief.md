---
unit: 004-weighing-station
intent: 001-assisted-weighing-station
phase: inception
status: complete
unit_type: backend
default_bolt_type: ddd-construction-bolt
created: 2026-10-29T09:24:35Z
updated: 2026-10-31T11:45:00Z
---

# Unit Brief: Weighing Station (core domain)

## Purpose

The heart of WeighingMS. A **Weighing Session** guides one operator through a batch's components: chooses the scale, applies tare, evaluates the reading against target and tolerance, allows confirmation only when valid (or by supervisor override), records **immutable, fully traceable** weighings, enforces progression and completion rules, and triggers OrgaTEX write-back. It is far more than the weigh screen: the screen (006) only renders what this domain decides.

## Scope

### In Scope
- WeighingSession aggregate: start (from 003 recipe snapshot), resume, activate component, complete
- Scale selection rule (≤ 3 000 g → precision; TD-3) and unit/precision per scale
- Tare on activation; Re-tare (via `ScalePort`)
- Component identity (code, lot, container, tare) and optional identity scan check (FR-7)
- **Shared pure rules** in `src/shared`: Quantity (integer mg), ToleranceBand (inclusive), zone (under/near/ok/over), remaining, reading validity (negative/NaN/over capacity), formatting g/kg
- Confirmation: gating + server re-validation (`422 OUT_OF_TOLERANCE`), immutable WeighingRecord with snapshots
- Supervisor override (PIN hash + mandatory reason → `OVERRIDDEN`); Quit/abandon with audit
- Overshoot detection and block; **surplus rule plugged in after workbook Step 24**
- Progression (next pending; done locked) and completion (`409 BATCH_INCOMPLETE`), summary data (all-in-tolerance, total dispensed, elapsed)
- Trigger write-back (001) on completion; expose records + audit (FR-27)
- Scale offline / invalid reading safety on server side

### Out of Scope
- Rendering (006); OrgaTEX transport and retry mechanics (001); ticket (005)
- Surplus compensation calculation until Step 24 decision
- Manual scale reselection, calibration (deferred)

---

## Assigned Requirements

| Req | Requirement | Priority |
|-----|-------------|----------|
| FR-6 | Identify active component | Must |
| FR-7 | Optional dyestuff identity verification | Should |
| FR-8 | Capture lot | Must |
| FR-9 | Identify container | Must |
| FR-10 | Apply container tare | Must |
| FR-11 | Re-tare | Must |
| FR-12 | Automatic scale selection | Must |
| FR-15 | Still-to-weigh | Must |
| FR-16 | Tolerance evaluation and zones | Must |
| FR-17 | Gate confirmation | Must |
| FR-18 | Record confirmed weighing | Must |
| FR-19 | Supervisor override | Must |
| FR-20 | Quit (abandon component) | Must |
| FR-21 | Detect and block overshoot | Must |
| FR-22 | Component progression | Must |
| FR-23 | Complete the batch | Must |
| FR-27 | Attribute every action to an identity | Must |
| FR-29 | Scale unavailable — safe failure | Must |
| FR-30 | Invalid weight reading | Must |
| NFR-6 | Session resumable after reload | Should |
| NFR-7 | Durable before acknowledge | Must |
| NFR-8 | Integer-mg arithmetic | Must |
| NFR-9 | Immutable records | Must |
| NFR-11 | PIN never exposed; hashed | Must |

---

## Domain Concepts

### Key Entities
| Entity | Description | Attributes |
|--------|-------------|------------|
| WeighingSession (aggregate root) | One batch being weighed at the station | sessionId, batchId, stationId, operatorId, recipe snapshot, status IN_PROGRESS/COMPLETED, activeComponentId, startedAt, completedAt |
| ComponentWeighing | Per-component state within session | componentId, sequence, state pending/active/done, scaleId, unit, verifiedIdentity |
| WeighingRecord | Immutable confirmed weighing | recordId, sessionId, componentId, lotId, containerId, tareMg, scaleId, targetMg, toleranceMinMg, toleranceMaxMg, actualMg, uom, result IN_TOLERANCE/OVERRIDDEN, operatorId, confirmedAt |
| Override | Supervisor authorisation | overrideId, recordId, supervisorId, reason, authorisedAt |
| AuditEvent | Privileged/abandon actions | eventId, sessionId, type OVERRIDE/ABANDON/REPRINT, actorId, detail, occurredAt |
| Operator | Identity (seed) | operatorId, name, shift, role, pinHash (supervisor) |
| Container | Container master (seed) | containerId, tareMg |
| Quantity (VO) | Integer milligrams | mg |
| ToleranceBand (VO) | [target−tol, target+tol] inclusive | minMg, maxMg |
| Zone (VO) | under / near / ok / over | — |

### Key Operations
| Operation | Description | Inputs | Outputs |
|-----------|-------------|--------|---------|
| startSession | Open or resume session for batch | batchId | session view |
| activateComponent | Make pending component active; select scale; tare | sessionId, componentId | component view |
| retare | Tare selected scale | sessionId | ok |
| verifyIdentity | Check scanned dyestuff code | sessionId, code | verified / mismatch |
| confirm | Validate + record weighing | sessionId, componentId, reading | WeighingRecord / 422 |
| override | Supervisor-authorised confirm | sessionId, reading, supervisor PIN, reason | WeighingRecord (OVERRIDDEN) / 401/422 |
| quit | Abandon current component | sessionId | audit event |
| completeSession | Complete when all done; trigger write-back | sessionId | summary / 409 |
| getRecords / getAudit | Traceability | sessionId or batchId | records / events |

---

## Story Summary

- **Total Stories**: 13
- **Must Have**: 12
- **Should Have**: 1
- **Could Have**: 0

### Stories

- [ ] **001-start-and-resume-weighing-session**: Start and resume a weighing session - Must - Planned
- [ ] **002-shared-quantity-and-tolerance-rules**: Shared quantity, tolerance and zone rules - Must - Planned
- [ ] **003-activate-component-with-scale-selection-and-tare**: Activate a component with automatic scale selection and tare - Must - Planned
- [ ] **004-retare**: Re-tare the scale - Must - Planned
- [ ] **005-confirm-in-tolerance-weighing**: Confirm an in-tolerance weighing - Must - Planned
- [ ] **006-reading-safety-unstable-offline-invalid**: Reading safety: offline and invalid readings - Must - Planned
- [ ] **007-dyestuff-identity-verification**: Dyestuff identity verification by scan - Should - Planned
- [ ] **008-supervisor-override**: Supervisor override with PIN and reason - Must - Planned
- [ ] **009-quit-abandon-component**: Quit (abandon) the current component - Must - Planned
- [ ] **010-overshoot-detection-and-handling**: Overshoot detection and handling - Must - Planned
- [ ] **011-component-progression**: Component progression - Must - Planned
- [ ] **012-complete-batch**: Complete the batch - Must - Planned
- [ ] **013-weighing-records-and-audit-trail**: Weighing records and audit trail - Must - Planned

---

## Dependencies

### Depends On
| Unit | Reason |
|------|--------|
| 003-batch-management | Batch + recipe snapshot at session start |
| 002-device-integration | `ScalePort` for tare and server-side reading check |
| 001-orgatex-integration | Write-back service on completion |

### Depended By
| Unit | Reason |
|------|--------|
| 005-ticket-printing | Completed session data for ticket |
| 006-assisted-weighing-station-ui | Screen 2 and 3 behaviour; shared rules |

### External Dependencies
| System | Purpose | Risk |
|--------|---------|------|
| — (only via ports) | | |

---

## Technical Context

### Suggested Technology
NestJS `WeighingModule` with domain layer free of framework imports; Drizzle tables `weighing_sessions`, `weighing_records`, `overrides`, `audit_events`, `operators`, `containers`; shared rules in `src/shared` used by server and UI.

### Integration Points
| Integration | Type | Protocol |
|-------------|------|----------|
| 006 | API | REST/JSON |
| 001, 002, 003 | In-process | Ports / services |

### Data Storage
| Data | Type | Volume | Retention |
|------|------|--------|-----------|
| Sessions, records, overrides, audit | SQLite | small | until reset (training) |

---

## Constraints

- Records immutable (no update/delete path); target/tolerance snapshotted.
- Server never trusts client zone; recomputes from reading.
- Overshoot policy is a **pluggable rule** awaiting the Step 24 human decision.

---

## Success Criteria

### Functional
- [ ] Tolerance boundary tests: 93.4 ✗ / 93.5 ✓ / 94.0 ✓ / 94.5 ✓ / 94.6 ✗; 84.6 near / 84.5 under
- [ ] 3 000 g → precision; 3 001 g → floor
- [ ] Confirm out of tolerance → 422; complete before 5/5 → 409
- [ ] Override requires valid PIN + reason; PIN absent from responses/logs
- [ ] Record contains all traceability fields; cannot be modified
- [ ] Reload resumes active component

### Non-Functional
- [ ] No floating-point quantity arithmetic in domain (test + lint rule)

### Quality
- [ ] 100 % branch coverage on tolerance/confirmation rules; > 80 % overall

---

## Bolt Suggestions

| Bolt | Type | Focus |
|------|------|-------|
| bolt 1 | DDD | Session aggregate, quantities, scale selection, tolerance/zones, confirmation, records, progression |
| bolt 2 | DDD | Override, Quit/audit, overshoot (after Step 24), completion + write-back trigger, failure safety, resume |

## Notes

Step 24 (overshoot) is a human decision point inside this unit's construction; bolt 2 must stop for it.
