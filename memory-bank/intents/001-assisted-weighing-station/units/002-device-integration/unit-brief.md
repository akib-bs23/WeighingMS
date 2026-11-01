---
unit: 002-device-integration
intent: 001-assisted-weighing-station
phase: inception
status: complete
unit_type: backend
default_bolt_type: simple-construction-bolt
created: 2026-10-29T09:24:35.000Z
updated: 2026-10-29T09:34:26.000Z
---

# Unit Brief: Device Integration (Scales, Scanner)

## Purpose

Simulate the station's shop-floor devices and expose them through ports: two **Dummy Scales** (3 kg precision, 32 kg floor) with live net weight, stability, status and tare, plus a **simulator** to drive them; and a **Dummy Scanner** delivering batch-card and dyestuff scans.

## Scope

### In Scope
- `GET /api/scales`, `GET /api/scales/:scaleId/status`, `GET /api/scales/:scaleId/weight`, `POST /api/scales/:scaleId/tare`
- Scale simulator (training prefix): set exact weight (stable), ramp to value (unstable while ramping, eased pour), overshoot preset, set offline/online, inject invalid reading
- Scanner: inject scan (simulator), scan event feed for the station, offline/online
- `ScalePort`, `ScannerPort` + Dummy adapters
- FR-32 scanner-unavailable behaviour contract (status reported; touch remains available)

### Out of Scope
- Tolerance, confirmation and reading validation rules (004 / shared)
- Which scale a component uses (004, TD-3)
- Printer (005); real device drivers (OQ-04)

---

## Assigned Requirements

| Req | Requirement | Priority |
|-----|-------------|----------|
| FR-32 | Printer and scanner unavailable (scanner part; printer part delivered by 005 under TD-9) | Must |
| DB-3 | Two Dummy scales with list/status/weight/tare endpoints | Must |
| DB-4 | Scale simulator: set, ramp, offline, invalid | Must |
| DB-5 | Dummy Scanner: inject scan, events, keyboard-wedge compatible | Must |
| DB-7 | Scale/scanner unavailable → 503 | Must |

---

## Domain Concepts

### Key Entities
| Entity | Description | Attributes |
|--------|-------------|------------|
| Scale | Configured scale | scaleId (`scale-3kg`, `scale-32kg`), class PRECISION/FLOOR, capacityMg, resolutionMg |
| ScaleState | Simulated live state | grossMg, tareMg, netMg, stable, online, invalid flag, updatedAt |
| ScanEvent | A scanned code | seq, code, scannedAt |

### Key Operations
| Operation | Description | Inputs | Outputs |
|-----------|-------------|--------|---------|
| readWeight | Current net reading | scaleId | {scaleId, netMg, stable, status, readAt} |
| tare | Zero net | scaleId | new state |
| simulateSet / simulateRamp | Drive weight | scaleId, valueMg, mode | ok |
| setOnline | Toggle availability | device, online | status |
| injectScan / pollScans | Scanner | code / sinceSeq | events |

---

## Story Summary

- **Total Stories**: 5
- **Must Have**: 5
- **Should Have**: 0
- **Could Have**: 0

### Stories

- [ ] **001-dummy-scales-report-weight-and-status**: Dummy scales report weight and status - Must - Planned
- [ ] **002-scale-tare-command**: Scale tare command - Must - Planned
- [ ] **003-scale-simulator-drives-weight**: Scale simulator drives the weight - Must - Planned
- [ ] **004-scale-offline-simulation**: Scale offline simulation - Must - Planned
- [ ] **005-dummy-scanner-delivers-scans**: Dummy scanner delivers scans - Must - Planned

---

## Dependencies

### Depends On
| Unit | Reason |
|------|--------|
| 001-orgatex-integration | Project scaffold, seed/reset mechanism |

### Depended By
| Unit | Reason |
|------|--------|
| 004-weighing-station | Tare + server-side reading check via `ScalePort` |
| 006-assisted-weighing-station-ui | Polls weight (TD-10), scans, trainer panel |

### External Dependencies
| System | Purpose | Risk |
|--------|---------|------|
| Real scales / scanner | Replaced by Dummies | Severe in real product (A-05); none for training |

---

## Technical Context

### Suggested Technology
NestJS `ScaleModule`, `ScannerModule`; in-memory device state (reset with scenario); scale config from seed.

### Integration Points
| Integration | Type | Protocol |
|-------------|------|----------|
| Station UI | API | REST/JSON polling 100 ms |
| 004 | In-process | `ScalePort` |

### Data Storage
| Data | Type | Volume | Retention |
|------|------|--------|-----------|
| Scale config | SQLite (seed) | 2 rows | static |
| Live state, scan events | In-memory | small | until reset |

---

## Constraints

- Quantities as integer mg; responses expose capacity/resolution so the UI can format.
- Endpoint paths per workbook Step 16; simulator endpoints clearly separated (training prefix).

---

## Success Criteria

### Functional
- [ ] Simulator set 50.0 g on scale-3kg → `GET /weight` returns 50 000 mg, stable
- [ ] Ramp produces unstable intermediate readings ending stable at the value
- [ ] Tare → net 0; offline → 503 within one poll
- [ ] Injected scan appears in the station scan feed

### Non-Functional
- [ ] Weight endpoint responds < 20 ms locally (supports NFR-1)

### Quality
- [ ] API tests per endpoint incl. offline/invalid
- [ ] Code coverage > 80%

---

## Bolt Suggestions

| Bolt | Type | Focus |
|------|------|-------|
| bolt 1 | Simple | Dummy scales + simulator + ScalePort |
| bolt 2 | Simple | Dummy scanner + ScannerPort |
