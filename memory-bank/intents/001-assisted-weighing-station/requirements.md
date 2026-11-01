---
intent: 001-assisted-weighing-station
phase: inception
status: complete
created: 2026-10-29T08:43:39Z
updated: 2026-10-29T08:52:03Z
---

# Requirements: Assisted Dyestuff Weighing Station (WeighingMS)

> **Intent APPROVED at Checkpoint 1 (2026-10-29T08:45:17Z).** Detailed requirements drafted 2026-10-29T08:50:22Z after Requirements Checkpoint 1 (clarifying questions — all recommendations accepted). **Requirements APPROVED at Checkpoint 2 (2026-10-29T08:52:03Z).**

## Intent Overview

Build **WeighingMS**, a guided operator terminal for a single dyestuff weighing station at FCI's textile dyehouse. The station sits **between OrgaTEX (FCI's MES) and the weighing operator**: it receives the batch queue and recipe digitally, guides the operator through weighing each recipe component on the correct scale against its target and tolerance, refuses confirmation outside tolerance, records every weighing with full traceability, writes actual consumption back to OrgaTEX on batch completion, and prints a weighing ticket that travels with the container.

WeighingMS **does not replace OrgaTEX**. OrgaTEX remains the upstream owner of batches, recipes, tolerances and dyestuff master data, and the downstream recipient of actual consumption. WeighingMS also does **not** automate dispensing — the operator still dispenses by hand (brief §2, C-03).

**Intent type:** New feature (green-field).

**Delivery context:** This is a **training build** produced through the specs.md AI-DLC lab. The real external systems (OrgaTEX, scales, scanner, printer) are not available, so they are represented by **Dummy APIs that are part of the product**. The finished application must reproduce the functional experience of the supplied UI/UX prototype and be demonstrable end-to-end.

## Business Problem

Today (assumed, brief A-13) the weighing step is manual and unrecorded: the recipe is printed on paper, the operator weighs by eye against a printed figure, and the actual quantity dispensed is never captured. When a batch fails shade approval there is no record to distinguish a bad recipe from a bad weighing, so failures cannot be attributed and errors recur.

## Primary Users and Stakeholders

| Role | Relationship to WeighingMS |
|------|----------------------------|
| **Weighing operator** (primary user) | Selects batch, weighs each component, confirms, prints ticket. Works with gloves in a dusty environment; limited computer literacy must not be assumed (C-05). |
| **Dyehouse supervisor** | Authorises out-of-tolerance overrides and privileged actions; monitors progress. |
| Lab / QA, Store / inventory | Consumers of the weighing record and actual consumption (indirect users). |
| OrgaTEX (system) | Upstream source of batches/recipes; downstream recipient of consumption. Represented by a Dummy API. |
| Trainer / lab participant | Uses Dummy API simulator controls to drive scenarios (scale weight, device failure). |

## Business Goals (Desired Outcome)

| Goal | Success Metric (training build) | Brief ref | Priority |
|------|----------------------------------|-----------|----------|
| Only in-tolerance weighings reach production unless explicitly authorised | Confirmation is impossible outside tolerance; overrides require supervisor and reason | BO-01, BR-07, AC-04, AC-06 | Must |
| Component-level traceability for every batch | 100% of confirmed weighings store target, actual, operator, component, lot, container, tare, scale, timestamp | BO-02, BR-11, AC-07 | Must |
| Actual consumption reaches OrgaTEX | Completed batch's consumption is posted to Dummy OrgaTEX and stored there | BO-04, BR-12, AC-08 | Must |
| Physical record accompanies container | Ticket generated via Dummy Printer with batch, order, machine, shade, date, operator, component target/actual, barcode | BR-15, AC-10 | Must |
| Guided weighing is at least as fast and clear as paper | Live weight, remaining quantity, progress bar with tolerance band; automatic scale selection | BO-06, BR-05, BR-06 | Must |
| Fully demonstrable and tested | Five-component scenario B-24187 runs end-to-end in Playwright; failure scenarios tested | Workbook Steps 29–30 | Must |

## Source Artifacts

| Source | Role | Notes |
|--------|------|-------|
| `docs/brief.md` | Product Brief — Business Requirements Document v1.1 (draft) | BR-01…24, FR-01…37, IR-01…18, NFR-01…16, AC-01…14, assumptions A-01…A-15. **Nothing in it is confirmed by FCI.** |
| `docs/customize-weighing-station.html` | **UI/UX prototype (functional reference)** | 3 screens: *1 · Select batch*, *2 · Weigh*, *3 · Confirm & print*; tolerance zones, confirm gating, scale switching (3 kg precision ↔ 32 kg floor, g ↔ kg), component progression, overshoot/surplus panel, ticket, device status strip, question pins. To be re-implemented from specification, not copied. |
| `workbook.md` | Lab instructions | Mandates Dummy APIs, minimum training endpoints, seed scenario, test expectations. |

Not supplied (referenced by the brief): `addendum.md`, `weighing-flow-diagrams.md`, and the original brief's question list Q1–Q41 (known only via BRD §12 and prototype pins).

## Scope

### In scope (approved at Checkpoint 1)

Functional experience of the prototype, backed by APIs:
- Batch queue retrieved from Dummy OrgaTEX; select batch by touch or by (simulated) barcode scan
- Batch context (order, machine, fabric, shade, component count) and recipe retrieval
- Component list in recipe sequence with done / active / pending states and progression
- Component details: code, dyestuff lot, container, tare
- Automatic scale selection per component (3 kg precision / 32 kg floor) with unit switching (g / kg)
- Live weight from the Dummy Scale API; weighed-now, still-to-weigh, target; progress bar with tolerance band
- Tolerance evaluation and zone signalling; confirmation only when within tolerance
- Overshoot detection, blocked confirmation, and Quit/Override-only recovery — **no surplus compensation** (human decision at workbook Step 24, TD-11)
- Re-tare, Quit (abandon/restart component), Supervisor override request
- Recording each confirmed weighing (operator, component, lot, container, tare, scale, actual, timestamp)
- Batch completion only when all components are complete
- Consumption write-back to Dummy OrgaTEX
- Ticket generation and print/preview via Dummy Printer
- Operator identification shown in the session (operator chip)
- Device/integration status strip (scales, scanner, printer, OrgaTEX link)
- Defined, safe behaviour for scale / OrgaTEX / printer unavailability
- Dummy APIs for OrgaTEX, Scale, Scanner, Printer, including training simulator controls and seed/reset

