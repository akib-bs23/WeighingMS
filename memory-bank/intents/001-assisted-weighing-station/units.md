---
intent: 001-assisted-weighing-station
phase: inception
status: units-complete
updated: 2026-10-31T11:45:00Z
---

# Assisted Dyestuff Weighing Station - Unit Decomposition

> **Approved at workbook Checkpoint 3 (APPROVE UNITS) — 2026-10-29T09:34:26Z.**

## Decomposition Approach

- **Project type** `full-stack-web` → backend units decomposed **domain-driven** (default DDD bolt) + one **frontend** unit `{intent}-ui` (Simple bolt) — per `catalog.yaml`.
- Units are **capabilities, not screens**. The three screens are delivered by one UI unit consuming several backend capabilities; the Weighing Station is the core **domain** (session, tolerance, confirmation, override, progression, completion), not a screen.
- **Integrations are separated by external system** behind the ports defined in `system-context.md`: OrgaTEX (one unit), shop-floor devices scale + scanner (one unit), printer (with ticketing). Each Dummy is replaceable by a real adapter without touching domain units.
- Bolt type is chosen per unit on domain complexity: only the Weighing Station unit carries rich invariants (tolerance, immutability, override authorisation, completion rules, fixed-point arithmetic) and gets **DDD** bolts; the rest are **Simple**.
- Evaluated and rejected: separate "Recipe & Material Management" unit (recipe/lot/container data is read-only seed data served through OrgaTEX and needs no behaviour of its own → folded into 001/003); separate "Scale Integration" vs "Scanner" units (same device-simulation pattern, same port style, small → one Device Integration unit); separate "Audit" unit (audit events are produced only by weighing actions → part of 004).

## Units Overview

This intent decomposes into **6 units**:

### Unit 1: 001-orgatex-integration

**Description**: Everything that talks to OrgaTEX. The `OrgatexPort` contract and the **Dummy OrgaTEX** (batch queue, batch detail, recipe, consumption receiver with idempotency), the consumption **write-back service** (PENDING / CONFIRMED / Retry), OrgaTEX availability toggle, and the versioned **training seed + reset** mechanism.

**Requirements**: FR-24 · DB-1, DB-2, DB-7 (OrgaTEX), DB-8 · NFR-10, NFR-12

**Deliverables**: Dummy OrgaTEX REST endpoints (`GET /api/batches`, `GET /api/batches/:batchId`, `GET /api/batches/:batchId/recipe`, `POST /api/batches/:batchId/consumption`); `OrgatexPort` + Dummy adapter; write-back service; seed JSON + reset command/endpoint; project scaffold (first bolt).

**Dependencies**: Depends on: none (foundation). Depended by: 003, 004.

**Bolt type**: Simple. **Estimated Complexity**: M

### Unit 2: 002-device-integration

**Description**: Shop-floor device substitutes and their ports: **Dummy Scale** ×2 (`scale-3kg` precision, `scale-32kg` floor — weight, stability, status, tare) with **simulator** (set weight, ramp/dispense, overshoot, offline, invalid reading), and **Dummy Scanner** (inject scan, scan events, offline).

**Requirements**: FR-32 · DB-3, DB-4, DB-5, DB-7 (scale, scanner)

**Deliverables**: `GET /api/scales`, `GET /api/scales/:scaleId/status`, `GET /api/scales/:scaleId/weight`, `POST /api/scales/:scaleId/tare`; scale & scanner simulator endpoints (training prefix); `ScalePort`, `ScannerPort` + Dummy adapters.

**Dependencies**: Depends on: 001 (project scaffold and seed mechanism only). Depended by: 004, 006.

**Bolt type**: Simple. **Estimated Complexity**: M

### Unit 3: 003-batch-management

**Description**: Work intake from OrgaTEX into the station: batch queue for the station, batch eligibility (RELEASED only), batch-card scan routing, batch context and recipe retrieval for weighing, and OrgaTEX-unavailable handling on load.

**Requirements**: FR-1, FR-2, FR-3, FR-5, FR-31 · NFR-2

**Deliverables**: WeighingMS batch API (queue, select/validate, recipe for session) built on `OrgatexPort`; eligibility rule; error mapping (`BATCH_NOT_RELEASED`, `BATCH_NOT_FOUND`, `ORGATEX_UNAVAILABLE`).

**Dependencies**: Depends on: 001. Depended by: 004, 006.

**Bolt type**: Simple. **Estimated Complexity**: S

