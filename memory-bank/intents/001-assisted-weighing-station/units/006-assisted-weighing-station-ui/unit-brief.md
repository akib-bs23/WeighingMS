---
unit: 006-assisted-weighing-station-ui
intent: 001-assisted-weighing-station
phase: inception
status: complete
unit_type: frontend
default_bolt_type: simple-construction-bolt
created: 2026-10-29T09:24:35Z
updated: 2026-10-31T11:45:00Z
---

# Unit Brief: Assisted Weighing Station UI

## Purpose

Reproduce the functional experience of the supplied prototype as a React SPA on the 15" station terminal — station frame, **1 · Select batch**, **2 · Weigh**, **3 · Confirm & print** — driven entirely by backend APIs, plus a separate **trainer simulator panel** for demos and failure scenarios.

## Scope

### In Scope
- Station frame: top bar (brand, station, batch crumb, operator chip), status strip (scales, scanner, printer, OrgaTEX link green/red, EN, clock)
- Screen 1: scan prompt, queue table, rejection messages, OrgaTEX-unavailable state
- Screen 2: recipe rail, component header, scale badge, 3 readouts, progress bar with band + target line, caption, status line, overshoot panel, OK/Re-tare/Quit/Override keys, override dialog (PIN + reason), identity scan feedback, offline/invalid states
- Screen 3: summary, write-back status (CONFIRMED / PENDING + Retry), ticket preview with Code 128, Print ticket, Next batch
- F-keys F1/F2/F3/F4; keyboard-wedge scan input
- Typed API client (only place calling fetch); live-weight polling hook (100 ms)
- Trainer panel: simulate dispense / overshoot, set weight, device & OrgaTEX on/off, inject scan, reset
- Visual fidelity to prototype tokens (dark HMI, zone colours, mono tabular numerals, ≥ 62 px keys)
- Component tests and the Playwright E2E + failure suites

### Out of Scope
- Business rules (consumed from `src/shared` and backend); question pins; demo screen switcher

---

## Assigned Requirements

| Req | Requirement | Priority |
|-----|-------------|----------|
| FR-4 | Batch context in top bar | Must |
| FR-13 | Display live weight (100 ms poll) | Must |
| FR-14 | Display target | Must |
| FR-28 | Device and integration status strip | Must |
| FR-33 | Function keys | Should |
| FR-34 | Trainer simulator panel | Must |
| NFR-1 | Live weight ≤ 200 ms | Must |
| NFR-3 | Touch targets ≥ 15 mm | Must |
| NFR-4 | Live weight ≥ 52 px | Must |
| NFR-5 | Accessibility basics | Should |
| NFR-14 | Externalised strings | Could |

Plus the **UI side** of FR-1, 2, 3, 5 (003); FR-6–FR-12, FR-15–FR-23, FR-29–FR-30 (004); FR-24 (001); FR-25–FR-26 (005); FR-31–FR-32.

---

## Domain Concepts

### Key Entities (view models)
| Entity | Description |
|--------|-------------|
| QueueRow, SessionView, ComponentRow, LiveReading, ZoneState, DeviceStatus, CompletionSummary, TicketPreview | Typed from shared API contracts |

### Key Operations
| Operation | Description |
|-----------|-------------|
| Navigate by state | queue → weigh → done → queue (no free screen switcher) |
| Poll weight | 100 ms, stop on unmount / scale change |
| Dispatch actions | select, confirm, retare, quit, override, complete, print, retry write-back, next batch |

---

## Story Summary

- **Total Stories**: 10
- **Must Have**: 9
- **Should Have**: 1
- **Could Have**: 0

### Stories

- [ ] **001-station-shell-and-api-client**: Station shell, top bar and typed API client - Must - Planned
- [ ] **002-batch-selection-screen**: Screen 1 · Select batch - Must - Planned
- [ ] **003-weigh-screen-recipe-rail-and-component-header**: Screen 2 · Recipe rail, component header and scale badge - Must - Planned
- [ ] **004-live-weight-readouts-and-progress-bar**: Screen 2 · Live weight, readouts, progress bar and status line - Must - Planned
- [ ] **005-weigh-actions**: Screen 2 · OK, Re-tare, Quit, Supervisor override and overshoot panel - Must - Planned
- [ ] **006-confirm-and-print-screen**: Screen 3 · Confirm & print - Must - Planned
- [ ] **007-device-status-strip-and-failure-states**: Status strip and failure states - Must - Planned
- [ ] **008-function-keys**: Function keys F1–F4 - Should - Planned
- [ ] **009-trainer-simulator-panel**: Trainer simulator panel - Must - Planned
- [ ] **010-end-to-end-and-failure-test-suites**: End-to-end and failure Playwright suites - Must - Planned

---

## Dependencies

### Depends On
| Unit | Reason |
|------|--------|
| 003-batch-management | Screen 1 data |
| 004-weighing-station | Screens 2/3 behaviour + shared rules |
| 005-ticket-printing | Ticket preview/print |
| 002-device-integration | Live weight, scans, simulator |
| 001-orgatex-integration | Write-back status/retry; OrgaTEX toggle; reset |

### Depended By
None.

---

## Technical Context

### Suggested Technology
React + Vite, CSS modules or plain CSS with prototype tokens; React Testing Library; Playwright.

---

## Constraints

- No scenario data in UI source (workbook Rule 5); must not copy the prototype JavaScript (Step 20).

---

## Success Criteria

### Functional
- [ ] Full B-24187 five-component flow in Playwright → CONFIRMED write-back → ticket
- [ ] Step 30 failure scenarios each demonstrable from the trainer panel
- [ ] Screens visually comparable to prototype (Step 28)

### Non-Functional
- [ ] Live weight ≤ 200 ms; keys ≥ 62 px; live digits ≥ 52 px

### Quality
- [ ] Component tests for key states; E2E green

---

## Bolt Suggestions

| Bolt | Type | Focus |
|------|------|-------|
| bolt 1 | Simple | App shell, API client, station frame, Screen 1 |
| bolt 2 | Simple | Screen 2 (weighing) incl. live weight, zones, actions, override dialog |
| bolt 3 | Simple | Screen 3 + ticket + write-back status; trainer panel |
| bolt 4 | Simple | E2E + failure suites, F-keys, UI validation vs prototype |