### Out of scope

From the brief (§5.2): dispensing-machine control, automated transport, dissolving/liquid dosing, recipe authoring or modification, replacing any OrgaTEX function, lab colour matching, procurement, machine-side dyeing control.

For this training build: any **real** integration with OrgaTEX/SETEX, scale indicators, scanners or printers; production authentication; multi-station/multi-site deployment.

### Scope boundary — approved at Checkpoint 1 as proposed

Brief items that are **in the brief's scope but not shown in, or not required by, the prototype/workbook**:

| Item | Brief ref | Approved position |
|------|-----------|-------------------|
| Offline operation with deferred sync / sync queue | BR-16–18, FR-30–33, AC-09 | **Defer** — show OrgaTEX link state; on OrgaTEX outage, define safe behaviour (Step 30) but no offline sync engine |
| Dyestuff identity verification by barcode scan | BR-10, FR-09 | **Include (light)** — Dummy Scanner can submit a dyestuff barcode that is checked against the component |
| Supervisor authentication for override | FR-35, AC-06 | **Include (mock)** — supervisor PIN/badge from Dummy identities; mandatory reason |
| Surplus compensation (recalculate remaining components) | FR-20–24, A-08 | **Won't** — decided at Step 24 (TD-11): no automatic or suggested recalculation; blocking + Quit/Override recovery only |
| Scale calibration block | BR-24, FR-12, AC-14 | **Defer** (could be a simple flag on the Dummy Scale) |
| Ticket reprint marked as reprint | FR-28 | **Could** |
| Batch weighing history / reporting | FR-29, BR-22, BR-23 | **Defer** |
| Interface localisation | BR-21, FR-37, NFR-11 | **Defer** — English only (A-10), text kept externalisable |
| 21-key terminal | IR-17 | **Include as keyboard shortcuts** F1 OK, F2 Re-tare, F4 Quit (as prototype) |

## Integrations (Training Dummy APIs)

All four are **training contracts only**. They make **no claim** about the real interfaces; the brief's integration questions remain unresolved. Real-system substitution is isolated behind adapters (brief IR-07).

| Conceptual system | Dummy implementation provides (minimum, per workbook) |
|-------------------|------------------------------------------------------|
| **OrgaTEX** (MES) | Batch queue, batch detail, recipe/components; receives consumption: `GET /api/batches`, `GET /api/batches/:batchId`, `GET /api/batches/:batchId/recipe`, `POST /api/batches/:batchId/consumption` |
| **Weighing scales** (3 kg precision, 32 kg floor) | Scale list, status, current weight, tare: `GET /api/scales`, `GET /api/scales/:scaleId/status`, `GET /api/scales/:scaleId/weight`, `POST /api/scales/:scaleId/tare`, plus simulator controls |
| **Scanner** | Simulated barcode input (batch card, dyestuff) — contract to be defined in Requirements |
| **Printer** | Ticket job: `POST /api/tickets`, print/preview output |

Training seed scenario (from prototype + workbook): batch **B-24187**, order **SO-9931**, machine **JET-04**, shade **Teal 4C**, five components — Remazol Brill. Blue RSPL, Remazol Red RB, Remazol Yellow RGB, Sodium Sulphate, Soda Ash — plus queued batches B-24188, B-24190, B-24191.

## Constraints

### Technical Constraints

**Project-wide standards**: loaded from `memory-bank/standards/` (tech-stack, data-stack, coding-standards).

**Intent-specific constraints:**
- UI must obtain all data via APIs; no scenario data hard-coded in UI components (workbook Rule 5).
- Prototype is a reference for behaviour and layout; implementation is built from approved specs, not by copying its JavaScript (workbook Step 20).
- Quantities use fixed-point / integer arithmetic, never floating point (brief NFR-16).
- Weighing records are immutable once confirmed (brief DR-02).

### Business Constraints
- C-01/C-02: OrgaTEX remains the source of truth for recipes and batches; WeighingMS must not modify OrgaTEX-owned data other than posting consumption (and batch weighing status, if adopted).
- C-03: No connection to or control of dispensing machinery.
- C-05: Interface must not assume computer literacy; large touch targets for gloved hands (NFR-07).

## Assumptions

Brief assumptions A-01…A-15 are all **unconfirmed by FCI**. For this training build they are handled as follows:

| Assumption | Training-build handling | Risk if invalid (real product) |
|------------|-------------------------|--------------------------------|
| A-01 OrgaTEX REST API exists | Dummy OrgaTEX API with workbook paths | Severe — adapter rewrite |
| A-02 OrgaTEX accepts consumption | Dummy accepts and stores consumption | Severe — no write-back |
| A-05 Scales stream ≥10 Hz with stability flag | Dummy scale is polled/streamed; simulator sets weight | Severe — guided weighing redesign |
| A-06 Rule-based scale selection | Scale assigned per component in seed data (3 kg vs 32 kg); threshold rule TBD | Moderate |
| A-07 Per-component tolerance | Absolute ± tolerance per component from seed (e.g. Yellow RGB 94.0 ± 0.5 g) | Moderate |
| A-08 Surplus compensation = proportional recalculation | **Rejected at Step 24** (TD-11) — never performed in this training build | High |
| A-09 Per-operator traceability, lot captured | Operator and lot recorded on every weighing | Moderate |
| A-10 Barcodes exist, English, 21-key terminal | Dummy scanner; English; F-keys | Moderate |

## Open Questions

Unresolved questions carried from the brief and prototype. **None are answered by this intent**; those that affect the training build are marked for decision in Inception.