### Unit 4: 004-weighing-station

**Description**: The core domain. A **Weighing Session** for a batch with its component weighings: scale selection rule, tare/re-tare, component identity/lot/container, **tolerance evaluation and zones**, **confirmation gating** and server re-validation, **immutable weighing records** with snapshots, **supervisor override**, **Quit/abandon**, overshoot detection, **component progression**, **batch completion**, triggering OrgaTEX write-back, audit trail and session resume. Shared pure rules (tolerance, zones, units, remaining) live in `src/shared` for UI reuse.

**Requirements**: FR-6, FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-15, FR-16, FR-17, FR-18, FR-19, FR-20, FR-21, FR-22, FR-23, FR-27, FR-29, FR-30 · NFR-6, NFR-7, NFR-8, NFR-9, NFR-11

**Deliverables**: Domain model (WeighingSession aggregate, ComponentWeighing, WeighingRecord, Override, AuditEvent, Quantity value object in mg, ToleranceBand); application API (start/resume session, activate component, tare, confirm, override, quit, complete, get records & audit); Drizzle schema + migrations; shared rule library.

**Dependencies**: Depends on: 001 (write-back service), 002 (`ScalePort` for tare + server-side reading check), 003 (batch + recipe). Depended by: 005, 006.

**Bolt type**: **DDD**. **Estimated Complexity**: L

### Unit 5: 005-ticket-printing

**Description**: The physical record: compose the weighing ticket from a completed session, Code 128 barcode of the batch id, submit to the **Dummy Printer** through `PrinterPort`, preview, printer-unavailable handling, reprint marked REPRINT.

**Requirements**: FR-25, FR-26 · DB-6, DB-7 (printer)

**Deliverables**: Ticket composer; `POST /api/tickets` (Dummy Printer) + printer status/offline toggle; `PrinterPort` + adapter; reprint audit.

**Dependencies**: Depends on: 004 (completed session data). Depended by: 006.

**Bolt type**: Simple. **Estimated Complexity**: S

### Unit 6: 006-assisted-weighing-station-ui

**Description**: The station frontend (React SPA) reproducing the prototype's three screens and station frame, plus the separate **trainer simulator panel**. Consumes all backend units through a typed API client; polls live weight; status strip; F-keys; all failure banners.

**Requirements**: FR-4, FR-13, FR-14, FR-28, FR-33, FR-34 · NFR-1, NFR-3, NFR-4, NFR-5, NFR-14 — and the **UI side of every user-facing FR** owned by units 003, 004, 005.

**Deliverables**: Screens 1 · Select batch, 2 · Weigh, 3 · Confirm & print; top bar; status strip; trainer panel; typed API client; live-weight hook; component tests; Playwright E2E suite.

**Dependencies**: Depends on: 002, 003, 004, 005 (and 001 indirectly). Depended by: none.

**Bolt type**: Simple (frontend). **Estimated Complexity**: L

## Requirement-to-Unit Mapping

Every FR is assigned to exactly one **owning** unit. "UI impact" marks FRs whose screen behaviour is built by 006.

