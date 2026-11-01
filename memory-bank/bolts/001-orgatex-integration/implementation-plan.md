---
stage: plan
bolt: 001-orgatex-integration
created: 2026-10-29T09:55:00Z
---

## Implementation Plan: orgatex-integration (bolt 1 of 2)

### Objective

Create the runnable WeighingMS project skeleton (per approved standards) and the **read side of the Dummy OrgaTEX**: training seed + reset, `GET /api/batches`, `GET /api/batches/:batchId`, `GET /api/batches/:batchId/recipe`, the `OrgatexPort` with its Dummy adapter, and an OrgaTEX availability toggle. No UI screens yet (UI shell is bolt 005).

### Stories in Scope

- **001-project-scaffold-and-training-seed** (Must) — DB-8, NFR-12, tooling
- **002-dummy-orgatex-serves-batch-queue** (Must) — DB-1
- **003-dummy-orgatex-serves-recipe** (Must) — DB-1
- **006-orgatex-availability-toggle** (Must) — DB-7

Workbook steps delivered: **16** (Dummy OrgaTEX part), **17** (seed data), **18** (API tests).

### What Will Change

The repository goes from documentation-only to a runnable single-package TypeScript project:

1. **Tooling**: pnpm project, TypeScript strict, ESLint (flat) + typescript-eslint strict + Prettier, Vitest (+ `unplugin-swc` for Nest decorators), Playwright config (empty suite for now), `.gitignore`.
2. **Server**: NestJS app (`/api` global prefix, port **3000**), global exception filter producing `{ error: { code, message, details? } }`, health endpoint.
3. **Database**: Drizzle ORM + better-sqlite3; file DB `data/weighingms.db` (git-ignored) in dev, in-memory in tests; migrations via drizzle-kit.
4. **Training seed & reset**: versioned `data/seed.json` (whole prototype scenario); loader converts decimal strings with units to **integer mg**; reset registry so later modules (scales, sessions, tickets) can register their own reset hooks.
5. **Dummy OrgaTEX** module: tables, read endpoints, availability toggle.
6. **OrgatexPort** (interface in WeighingMS integration layer) + **Dummy adapter** bound via Nest DI.
7. **Client**: minimal Vite + React placeholder page only so `pnpm dev` starts both halves (proxy `/api` → 3000, port **5173**). No screens.

### Deliverables (files to be created)

Root / tooling
- `package.json` — scripts: `dev`, `dev:server`, `dev:client`, `build`, `start`, `test`, `test:e2e`, `lint`, `format`, `format:check`, `db:generate`, `db:migrate`, `db:reset`
- `pnpm-workspace.yaml` — allow-list native build scripts (better-sqlite3, @swc/core, esbuild) required by pnpm 11
- `tsconfig.json`, `tsconfig.server.json`, `tsconfig.client.json`
- `nest-cli.json` (SWC builder, `sourceRoot: src/server`)
- `vite.config.ts` (root `src/client`, `/api` proxy)
- `vitest.config.ts` (node env for server/shared, `unplugin-swc`)
- `playwright.config.ts` → `playwright/` (suite added in later bolts)
- `eslint.config.mjs`, `.prettierrc`, `.gitignore`
- `drizzle.config.ts`

Shared
- `src/shared/contracts/orgatex.ts` — `OrgatexBatch`, `OrgatexRecipe`, `OrgatexRecipeComponent`, `BatchStatus`, `Uom` types (used by server and, later, UI)
- `src/shared/quantity/parse-quantity.ts` — decimal string + uom → integer mg (no floating point)

Server
- `src/server/main.ts`, `src/server/app.module.ts`
- `src/server/common/errors/domain-error.ts` (+ `not-found`, `unavailable` subclasses)
- `src/server/common/filters/http-exception.filter.ts`
- `src/server/common/health/health.controller.ts` — `GET /api/health`
- `src/server/database/database.module.ts`, `database.provider.ts`, `schema/orgatex.ts`, `migrations/*`
- `src/server/training/seed/seed-schema.ts` (validation), `seed-loader.ts`, `reset.registry.ts`, `training.controller.ts` (`POST /api/training/reset`), `training.module.ts`
- `src/server/integrations/orgatex/orgatex.port.ts` — interface + DI token
- `src/server/integrations/orgatex/dummy/dummy-orgatex.controller.ts` — the three GET endpoints
- `src/server/integrations/orgatex/dummy/dummy-orgatex.service.ts` — reads Dummy tables, availability state
- `src/server/integrations/orgatex/dummy/dummy-orgatex.adapter.ts` — implements `OrgatexPort` (in-process call to the Dummy service, records last successful contact)
- `src/server/integrations/orgatex/dummy/orgatex-training.controller.ts` — availability toggle/status
- `src/server/integrations/orgatex/orgatex.module.ts`

Client (placeholder)
- `src/client/index.html`, `src/client/main.tsx`, `src/client/App.tsx` — "WeighingMS — station UI arrives in bolt 005"

Data & evidence
- `data/seed.json` — training scenario (also copied to `evidence/STEP-17-dummy-data.json`)

Tests
- `tests/shared/parse-quantity.test.ts`
- `tests/server/training/seed-loader.test.ts`
- `tests/server/integrations/orgatex/dummy-orgatex.api.test.ts`
- `tests/server/integrations/orgatex/orgatex-availability.api.test.ts`
- `tests/server/integrations/orgatex/dummy-orgatex.adapter.test.ts`
- `tests/server/training/reset.api.test.ts`
- `tests/server/health.api.test.ts`