| # | Question | Source | Owner | Resolution |
|---|----------|--------|-------|------------|
| OQ-01 | What interface does OrgaTEX actually expose (REST / OPC-UA / DB / file), and what data can be read? | A-01, Q6–Q10, pin 6/10 | FCI / SETEX | Pending (real); Dummy for training |
| OQ-02 | Does OrgaTEX accept actual-consumption postings, and batch status updates? | A-02, Q11–Q12, pin 11 | FCI / SETEX | Pending (real); Dummy for training |
| OQ-03 | If OrgaTEX is unreachable at completion, does weighing continue offline and sync later, or stop? | A-03, Q13, pin 11 | FCI | Closed for training by TD-8 |
| OQ-04 | Scale make/model/protocol; continuous vs stabilised-only weight | A-05, Q15–Q16, pins 15/16 | FCI | Pending (real); Dummy streams |
| OQ-05 | Scale auto-selection threshold and boundary behaviour | A-06, Q15, Q20, pin 15 | FCI | Closed for training by TD-3 |
| OQ-06 | How tolerances are defined (percent / absolute / banded), by whom, from OrgaTEX? | A-07, Q24, pin 24 | FCI | Training: absolute per component from seed |
| OQ-07 | What "surplus compensation" means; what happens when not compensable | A-08, Q25–Q26, pin 25 | FCI | Closed for training by TD-11: no compensation performed; "not compensable" is moot since nothing is ever computed |
| OQ-08 | Who may override a tolerance failure; logging and approval | Q33, pin 33 | FCI | Closed for training by TD-7 |
| OQ-09 | Container identity (one per component vs whole recipe) and tare source | A-09, Q29, pin 29 | FCI | Closed for training by TD-4 |
| OQ-10 | How dyestuff lots are captured | A-09, Q28, pin 29 | FCI | Closed for training by TD-5 |
| OQ-11 | Do operators log in individually? Is per-operator traceability required? | A-09, Q37, pin 37 | FCI | Closed for training by TD-6 |
| OQ-12 | Ticket printer, label fields, barcode symbology | A-04, Q18, pin 18 | FCI | Training: prototype ticket fields |
| OQ-13 | Interface language | A-10, Q35, pin 35 | FCI | Training: English |
| OQ-14 | Which batch statuses are selectable (prototype shows QUEUED/WEIGHING; brief requires RELEASED) | FR-03 vs prototype | FCI / team | Closed for training by TD-1 |
| OQ-15 | Is today's process really paper-based and unrecorded? | A-13, Q1–Q2 | FCI | Pending (business case only) |
| OQ-16 | Surplus definition conflict: prototype uses actual − target; brief glossary uses quantity above tolerance max | Prototype vs brief §16 | Team | Closed for training by TD-11: `actual − target` (already implemented, bolt 006) |

---

## How to Read This Document

Every item below is classified so that nothing is invented silently (workbook Rule 2):

| Class | Meaning | ID prefix |
|-------|---------|-----------|
| **Requirement** | What the system must do. Traced to an approved source: brief (`BR/FR/IR/NFR/AC`), prototype (`UI`), workbook (`WB Step n`) or a training decision (`TD`). "Confirmed" here means *confirmed for this training build by an approved source or human decision* — **nothing is confirmed by FCI**. | `FR-n`, `NFR-n` |
| **Training decision** | Human decision taken at Requirements Checkpoint 1 to close a gap for the training build. Replaceable when FCI answers. | `TD-n` |
| **Assumption** | Believed true for the training build but unverified. | `AS-n` (plus brief `A-nn`) |
| **Unresolved question** | Open; must not be silently decided. | `OQ-n` |
| **Training-only Dummy behaviour** | Exists only because real systems are unavailable; makes no claim about real interfaces. | `DB-n` |

**Basis references:** IDs in *Basis* fields and NFR *Basis* columns (BR-nn, FR-nn, IR-nn, NFR-nn, AC-nn, DR-nn, A-nn) refer to **`docs/brief.md`**, not to this document. `UI` = prototype, `WB` = workbook, `TD` = training decision.

Units convention: mass is held as **integer milligrams** internally and in API payloads; it is displayed in the component's unit — **g with 1 decimal** on the precision scale, **kg with 3 decimals** on the floor scale (UI prototype `fmt()`).

---

## Training Decisions (Requirements Checkpoint 1 — 2026-10-29, "accept all recommended")

| ID | Decision | Closes | 
|----|----------|--------|
| TD-1 | Only batches in status **RELEASED** can be selected. Seed: B-24187 = RELEASED; B-24188, B-24190, B-24191 = QUEUED. Selecting a non-released batch is rejected with the reason *"Batch not released by OrgaTEX"*. While a session is open the station shows the batch as **WEIGHING**. | OQ-14 |
| TD-2 | Demo starts **fresh: 0 of 5** components weighed. Reset restores this state. | Prototype vs WB Step 29 |
| TD-3 | Scale selection is **rule-based**: component target ≤ **3 000 g** → 3 kg precision scale; otherwise → 32 kg floor scale; exactly 3 000 g → precision. Threshold is a training assumption. | OQ-05 |
| TD-4 | **One container per component**; tare comes from the container master (seed). **Re-tare** sends a tare command to the selected scale and resets the net reading to zero. | OQ-09 |
| TD-5 | **Dyestuff lot** is pre-assigned per component in seed data, displayed and recorded on every weighing. An **optional** dyestuff barcode scan verifies identity. | OQ-10 |
| TD-6 | **Fixed session operator** "R. Karim · Shift A" from seeded identities; no sign-in screen. | OQ-11 |
| TD-7 | **Supervisor override**: supervisor enters a PIN and a mandatory reason; the weighing is confirmed with result `OVERRIDDEN`, recording supervisor, reason and time. Works identically for an overshoot reading (TD-11) as for any other non-`OK` zone — nothing overshoot-specific. | OQ-08 |
| TD-8 | **OrgaTEX unavailable at completion**: batch is completed locally; write-back status **PENDING** with a manual **Retry**; posting is idempotent. No automatic sync engine. | OQ-03 |
| TD-9 | **Printer unavailable**: ticket is still generated and shown as preview; printing fails with a clear error and **Retry**; batch completion is not blocked. | — |
| TD-10 | **Live weight** is obtained by the UI **polling** `GET /api/scales/:scaleId/weight` every **100 ms** (10 Hz). | Transport choice |
| TD-11 | **Overshoot — no surplus compensation** (decided at workbook Step 24, `evidence/STEP-24-overshoot-decision.md`): an over-tolerance reading blocks normal confirmation exactly as before; recovery is Quit-and-reweigh or Supervisor override (both unchanged). **No automatic or suggested recalculation of any other component's target is ever performed.** Surplus magnitude continues to be `actual − target` (already implemented, bolt 006), finalising OQ-16 in that direction. This training build never assumes the prototype's "preserve the shade ratio" proposal is the right one — real-world surplus handling is a question for FCI, not something to answer by guessing a formula. | OQ-07, OQ-16 |