| FR | Requirement | Owning unit | UI impact (006) |
|----|-------------|-------------|-----------------|
| FR-1 | Display batch queue from OrgaTEX | 003-batch-management | ✓ |
| FR-2 | Select batch by touch or scan | 003-batch-management | ✓ |
| FR-3 | Reject non-released batches | 003-batch-management | ✓ |
| FR-4 | Show batch context (top bar) | 006-assisted-weighing-station-ui | ✓ |
| FR-5 | Load and display recipe | 003-batch-management | ✓ |
| FR-6 | Identify active component | 004-weighing-station | ✓ |
| FR-7 | Optional dyestuff identity verification | 004-weighing-station | ✓ |
| FR-8 | Capture dyestuff lot | 004-weighing-station | ✓ |
| FR-9 | Identify container | 004-weighing-station | ✓ |
| FR-10 | Apply container tare | 004-weighing-station | ✓ |
| FR-11 | Re-tare | 004-weighing-station | ✓ |
| FR-12 | Automatic scale selection | 004-weighing-station | ✓ |
| FR-13 | Display live weight | 006-assisted-weighing-station-ui | ✓ |
| FR-14 | Display target | 006-assisted-weighing-station-ui | ✓ |
| FR-15 | Still-to-weigh | 004-weighing-station | ✓ |
| FR-16 | Tolerance evaluation and zones | 004-weighing-station | ✓ |
| FR-17 | Gate confirmation | 004-weighing-station | ✓ |
| FR-18 | Record confirmed weighing | 004-weighing-station | ✓ |
| FR-19 | Supervisor override | 004-weighing-station | ✓ |
| FR-20 | Quit (abandon component) | 004-weighing-station | ✓ |
| FR-21 | Detect and block overshoot | 004-weighing-station | ✓ |
| FR-22 | Component progression | 004-weighing-station | ✓ |
| FR-23 | Complete the batch | 004-weighing-station | ✓ |
| FR-24 | Post consumption to OrgaTEX | 001-orgatex-integration | ✓ |
| FR-25 | Generate and print ticket | 005-ticket-printing | ✓ |
| FR-26 | Ticket reprint | 005-ticket-printing | ✓ |
| FR-27 | Attribute every action to an identity | 004-weighing-station | — |
| FR-28 | Device and integration status strip | 006-assisted-weighing-station-ui | ✓ |
| FR-29 | Scale unavailable — safe failure | 004-weighing-station | ✓ |
| FR-30 | Invalid weight reading | 004-weighing-station | ✓ |
| FR-31 | OrgaTEX unavailable | 003-batch-management | ✓ |
| FR-32 | Printer and scanner unavailable | 002-device-integration | ✓ |
| FR-33 | Keyboard function keys | 006-assisted-weighing-station-ui | ✓ |
| FR-34 | Training simulator panel | 006-assisted-weighing-station-ui | ✓ |

Coverage: **34 / 34 FRs** assigned. DB-1…DB-8 → 001/002/005 as listed. NFRs → as listed; NFR-13 (automated verification) applies to every unit.

## Unit Dependency Graph

```text
                 ┌──────────────────────────┐
                 │ 001-orgatex-integration  │  (scaffold, seed/reset,
                 │  Dummy OrgaTEX + write-  │   OrgatexPort)
                 │  back service    [Simple]│
                 └─────┬───────────────┬────┘
                       │               │
          ┌────────────▼───┐   ┌───────▼───────────────┐
          │ 003-batch-     │   │ 002-device-integration│
          │ management     │   │ Dummy Scale ×2 +      │
          │       [Simple] │   │ Scanner      [Simple] │
          └───────┬────────┘   └───┬───────────────┬───┘
                  │                │               │
                  ▼                ▼               │
          ┌────────────────────────────────┐       │
          │ 004-weighing-station   [DDD]   │◄──────┘ (001 write-back too)
          │ session · tolerance · confirm ·│
          │ override · progression · done  │
          └───────────────┬────────────────┘
                          ▼
          ┌────────────────────────────────┐
          │ 005-ticket-printing  [Simple]  │
          │ ticket · Dummy Printer         │
          └───────────────┬────────────────┘
                          ▼
          ┌────────────────────────────────┐
          │ 006-assisted-weighing-         │  consumes 002, 003, 004, 005
          │ station-ui  [Simple, frontend] │
          └────────────────────────────────┘
```

## Execution Order

1. **001-orgatex-integration** — scaffold + seed/reset + Dummy OrgaTEX (workbook Steps 16–18 start here)
2. **002-device-integration** and **003-batch-management** — parallelisable after 001
3. **004-weighing-station** — core domain (DDD)
4. **005-ticket-printing**
5. **006-assisted-weighing-station-ui** — screens can start once 003's API exists (batch screen, Step 19), then follow 004 and 005

## Independence Validation

| Unit | Separate team? | Clear interface | Failure isolation | Independently deployable* |
|------|----------------|-----------------|-------------------|---------------------------|
| 001 | ✓ | REST (Dummy OrgaTEX) + `OrgatexPort` | OrgaTEX down → 003/004 degrade per FR-31/TD-8 | ✓ (module) |
| 002 | ✓ | REST (Dummy Scale/Scanner) + ports | Scale down → FR-29 safe state | ✓ (module) |
| 003 | ✓ | WeighingMS batch API | — | ✓ (module) |
| 004 | ✓ | WeighingMS session/weighing API | Device/OrgaTEX failures contained by ports | ✓ (module) |
| 005 | ✓ | ticket API + `PrinterPort` | Printer down → TD-9 | ✓ (module) |
| 006 | ✓ | consumes HTTP APIs only | shows every failure state | ✓ (static bundle) |

\* Per `tech-stack.md` all backend units run in **one NestJS process** as separate Nest modules (local training deployment). Each is independently buildable and testable; physical separate deployment is not required for this build.