### APIs Involved

Dummy OrgaTEX (training contract — **not** a claim about the real OrgaTEX interface; exact paths per workbook Step 16):

| Method | Path | Success | Errors |
|--------|------|---------|--------|
| GET | `/api/batches` | `200` array of batches | `503 ORGATEX_UNAVAILABLE` |
| GET | `/api/batches/:batchId` | `200` batch | `404 BATCH_NOT_FOUND`, `503` |
| GET | `/api/batches/:batchId/recipe` | `200` recipe with components | `404 BATCH_NOT_FOUND` / `404 RECIPE_NOT_FOUND`, `503` |

Batch fields: `batchId, orderRef, machineRef, fabricDesc, fabricWeightKg, shadeCode, componentCount, status, recipeId`.
Recipe: `batchId, recipeId, shadeCode, components[]` with `componentId, sequence, dyestuff { code, name, type, colourHex, barcode }, targetMg, uom, toleranceMg, displayMaxMg, lotId, containerId`.

Training controls (prefix `/api/training`, never used by the station screens):

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/training/reset` | Restore seed for all registered modules (< 2 s) |
| GET / PUT | `/api/training/orgatex` | Read / set `{ online }`; GET also returns `lastServedAt` |

Infrastructure: `GET /api/health` → `{ status: 'ok' }`.

### Dependencies

- **Approved standards** (`tech-stack.md`, `data-stack.md`, `coding-standards.md`) — define every tool choice above.
- **npm registry access** to install packages (NestJS 11, React 19, Vite, Drizzle, better-sqlite3, Vitest, Playwright, ESLint, Prettier, unplugin-swc, supertest).
- **No other bolts** — this is the foundation; enables 002, 003, 004.

### Technical Approach

- **Quantities**: seed stores human-readable decimal strings with units (e.g. `"1240.0" g`, `"24.000" kg`); `parseQuantity` converts by string arithmetic to integer mg (1240.0 g → 1 240 000 mg; 24.000 kg → 24 000 000 mg). Database columns are integers. No `Number` float maths on quantities.
- **Seed slices**: `data/seed.json` holds the **whole** training scenario (OrgaTEX batches/dyestuffs/recipe, containers, scales, operators). This bolt loads and validates the **OrgaTEX slice** only; other slices are validated now and loaded by the bolts that own their tables (002 scales, 006 containers/operators). Reset calls every registered module's reset hook.
- **Port/adapter**: `OrgatexPort` is the only way WeighingMS code reads OrgaTEX. The Dummy adapter calls the Dummy service in-process (same NestJS process, per tech-stack) and surfaces `ORGATEX_UNAVAILABLE` when the Dummy is offline — identical semantics to a real HTTP adapter failing.
- **Availability**: in-memory flag on the Dummy service (reset → online). When offline, all three Dummy endpoints return `503`.
- **Errors**: typed `DomainError` subclasses mapped by the global filter (coding-standards).
- **Dev**: `pnpm dev` runs Nest (watch, SWC) and Vite concurrently; Vite proxies `/api`.

### Proposed Clarification (needs your OK)

Story **003-dummy-orgatex-serves-recipe** AC-1 says the recipe includes "containerId (+ container tare)". But the approved **system context / data ownership** says the **container master and tare are WeighingMS-owned**, not OrgaTEX. I propose: **the Dummy OrgaTEX recipe returns `containerId` only; tare comes from the WeighingMS container master** (seeded and served in bolt 006). I will amend that AC wording accordingly. Rule 2: asking rather than silently deciding.

### Acceptance Criteria

- [ ] `pnpm install` completes; `pnpm dev` starts API on :3000 and client on :5173
- [ ] `pnpm lint`, `pnpm format:check`, `pnpm test` pass; `pnpm test:e2e` runs (no specs yet)
- [ ] Empty DB on start → migrations applied and OrgaTEX seed loaded
- [ ] `curl /api/batches` → 4 batches; B-24187 RELEASED, B-24188/B-24190/B-24191 QUEUED with prototype values
- [ ] `curl /api/batches/B-24187` → SO-9931, JET-04, Teal 4C, 100% CTN knit, 480 kg, 5 components
- [ ] `curl /api/batches/B-24187/recipe` → 5 components in sequence with prototype targets/tolerances/lots/containers in integer mg (Blue RSPL code `DYE-1180`)
- [ ] Unknown batch → `404 BATCH_NOT_FOUND` in the standard error format
- [ ] `PUT /api/training/orgatex {online:false}` → all three endpoints `503 ORGATEX_UNAVAILABLE`; `{online:true}` restores
- [ ] `POST /api/training/reset` restores seed and OrgaTEX online in < 2 s
- [ ] `OrgatexPort` adapter returns the same data and maps offline to `ORGATEX_UNAVAILABLE`
- [ ] No floating-point arithmetic on quantities (`parseQuantity` unit tests incl. `"0.5" g`, `"0.048" kg`, `"9.600" kg`, invalid inputs)
- [ ] Evidence produced: `evidence/STEP-17-dummy-data.json`, `evidence/STEP-18-api-tests.txt` (curl transcript)

### Out of Scope (later bolts)

Consumption endpoint + write-back (bolt 003), scales/scanner (002), station queue/selection rules (004), any UI screen (005+).
