# WeighingMS

Assisted dyestuff weighing station for a textile dyehouse (client: FCI), integrated with
OrgaTEX (MES, by SETEX). A training build: all external systems — OrgaTEX, weighing scales,
barcode scanner, ticket printer — are Dummy adapters behind real ports, never hard-coded UI data.

Built end to end using the specs.md AI-DLC methodology (Inception → Construction, bolt by bolt,
with a human checkpoint at every stage). See `workbook.md` for the lab this project follows,
`memory-bank/` for the full specs.md artifact trail, and `FINAL-EVIDENCE.md` for the
requirement-by-requirement evidence matrix.

## What it does

An operator selects a released batch from the OrgaTEX queue, weighs each recipe component in
sequence against its target and tolerance (switching scales automatically by component size),
confirms within tolerance (or uses a supervisor override for an out-of-tolerance reading),
completes the batch, writes the consumption record back to OrgaTEX, and prints a weighing
ticket.

## Stack

TypeScript (strict), React + Vite SPA, NestJS/Express backend, Drizzle ORM + better-sqlite3,
pnpm, Vitest (unit/integration) + Playwright (end-to-end), ESLint + Prettier.

## Running it

```bash
pnpm install
pnpm dev          # server on :3000, client on :5173
```

Reset the training scenario to its seeded state at any time:

```bash
pnpm db:reset
```

## Testing

```bash
pnpm test         # Vitest — 571 tests
pnpm test:e2e      # Playwright — 19 end-to-end/failure-scenario tests
pnpm lint
pnpm typecheck
```

## Project layout

```
docs/            Product brief and UI/UX reference used during Inception
memory-bank/     specs.md artifacts: standards, intents, units, stories, bolts, construction logs
src/             Application source (client, server, shared)
tests/           Vitest unit/integration tests
playwright/      End-to-end and failure-scenario specs
evidence/        Workbook evidence trail, step by step
FINAL-EVIDENCE.md   Requirement-by-requirement evidence matrix (workbook Step 34)
workbook.md      The AI-DLC lab this project was built against
```

## Status

All 12 planned bolts complete across 6 units; 34 functional requirements, 14 non-functional
requirements, 11 training decisions, and 8 dummy-integration behaviours implemented and tested.
See `FINAL-EVIDENCE.md` for the full trace and `evidence/STEP-35-demonstration/` for a live
walkthrough.