---

## Functional Requirements

Grouped by the 20 capability areas required by workbook Step 7.

### Area 1 — Batch queue

#### FR-1: Display the batch queue from OrgaTEX
- **Description**: Screen *1 · Select batch* shows the batch queue retrieved from Dummy OrgaTEX via `GET /api/batches`. Columns: Batch, Order, Machine, Fabric / lot (description · fabric weight kg), Shade, Comp. (component count), Status. A scan prompt reads *"Scan a batch card to begin"* / *"Or touch a row below. Queue received from OrgaTEX at {HH:MM}."*
- **Acceptance Criteria**:
  - With seed data, the queue lists B-24187, B-24188, B-24190, B-24191 with the values of the prototype (e.g. B-24187 · SO-9931 · JET-04 · 100% CTN knit · 480 kg · Teal 4C · 5).
  - Network inspection shows the rows came from `GET /api/batches`; no batch data exists in UI source code.
  - "Queue received at" shows the time of the successful fetch.
  - Status tag shows `RELEASED`/`QUEUED`, or `WEIGHING` (highlighted) for a batch with an open session.
- **Priority**: Must
- **Basis**: BR-01, FR-01 (brief); UI view 1; WB Steps 16, 19; TD-1

### Area 2 — Batch selection

#### FR-2: Select a batch by touch or scan
- **Description**: The operator selects a batch by touching its row or by scanning a batch card (Dummy Scanner, FR-27). The system retrieves `GET /api/batches/:batchId` then `GET /api/batches/:batchId/recipe` and opens screen *2 · Weigh*, starting a weighing session for the session operator.
- **Acceptance Criteria**:
  - Touching B-24187 issues exactly these two requests in order and opens the Weigh screen.
  - Scanning `B-24187` has the same effect as touching it.
  - A weighing session (batch, operator, station, start time) is persisted.
  - If a session for the batch is already open, it is resumed rather than duplicated (see NFR-6).
- **Priority**: Must
- **Basis**: BR-02, FR-02, FR-05; UI view 1; WB Step 19

