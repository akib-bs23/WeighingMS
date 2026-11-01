# Data Stack

## Overview

WeighingMS persists its own records and the Dummy OrgaTEX store in a single local SQLite database accessed through Drizzle ORM on better-sqlite3. Dummy OrgaTEX reference data is seeded from a versioned JSON file so every demo and test starts from the same training scenario.

Approved: 2026-10-29 (project-init, human validated)

## Database

**SQLite**

- Dev/demo: file database (e.g. `data/weighingms.db`, git-ignored) — stored transactions and consumption records can be opened and shown as evidence (workbook Step 26).
- Tests: in-memory SQLite, freshly migrated and seeded per test run/suite for deterministic results.
- Fit: single station, single active operator, a handful of batches and hundreds of records; no database server to install or operate on a training laptop.

### What is stored

| Owner | Data | Access by WeighingMS |
|-------|------|----------------------|
| Dummy OrgaTEX | Batches (queue), recipes & components, targets, tolerances, dyestuff master/lots | Read-only |
| Dummy OrgaTEX | Consumption write-backs received from WeighingMS | Write via OrgaTEX API only (`POST .../consumption`) |
| Dummy devices | Scale configuration & simulated state, printer job log | Via device APIs only |
| WeighingMS | Weighing transactions (actual weight, operator, component, lot, container, tare, scale, timestamp), overrides, batch completion state, tickets | Read/write |

**Ownership rule:** WeighingMS never modifies OrgaTEX-owned reference data and never reaches into another system's tables directly; it goes through that system's (Dummy) API. Separate tables/modules per owner keep the boundary visible even though one SQLite file is used.

### Seeding & reset

- Reference data seeded from a versioned JSON seed file (training scenario: batch B-24187 / SO-9931 / JET-04 / Teal 4C with five components, plus queued batches B-24188, B-24190, B-24191).
- A training-only reset endpoint/command restores the seed scenario for repeatable demos.

## ORM / Database Client

**Drizzle ORM + better-sqlite3**

- TypeScript-first schema definitions give type-safe queries that share types with the API contracts.
- `drizzle-kit` manages schema migrations.
- better-sqlite3 is synchronous and fast, with prebuilt binaries for Node 18–24.
- Integrated into NestJS as an injectable database provider; repositories wrap Drizzle so domain/application code does not depend on the ORM directly.

## Decision Relationships

- SQLite + Drizzle chosen over PostgreSQL/Prisma because the lab runs locally with no database server and no code-generation step, while still giving real, inspectable persistence.
- In-memory SQLite in tests aligns with Vitest (unit/API) and keeps Playwright E2E runs resettable through the seed/reset mechanism.
- Production storage, retention and backup (brief: data retention, backup, offline sync) are out of scope for the training build and remain open questions for Inception.
