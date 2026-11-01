# Coding Standards

## Overview

Code style and quality standards for WeighingMS (TypeScript, NestJS, React + Vite, Drizzle/SQLite, pnpm). Standards favour explicitness and testability: weights and tolerances are safety-relevant, so units are explicit in names and domain rules are pure, shared and unit-tested.

Approved: 2026-10-29 (project-init, human validated)

## Code Formatting

**Prettier**

- 2-space indent, single quotes, semicolons, trailing commas (`all`), print width 100.
- Format on save; `pnpm format` writes, `pnpm format:check` verifies.
- Prettier owns formatting; ESLint does not enforce stylistic rules (`eslint-config-prettier`).

## Linting

**ESLint (flat config) + typescript-eslint `strict`** and `eslint-plugin-react-hooks`.

- TypeScript `strict: true` in all tsconfigs.
- No `any` unless justified with an inline comment; prefer `unknown` + narrowing.
- `@typescript-eslint/no-floating-promises` and `no-misused-promises` enabled.
- No unused variables/imports; no non-null assertions (`!`) in domain code.
- `pnpm lint` must pass before a Bolt's Test stage is marked complete.

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Server files | kebab-case, Nest role suffix | `batch.service.ts`, `scale.controller.ts`, `consumption.dto.ts` |
| React components | PascalCase `.tsx` | `WeighScreen.tsx`, `ToleranceGauge.tsx` |
| Other client/shared files | kebab-case | `use-live-weight.ts`, `tolerance.ts` |
| Classes, interfaces, types | PascalCase | `WeighingTransaction`, `ScalePort` |
| Functions, variables | camelCase | `evaluateTolerance()`, `remainingGrams` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_POLL_INTERVAL_MS` |
| DB tables/columns | snake_case | `weighing_transactions.actual_grams` |
| API JSON fields | camelCase | `{ "targetGrams": 94.0 }` |
| Booleans | `is/has/can` prefix | `isStable`, `canConfirm` |

**Units must be explicit** in names of every quantity: `targetGrams`, `toleranceGrams`, `tareGrams`, `capacityKg`, `pollIntervalMs`. Internally, mass is stored and computed in **grams**; conversion to display units (g/kg) happens only at the presentation edge.

## File Organization

Single pnpm package, matching the workbook's expected repository layout:

```text
src/
├── server/                 # NestJS application
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/             # exception filter, errors, logging, config
│   ├── database/           # Drizzle schema, migrations, provider, seed/reset
│   ├── <domain>/           # e.g. batches/, weighing/, tickets/ — module, controller, service, dto, repository
│   └── integrations/
│       ├── orgatex/        # port (interface) + dummy adapter + dummy API controller
│       ├── scale/          # port + dummy adapter + simulator controller
│       ├── scanner/
│       └── printer/
├── client/                 # React + Vite SPA
│   ├── main.tsx
│   ├── api/                # typed HTTP client (only place that calls fetch)
│   ├── features/           # batch-selection/, weighing/, confirm-print/
│   └── components/         # shared presentational components
└── shared/                 # contract types + pure domain rules used by both sides
tests/                      # Vitest unit + API tests (mirrors src/)
playwright/                 # Playwright E2E specs and config
data/                       # seed JSON (versioned); *.db files git-ignored
```

Rules:
- UI components never contain scenario data; all data comes through `client/api/` from the backend (workbook Rule 5).
- Domain code depends on integration **ports**, never on Dummy adapters directly; adapters are bound via Nest DI.
- Pure business rules (tolerance evaluation, progression, overshoot policy) live in `src/shared/` or server domain services with no framework imports.

## Testing Strategy

| Level | Tool | Scope |
|-------|------|-------|
| Unit | **Vitest** | Pure domain rules: tolerance boundaries (e.g. 93.4 ✗ / 93.5 ✓ / 94.0 ✓ / 94.5 ✓ / 94.6 ✗), remaining quantity, progression, overshoot policy, unit conversion |
| API | **Vitest** + `@nestjs/testing` + `supertest` (via `unplugin-swc` for decorator metadata) | Every Dummy and application endpoint, incl. error/unavailable cases, against in-memory SQLite |
| Component | **Vitest** + **React Testing Library** | Key UI states: confirm disabled/enabled, tolerance status, scale switch, failure banners |
| End-to-end | **Playwright** | Full workbook scenario (B-24187, five components → write-back → ticket) and failure scenarios, against a seeded app |

- **Coverage target:** ≥ 80% lines/branches for `src/shared` and server domain code; critical rules (tolerance, confirmation gating) at 100% branch coverage.
- **Naming:** behaviour sentences — `it('rejects confirmation when weight is below tolerance')`.
- **Mocking:** only at system boundaries. The Dummy integrations *are* the test doubles for real devices; do not mock domain services.
- **Test data:** derived from the seed JSON fixture; each test suite starts from a freshly migrated, seeded in-memory DB.
- Every Bolt's Test stage runs `pnpm lint`, `pnpm test`, and (when UI is affected) `pnpm test:e2e`.

## Error Handling

- Domain errors are typed classes extending a base `DomainError` with a stable `code` (e.g. `OUT_OF_TOLERANCE`, `SCALE_UNAVAILABLE`, `ORGATEX_UNAVAILABLE`, `PRINTER_UNAVAILABLE`, `BATCH_INCOMPLETE`).
- A global Nest exception filter maps errors to a consistent JSON body and status:

  ```json
  { "error": { "code": "SCALE_UNAVAILABLE", "message": "Scale scale-3kg is not responding", "details": {} } }
  ```

  | Category | HTTP status |
  |----------|-------------|
  | Validation (DTO) | 400 |
  | Not found | 404 |
  | Business rule violation (e.g. out of tolerance, incomplete batch) | 409 / 422 |
  | Device / OrgaTEX unavailable | 503 |
  | Unexpected | 500 (no internals leaked) |

- The UI never fails silently: every error is shown to the operator with its code-derived message and a safe recovery action (retry, re-tare, quit). Device failures put the station into a safe state where confirmation is impossible.

## Logging

- NestJS `Logger` with a class/context name; structured context fields where relevant: `batchId`, `componentId`, `scaleId`, `operatorId`.
- `info`: confirmations, overrides, batch completion, OrgaTEX write-back, ticket print, device state changes.
- `warn`: rejected confirmations, device unavailable, retries.
- `error`: unexpected failures (with stack, server-side only).
- Never log PINs, credentials or secrets.
- The authoritative audit trail (who weighed what, overrides) lives in the database, not in logs.

## Scripts (pnpm)

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Run NestJS (watch) + Vite dev server |
| `pnpm build` | Build server and client |
| `pnpm start` | Start built app (API + Dummy integrations + UI) |
| `pnpm test` | Vitest unit/API/component tests |
| `pnpm test:e2e` | Playwright suite |
| `pnpm lint` / `pnpm format` | ESLint / Prettier |
| `pnpm db:migrate` | Apply Drizzle migrations |
| `pnpm db:reset` | Reset DB and reload the training seed scenario |