#### FR-3: Reject batches that are not released
- **Description**: Selecting a batch whose status is not RELEASED (or WEIGHING with this station's open session) is refused with a visible reason.
- **Acceptance Criteria**: Touching or scanning B-24188 shows *"Batch B-24188 not released by OrgaTEX (status QUEUED)"*; the screen stays on the queue; no session is created. Scanning an unknown batch code shows *"Batch {code} not found"*.
- **Priority**: Must
- **Basis**: BR-03, FR-03; TD-1

#### FR-4: Show batch context
- **Description**: Throughout the session the top bar shows `WeighingMS · STATION 01`, `BATCH {id} · ORDER {order} · MACHINE {machine}`, and the operator chip `Operator {name} · {shift}`.
- **Acceptance Criteria**: For B-24187 the top bar reads `BATCH B-24187 · ORDER SO-9931 · MACHINE JET-04` and `Operator R. Karim · Shift A`.
- **Priority**: Must
- **Basis**: FR-04; UI top bar; TD-6

### Area 3 — Recipe loading

#### FR-5: Load and display the recipe
- **Description**: The recipe rail shows `Recipe · {shade}`, the batch id, `{n} of {N} components weighed`, and the components in recipe sequence. Each row shows colour swatch, name, code · scale class, target quantity with unit, and state (`✓ {actual}` / `WEIGHING` / `PENDING`).
- **Acceptance Criteria**:
  - B-24187 shows 5 components in order: Remazol Brill. Blue RSPL (1240.0 g), Remazol Red RB (386.0 g), Remazol Yellow RGB (94.0 g), Sodium Sulphate (24.000 kg), Soda Ash (9.600 kg).
  - Initially `0 of 5 components weighed`; first component active (TD-2).
  - Recipe data originates from `GET /api/batches/:batchId/recipe`; recipe is read-only in WeighingMS.
- **Priority**: Must
- **Basis**: BR-04, FR-05, FR-06; UI rail; WB Step 17

### Area 4 — Component identification

#### FR-6: Identify the active component
- **Description**: The weighing panel header shows the active component's name and a meta line `{code} · LOT {lot} · CONTAINER {container} · TARE {tare} {unit}`.
- **Acceptance Criteria**: For Yellow RGB: `Remazol Yellow RGB` and `DYE-4471 · LOT 2026-0387 · CONTAINER C-12 · TARE 214.0 g`.
- **Priority**: Must
- **Basis**: FR-06; UI weigh header

#### FR-7: Optional dyestuff identity verification by scan
- **Description**: While a component is active, a dyestuff barcode scan is compared with the active component's dyestuff barcode. Match → indicator *IDENTITY VERIFIED*. Mismatch → error *"Wrong dyestuff: scanned {code}, expected {code}"* and confirmation is blocked until a matching scan or Quit. If no scan is made, weighing may proceed (light verification, TD-5).
- **Acceptance Criteria**: Scanning the correct code shows verified; scanning another component's code blocks OK even when weight is in tolerance; a subsequent correct scan unblocks it.
- **Priority**: Should
- **Basis**: BR-10, FR-09 (light, per Intent scope); TD-5

### Area 5 — Dyestuff lot

#### FR-8: Capture the dyestuff lot
- **Description**: Each component carries its seeded lot; the lot is displayed (FR-6) and recorded on the weighing transaction.
- **Acceptance Criteria**: Every confirmed weighing record contains the lot id shown on screen at confirmation (e.g. Yellow RGB → `2026-0387`).
- **Priority**: Must
- **Basis**: FR-10, BR-11; TD-5

### Area 6 — Container

#### FR-9: Identify the container
- **Description**: Each component is weighed into one container from the container master (TD-4); the container id is displayed and recorded.
- **Acceptance Criteria**: Yellow RGB shows and records `C-12`; Sodium Sulphate shows and records `D-03`.
- **Priority**: Must
- **Basis**: FR-11; UI meta line; TD-4

### Area 7 — Tare

#### FR-10: Apply container tare
- **Description**: When a component becomes active, the container's master tare is shown in the component unit and a tare command is sent to the selected scale (`POST /api/scales/:scaleId/tare`) so the net reading starts at zero.
- **Acceptance Criteria**: Activating Yellow RGB issues a tare to `scale-3kg`; displayed weighed-now is `0.0 g`; recorded tare is 214 g. Sodium Sulphate shows `TARE 1.850 kg`.
- **Priority**: Must
- **Basis**: FR-11, IR-12; TD-4

#### FR-11: Re-tare
- **Description**: The **Re-tare (F2)** action sends a tare command to the selected scale and resets the net reading to zero, without recording a weighing.
- **Acceptance Criteria**: After dispensing to 50.0 g, Re-tare results in weighed-now `0.0 g`, still-to-weigh equal to target, OK disabled; no weighing record is created.
- **Priority**: Must
- **Basis**: UI F2; IR-12; WB Step 30 (Re-tare → weight reset)

### Area 8 — Scale selection

#### FR-12: Select the scale automatically
- **Description**: The system selects the scale per component using TD-3 (≤ 3 000 g → 3 kg precision; else 32 kg floor). The scale badge shows `SCALE SELECTED` / `{3 kg precision | 32 kg floor}` / `automatic`. Units and display precision follow the scale (g, 1 dp / kg, 3 dp).
- **Acceptance Criteria**:
  - Blue RSPL, Red RB, Yellow RGB → `3 kg precision`, values in g.
  - Sodium Sulphate, Soda Ash → `32 kg floor`, values in kg.
  - Moving from Yellow RGB to Sodium Sulphate switches the badge, the weight source (`/api/scales/scale-32kg/weight`) and all units to kg.
  - A component whose target is exactly 3 000 g selects the precision scale (unit test).
- **Priority**: Must
- **Basis**: BR-05, FR-07, AC-02; UI scale badge; WB Step 21; TD-3

> Manual scale reselection by supervisor (brief FR-08) is **not** in scope for this build.

### Area 9 — Live weight

#### FR-13: Display live weight
- **Description**: The **Weighed now** readout shows the selected scale's net weight, refreshed by polling the Dummy Scale API every 100 ms (TD-10).
- **Acceptance Criteria**: When the simulator sets scale-3kg to 50.0 g, the readout shows `50.0 g` within 200 ms (NFR-1). Readings flagged unstable are shown but cannot be confirmed (FR-17).
- **Priority**: Must
- **Basis**: BR-06, FR-13, IR-10, IR-11, AC-03; UI live cell; WB Step 21; TD-10

### Area 10 — Target quantity

#### FR-14: Display target
- **Description**: The **Target** cell shows the active component's target quantity in its unit.
- **Acceptance Criteria**: Yellow RGB → `94.0 g`; Soda Ash → `9.600 kg`.
- **Priority**: Must
- **Basis**: FR-14; UI target cell

### Area 11 — Remaining quantity

#### FR-15: Display still-to-weigh
- **Description**: **Still to weigh** = max(0, target − net weight), in the component unit.
- **Acceptance Criteria**: Target 94.0 g, net 60.0 g → `34.0 g`; net 96.0 g → `0.0 g`.
- **Priority**: Must
- **Basis**: FR-14; UI still-to-weigh cell

### Area 12 — Tolerance

#### FR-16: Evaluate tolerance and signal zones
- **Description**: The tolerance band is **[target − tolerance, target + tolerance], boundaries inclusive**, using the component's absolute tolerance. The reading is classified into zones:
  - `under`: net < 90% of target
  - `near`: 90% of target ≤ net < lower bound
  - `ok`: lower bound ≤ net ≤ upper bound
  - `over`: net > upper bound

  The progress bar shows fill proportional to net / display range, the tolerance band (shaded), the target line, and the caption `TOLERANCE ±{tol} {u} ({lo} – {hi})` with the display maximum. The live readout, bar and status line colour by zone. Status line text:
  - under/near: `DISPENSE — {remaining} {u} REMAINING`
  - ok: `WITHIN TOLERANCE — PRESS OK TO CONFIRM`
  - over: `OVER TOLERANCE — SURPLUS +{surplus} {u}`
- **Acceptance Criteria** (Yellow RGB, 94.0 ± 0.5 g, band 93.5–94.5): 93.4 → not ok; 93.5 → ok; 94.0 → ok; 94.5 → ok; 94.6 → over. 84.6 (90%) → near; 84.5 → under. Automated unit tests cover all listed values (WB Step 22).
- **Priority**: Must
- **Basis**: BR-07, FR-15–FR-17, A-07 (absolute tolerance for training); UI zone(); WB Step 22

> The `near` threshold (90 %) and the per-component display range are **prototype choices** (AS-3, AS-4), not brief requirements.

### Area 13 — Confirmation

#### FR-17: Gate confirmation
- **Description**: **OK · Confirm (F1)** is enabled only when **all** hold: zone is `ok`; reading is stable; selected scale is online; no dyestuff identity mismatch is pending (FR-7). Otherwise it is disabled.
- **Acceptance Criteria**: OK disabled at 93.4 g and 94.6 g, enabled at 93.5/94.0/94.5 g; disabled while unstable or scale offline. The server independently re-validates tolerance and rejects an out-of-tolerance confirmation without override with `422 OUT_OF_TOLERANCE`.
- **Priority**: Must
- **Basis**: BR-07, FR-18, AC-04; UI btn-ok; WB Step 25

#### FR-18: Record the confirmed weighing
- **Description**: On confirmation the system persists an **immutable** weighing transaction containing: actual weight, operator, component, lot, container, tare, scale, timestamp — plus batch, session, target and tolerance bounds (snapshots), unit, and result (`IN_TOLERANCE` | `OVERRIDDEN`).
- **Acceptance Criteria**: After confirming Yellow RGB at 94.2 g, the stored record (retrievable through the WeighingMS API, see FR-27) contains all listed fields with correct values; a second attempt to modify it is refused.
- **Priority**: Must
- **Basis**: BR-11, FR-25, AC-07, DR-02; WB Step 25

#### FR-19: Supervisor override
- **Description**: **Supervisor override** lets a supervisor authorise confirmation of a weighing that is not in tolerance: the operator taps the button, the supervisor enters PIN and a mandatory reason; on success the weighing is recorded with result `OVERRIDDEN`, supervisor id, reason and time, and an audit event is written. Invalid PIN or empty reason → refused, nothing recorded. Applicability to `over` readings is finalised at WB Step 24.
- **Acceptance Criteria**: With the seeded supervisor PIN and a reason, an under-tolerance weight can be confirmed as `OVERRIDDEN`; wrong PIN → *"Supervisor authentication failed"*; empty reason → *"Reason is required"*. The PIN never appears in any API response or log.
- **Priority**: Must
- **Basis**: BR-13, FR-23, FR-24, FR-35, AC-06; UI override button; TD-7

#### FR-20: Quit (abandon component)
- **Description**: **Quit (F4)** abandons the current component weighing: the net reading is reset, nothing is recorded as a weighing, the component stays not-done, and an `ABANDON` audit event is written. The station remains in a safe state.
- **Acceptance Criteria**: After Quit at 60.0 g, no weighing record exists for the component, readout shows `0.0 g`, OK disabled, audit event present.
- **Priority**: Must
- **Basis**: FR-19; UI F4; WB Step 30 (Quit → safe exit)

### Area 14 — Overshoot

#### FR-21: Detect and block overshoot
- **Description**: When the net weight exceeds the upper tolerance bound, the system signals `over` (FR-16), shows the surplus magnitude (`actual − target`, TD-11), and blocks normal confirmation. Recovery is Quit and re-weigh (FR-20) or Supervisor override (FR-19) — exactly the same two recovery paths as any other non-`OK` zone, nothing overshoot-specific. **No recalculation of any other component's target is ever performed or suggested** (TD-11, Step 24 decision).
- **Acceptance Criteria**: Yellow RGB at 96.4 g → zone `over`, status starts `OVER TOLERANCE — SURPLUS`, OK disabled; Quit or Override are the only ways forward; no other component's `targetMg` ever changes as a result.
- **Priority**: Must
- **Basis**: BR-08, FR-20; UI surplus panel; WB Step 24, TD-11

> **Resolved at WB Step 24** (`evidence/STEP-24-overshoot-decision.md`, TD-11): surplus definition (OQ-16) is `actual − target`; compensation/recalculation of remaining components (OQ-07, brief A-08) is **not implemented** — the prototype's proposal was explicitly a guess, and this training build does not answer FCI's open question for them.

### Area 15 — Component progression

#### FR-22: Progress through components
- **Description**: After a confirmation the component is marked done (`✓ {actual}`), the weighed count increments, and the next pending component in sequence becomes active (re-tare + scale selection apply). The operator may also touch any **pending** component to make it active; **done** components cannot be reselected or re-weighed.
- **Acceptance Criteria**: Confirming Blue RSPL activates Red RB; then Yellow RGB; then Sodium Sulphate; then Soda Ash. Touching a done component has no effect. A component is never marked done without a valid confirmed (or overridden) weighing.
- **Priority**: Must
- **Basis**: FR-06; UI select()/btn-ok; WB Step 23

### Area 16 — Batch completion

#### FR-23: Complete the batch
- **Description**: When all components are done the system completes the session and shows screen *3 · Confirm & print* with the heading `Batch {id} weighed` and a summary: Components weighed `{n} of {N}`, All within tolerance `YES|NO` (NO if any weighing was overridden), Total dispensed (kg, 3 dp), Elapsed (session start → completion), Operator, Written to OrgaTEX (FR-24). Actions: **Print ticket (F1)**, **Next batch (F3)** (returns to the queue).
- **Acceptance Criteria**: Completion before 5/5 is impossible from the UI and rejected by the API with `409 BATCH_INCOMPLETE`. With the prototype's actuals (1241.5 g, 385.4 g, 94.2 g, 23.980 kg, 9.621 kg) the summary shows `5 of 5`, `YES`, `35.322 kg`.
- **Priority**: Must
- **Basis**: FR-26, UI view 3; WB Steps 23, 26, 30 (Incomplete batch → cannot complete)

### Area 17 — OrgaTEX write-back

#### FR-24: Post consumption to OrgaTEX
- **Description**: On batch completion the system posts actual consumption to Dummy OrgaTEX: `POST /api/batches/:batchId/consumption` with per-component dyestuff, lot, target, actual, unit, scale, result, operator and completion time, plus an idempotency key (session id). On `200 OK` the summary shows `Written to OrgaTEX · CONFIRMED {HH:MM:SS}`. If OrgaTEX is unavailable, the batch is still completed locally and the summary shows `PENDING` with **Retry** (TD-8). Retrying never creates a duplicate consumption record.
- **Acceptance Criteria**: Request and `200` response visible in network/API logs; Dummy OrgaTEX stores exactly one consumption record for B-24187 containing all five components; with OrgaTEX offline → `PENDING`, after bringing it online and pressing Retry → `CONFIRMED`; two posts with the same key → one stored record.
- **Priority**: Must
- **Basis**: BR-12, FR-26, IR-05, IR-08, AC-08; UI view 3; WB Step 26; TD-8

### Area 18 — Ticket generation

#### FR-25: Generate and print the weighing ticket
- **Description**: **Print ticket** sends the ticket to the Dummy Printer via `POST /api/tickets`. Ticket content: header `FCI DYEING — WEIGHING TICKET`; Batch, Order, Machine, Shade, Date (completion, `YYYY-MM-DD HH:MM`), Operator; one line per component with short name, target and actual in unit; tolerance summary (`ALL WITHIN TOLERANCE` or override note); barcode encoding the batch id; batch id under the barcode. The rendered ticket preview is shown on screen.
- **Acceptance Criteria**: For B-24187 the ticket contains all listed fields with the confirmed actuals; the printer API returns a job id and status; preview matches the stored ticket; printer offline → error *"Printer unavailable"* with Retry, preview still shown (TD-9).
- **Priority**: Must
- **Basis**: BR-15, FR-27, IR-16, AC-10; UI ticket; WB Step 27; TD-9

#### FR-26: Ticket reprint
- **Description**: A printed ticket can be reprinted; the reprint is marked `REPRINT` and logged as an audit event.
- **Acceptance Criteria**: Second print of the same ticket carries `REPRINT`; audit event `REPRINT` recorded.
- **Priority**: Could
- **Basis**: FR-28

### Area 19 — Operator traceability

#### FR-27: Attribute every action to an identity
- **Description**: The session operator (TD-6) is recorded on the session and every weighing; overrides record the supervisor; audit events (`OVERRIDE`, `ABANDON`, `REPRINT`) record actor and time. Weighing records for a session/batch are retrievable through the WeighingMS API for evidence and reconstruction.
- **Acceptance Criteria**: For a completed B-24187 session the API returns 5 weighing records each with operator `R. Karim`; any override shows supervisor id and reason; audit trail lists all privileged/abandon actions in time order.
- **Priority**: Must
- **Basis**: BR-11, BR-13, BR-14, BR-19, FR-25, FR-34, FR-36; WB Step 25

### Area 20 — Scale / scanner / printer failure (and OrgaTEX)

#### FR-28: Show device and integration status
- **Description**: The status strip continuously shows `SCALE 3 kg · {READY|OFFLINE}`, `SCALE 32 kg · {READY|OFFLINE}`, `SCANNER`, `PRINTER`, `ORGATEX · {LINKED HH:MM|UNAVAILABLE}`, language `EN` and a clock, each with a coloured status dot.
- **Acceptance Criteria**: Taking any Dummy device offline turns its indicator to the failure state within 2 s; bringing it back restores it.
- **Priority**: Must
- **Basis**: IR-18, FR-32 (link state only); UI status strip

#### FR-29: Scale unavailable — safe failure
- **Description**: If the selected scale stops responding or reports offline, the live readout shows `SCALE OFFLINE`, the status line explains the problem, and confirmation is disabled. Weighing resumes when the scale returns; no reading taken while offline is ever recorded.
- **Acceptance Criteria**: Offline detected and OK disabled within 2 s (IR-13); recovery restores live weight without reloading.
- **Priority**: Must
- **Basis**: IR-13; WB Step 30

#### FR-30: Invalid weight reading
- **Description**: A reading that is negative, non-numeric, missing, or above the scale capacity is treated as invalid: readout shows `INVALID READING`, OK is disabled.
- **Acceptance Criteria**: Simulator value −5 g or 3 500 g on scale-3kg → `INVALID READING`, OK disabled.
- **Priority**: Must
- **Basis**: C-06; WB Step 30 (Invalid weight)

#### FR-31: OrgaTEX unavailable
- **Description**: If the queue or recipe cannot be loaded, the screen shows *"OrgaTEX unavailable — Retry"* and no stale or invented data. A batch already loaded can continue to be weighed; at completion TD-8 applies.
- **Acceptance Criteria**: With Dummy OrgaTEX offline: queue shows the error and Retry; an in-progress batch can still be weighed to completion; write-back `PENDING` then `CONFIRMED` after Retry.
- **Priority**: Must
- **Basis**: BR-16 (spirit), IR-09; WB Step 30; TD-8

#### FR-32: Printer and scanner unavailable
- **Description**: Printer offline → TD-9 behaviour. Scanner offline → status strip shows it, scanning is unavailable, all actions remain possible by touch.
- **Acceptance Criteria**: As TD-9; with scanner offline, batch can be selected by touch.
- **Priority**: Must
- **Basis**: IR-18; WB Step 30; TD-9

### Cross-cutting

#### FR-33: Keyboard function keys
- **Description**: Physical keys duplicate touch actions: **F1** OK/Confirm (and Print ticket on screen 3), **F2** Re-tare, **F3** Next batch, **F4** Quit — subject to the same enablement rules.
- **Acceptance Criteria**: Pressing F1 when OK is disabled does nothing; pressing F1 when enabled confirms.
- **Priority**: Should
- **Basis**: IR-17 (as keys), UI `fn` labels

#### FR-34: Training simulator panel
- **Description**: A training control panel, visibly separate from the station screen, drives the Dummy integrations: **Simulate dispense** (ramp to an in-tolerance value), **Simulate overshoot** (ramp above tolerance), set exact weight, toggle each device / OrgaTEX online-offline, inject a scan, **Reset** scenario. It calls Dummy simulator endpoints only — never the station's own state.
- **Acceptance Criteria**: All workbook demo and failure scenarios (Steps 21–30, 35) can be performed from the panel without editing code or data.
- **Priority**: Must
- **Basis**: UI controls (Simulate dispense / overshoot / Reset); WB Steps 21–30, 35

---

## Non-Functional Requirements

### Performance
| ID | Requirement | Metric | Target | Basis |
|----|-------------|--------|--------|-------|
| NFR-1 | Live weight latency | Time from simulator weight change to displayed value | ≤ 200 ms (100 ms poll) | NFR-01, TD-10 |
| NFR-2 | Recipe display time | Batch selection → recipe rendered (local) | ≤ 3 s | NFR-02, AC-01 |

### Usability
| ID | Requirement | Metric | Target | Basis |
|----|-------------|--------|--------|-------|
| NFR-3 | Gloved-hand operation | Min size of primary action targets | ≥ 15 mm (≥ 60 px at 96 dpi; action keys ≥ 62 px high as prototype) | NFR-07, BR-20 |
| NFR-4 | Readout legibility | Live weight font size | ≥ 52 px, high-contrast dark HMI theme as prototype | NFR-08 |
| NFR-5 | Accessibility basics | Progress bar exposes role/aria values; animations respect reduced-motion | Present | UI prototype |

### Data integrity & reliability
| ID | Requirement | Metric | Target | Basis |
|----|-------------|--------|--------|-------|
| NFR-6 | Session resumability | Browser reload during weighing | Resumes at the same active component with all prior confirmations | NFR-06 |
| NFR-7 | Durability | Confirmation acknowledged only after persistence | 100 % of acknowledged weighings present after server restart | NFR-05 |
| NFR-8 | Fixed-point arithmetic | Quantities stored/computed as integer mg | No floating-point quantity arithmetic in domain code (lint/test) | NFR-16 |
| NFR-9 | Immutability | Update/delete of confirmed weighing records | Not possible via any API | DR-02, NFR-13 |
| NFR-10 | Idempotent write-back | Duplicate consumption posts with same key | Exactly one stored record | IR-08 |

### Security
| ID | Requirement | Metric | Target | Basis |
|----|-------------|--------|--------|-------|
| NFR-11 | Supervisor credential handling | PIN exposure | Never returned by API, never logged; stored hashed in seed | NFR-12 |

### Testability & operability
| ID | Requirement | Metric | Target | Basis |
|----|-------------|--------|--------|-------|
| NFR-12 | Deterministic training scenario | Reset → known state | Reset restores seed (TD-1, TD-2) in < 2 s | WB Steps 17, 29 |
| NFR-13 | Automated verification | Tests | Tolerance boundary unit tests; API tests per endpoint; Playwright E2E of full B-24187 flow and Step 30 failures | WB Steps 18, 22, 29, 30 |
| NFR-14 | Externalisable text | Operator-facing strings | Defined in one message catalogue (English only) | NFR-11 (deferred localisation) — Could |

### Scalability / Compliance
Single station, single active session, local deployment (A-11). No regulatory compliance targets for the training build; retention (DR-01) deferred.

---

## Training-only Dummy Behaviour

These exist only because the real systems are absent. They are **training contracts**, not claims about OrgaTEX/SETEX, scale indicators, scanners or printers.

| ID | Dummy | Behaviour |
|----|-------|-----------|
| DB-1 | OrgaTEX | Serves seeded batch queue, batch detail and recipes via `GET /api/batches`, `GET /api/batches/:batchId`, `GET /api/batches/:batchId/recipe`. |
| DB-2 | OrgaTEX | Accepts `POST /api/batches/:batchId/consumption`, stores the record, returns `200` with confirmation timestamp; honours idempotency key. |
| DB-3 | Scale | Two scales: `scale-3kg` (precision, capacity 3 000 g, display 0.1 g) and `scale-32kg` (floor, capacity 32 kg, display 0.001 kg). `GET /api/scales`, `GET /api/scales/:scaleId/status`, `GET /api/scales/:scaleId/weight` (net, stable flag, status, timestamp), `POST /api/scales/:scaleId/tare`. |
| DB-4 | Scale | Simulator: set exact weight (stable); ramp to target value over time (unstable while ramping, eased like the prototype's pour); set offline/online; inject invalid reading. |
| DB-5 | Scanner | Trainer injects a scan (batch card or dyestuff barcode); the station receives scan events from the Dummy Scanner API; keyboard-wedge entry also accepted. Online/offline toggle. Exact contract defined in design. |
| DB-6 | Printer | `POST /api/tickets` creates a print job, stores the ticket, returns job id, status and rendered content for preview; online/offline toggle. |
| DB-7 | All | Any Dummy can be set unavailable → its endpoints return `503` with error code (`ORGATEX_UNAVAILABLE`, `SCALE_UNAVAILABLE`, `SCANNER_UNAVAILABLE`, `PRINTER_UNAVAILABLE`). |
| DB-8 | Seed / reset | Versioned seed file reproduces the prototype scenario (batches, recipe, dyestuffs with colours/barcodes, lots, containers & tares, scales, operator R. Karim, one supervisor with PIN). Reset restores it. |

### Seed scenario (B-24187 · SO-9931 · JET-04 · Teal 4C · 100% CTN knit · 480 kg)

| Seq | Component | Code | Target | Tol ± | Scale (TD-3) | Lot | Container | Tare | Display max |
|-----|-----------|------|--------|-------|--------------|-----|-----------|------|-------------|
| 1 | Remazol Brill. Blue RSPL | DYE-1180 | 1240.0 g | 6.0 g | 3 kg precision | 2026-0341 | C-09 | 214 g | 1600 g |
| 2 | Remazol Red RB | DYE-2204 | 386.0 g | 2.0 g | 3 kg precision | 2026-0298 | C-11 | 214 g | 520 g |
| 3 | Remazol Yellow RGB | DYE-4471 | 94.0 g | 0.5 g | 3 kg precision | 2026-0387 | C-12 | 214 g | 125 g |
| 4 | Sodium Sulphate | AUX-0101 | 24.000 kg | 0.120 kg | 32 kg floor | 2026-0112 | D-03 | 1.850 kg | 32 kg |
| 5 | Soda Ash | AUX-0107 | 9.600 kg | 0.048 kg | 32 kg floor | 2026-0155 | D-05 | 1.850 kg | 14 kg |

Queue: B-24187 RELEASED; B-24188 (SO-9931, JET-07, 100% CTN knit · 520 kg, Teal 4C, 5) QUEUED; B-24190 (SO-9944, JET-02, CVC fleece · 310 kg, Navy 12, 7) QUEUED; B-24191 (SO-9947, WINCH-01, Viscose jersey · 190 kg, Rose 08, 4) QUEUED.

---

## Assumptions (training build)

| ID | Assumption | Risk if Invalid | Mitigation |
|----|------------|-----------------|------------|
| AS-1 | Absolute ± tolerance per component (seed values) is adequate for training | Real rule may be % with floor or banded (A-07) | Tolerance evaluated in one pure function; rule shape replaceable |
| AS-2 | 3 000 g selection threshold (TD-3) | FCI rule differs (A-06) | Threshold in configuration |
| AS-3 | `near` zone starts at 90 % of target (prototype) | Operators may want a different cue | Configurable constant |
| AS-4 | Progress-bar display range per component from seed (prototype values) | Real range rule unknown | Seed field; replaceable |
| AS-5 | Polling at 10 Hz is sufficient for a smooth live readout on a local network | Choppy display on slow machines | Transport behind a client hook; SSE possible later |
| AS-6 | One station, one operator, one open session at a time | Multi-station later (A-11) | Station id carried on sessions |

---

## Unresolved Questions (carried forward)

OQ-01, OQ-02, OQ-04, OQ-06, OQ-12, OQ-13, OQ-15 remain open for the real product (Dummy behaviour used meanwhile). OQ-03, OQ-05, OQ-07, OQ-08, OQ-09, OQ-10, OQ-11, OQ-14, OQ-16 are closed **for the training build only** by TD-8, TD-3, TD-11, TD-7, TD-4, TD-5, TD-6, TD-1, TD-11 respectively.

---

## Requirement Quality Checklist

- [x] All requirements are testable (measurable, not vague)
- [x] Acceptance criteria are binary (pass/fail)
- [x] NFRs have specific metrics and targets
- [x] Dependencies are identified (Dummy APIs DB-1…DB-8)
- [x] Constraints are documented
- [x] Assumptions are stated and risks assessed
- [x] Every requirement traces to brief, prototype, workbook or training decision
