---
stage: implement
bolt: 001-orgatex-integration
created: 2026-10-29T10:06:00Z
---

## Implementation Walkthrough: orgatex-integration

### Summary

The repository is now a runnable single-package TypeScript project. A NestJS API (port 3000, prefix `/api`) hosts the Dummy OrgaTEX read endpoints, an OrgaTEX availability toggle and a training reset, backed by SQLite through Drizzle. The full prototype scenario lives in a versioned seed file whose quantities are converted to integer milligrams. A placeholder React page (port 5173) proves the client toolchain and the `/api` proxy.

### Structure Overview

The server is split into `common` (errors, exception filter, health), `database` (Drizzle schema, migrations, connection provider), `training` (seed loading, reset registry, reset endpoint) and `integrations/orgatex` (the `OrgatexPort` contract plus a `dummy` folder holding the Dummy OrgaTEX controller, service, port adapter and training controller). `src/shared` holds the OrgaTEX contract types, the API error shape and the quantity parser for reuse by the UI later. On startup the reset registry seeds every registered module that has no data; reset restores all of them.

### Completed Work

- [x] `package.json` - pnpm scripts for dev, build, start, test, e2e, lint, format, typecheck, db generate/reset
- [x] `pnpm-workspace.yaml` - allow-list for native build scripts (pnpm 11 `allowBuilds`)
- [x] `tsconfig.json`, `tsconfig.server.json`, `tsconfig.client.json`, `tsconfig.test.json` - strict TypeScript per target
- [x] `nest-cli.json`, `.swcrc` - SWC build of server + shared, client excluded
- [x] `vite.config.mts` - client dev server on 5173 with `/api` proxy, build to `dist/client`
- [x] `vitest.config.mts` - Vitest with SWC so Nest decorators work in tests
- [x] `playwright.config.ts` - E2E configuration (specs added in UI bolts)
- [x] `drizzle.config.ts` - migration generation
- [x] `eslint.config.mjs`, `.prettierrc`, `.prettierignore`, `.gitignore` - code quality and ignored outputs
- [x] `data/seed.json` - versioned training scenario (OrgaTEX batches/dyestuffs/recipe, containers, scales, operators)
- [x] `src/shared/contracts/orgatex.ts` - Dummy OrgaTEX training contract types
- [x] `src/shared/contracts/errors.ts` - single API error body shape
- [x] `src/shared/quantity/parse-quantity.ts` - decimal string + unit to integer mg without floating point
- [x] `src/server/main.ts`, `app.module.ts`, `app.setup.ts` - bootstrap, module wiring, global prefix/validation/filter
- [x] `src/server/common/errors/domain-error.ts` - typed errors with code and HTTP status
- [x] `src/server/common/filters/api-exception.filter.ts` - maps all errors to the standard error body
- [x] `src/server/common/health/health.controller.ts` - health endpoint
- [x] `src/server/database/schema/orgatex.ts`, `schema/index.ts` - Dummy OrgaTEX tables
- [x] `src/server/database/migrations/0000_orgatex_dummy.sql` (+ meta) - generated initial migration
- [x] `src/server/database/database.provider.ts`, `database.module.ts` - SQLite connection, applies migrations
- [x] `src/server/training/seed/seed-schema.ts` - seed validation and mg conversion
- [x] `src/server/training/seed/seed.service.ts` - loads the seed file once
- [x] `src/server/training/reset.registry.ts` - modules register seed/reset hooks
- [x] `src/server/training/training.controller.ts`, `training.module.ts` - reset endpoint, seeding on startup
- [x] `src/server/integrations/orgatex/orgatex.port.ts` - OrgaTEX port contract and DI token
- [x] `src/server/integrations/orgatex/dummy/dummy-orgatex.service.ts` - Dummy OrgaTEX data, availability, reseed
- [x] `src/server/integrations/orgatex/dummy/dummy-orgatex.controller.ts` - the three workbook GET endpoints
- [x] `src/server/integrations/orgatex/dummy/dummy-orgatex.adapter.ts` - OrgatexPort implementation, tracks last contact
- [x] `src/server/integrations/orgatex/dummy/orgatex-training.controller.ts` - availability toggle/status
- [x] `src/server/integrations/orgatex/orgatex.module.ts` - binds the port to the Dummy adapter
- [x] `src/client/index.html`, `main.tsx`, `App.tsx` - placeholder page

### Key Decisions

- **Quantities in seed as decimal strings**: avoids floats entirely; conversion to integer mg is string-based and validated (too many decimals, negatives and bad units are rejected).
- **Whole scenario in one seed file**: containers, scales and operators are validated now but loaded by the bolts that own their tables, keeping ownership boundaries intact.
- **Reset registry**: later modules (scales, sessions, tickets) plug in; one reset restores everything.
- **Recipe returns `containerId` only**: container tare stays WeighingMS-owned (approved clarification).
- **Unissued recipes for queued batches**: B-24188/B-24190/B-24191 reference recipes the Dummy has not issued, returning `404 RECIPE_NOT_FOUND`; they are rejected earlier by the RELEASED rule in bolt 004 anyway.
- **Supervisor PIN**: training PIN stored only as a salted scrypt hash in the seed (NFR-11); it is consumed in bolt 008.

### Deviations from Plan

- **TypeScript 6.0.3 instead of the newest 7.0**: TypeScript 7 (native compiler) has no JavaScript compiler API, which typescript-eslint and Nest's type-checker require (`>=4.8.4 <6.1`). Standard "TypeScript strict" unchanged.
- **NestJS 11 instead of 12**: kept on the 11.x line for plugin compatibility (`@nestjs/serve-static`, testing); no feature difference needed.
- **Build allow-list key**: pnpm 11 uses `allowBuilds` (not `onlyBuiltDependencies`).
- **SWC compiles from `src/`** (client excluded) so shared code is emitted; server entry is `dist/src/server/main.js`.
- **Exception filter file name**: `api-exception.filter.ts` (plan said `http-exception.filter.ts`) — it handles all errors, not only HTTP ones.
- **`tsconfig.test.json` added** so ESLint type-aware rules and tests share one config.
- Built UI is served by the API when `dist/client` exists (planned as tech-stack behaviour; no extra work later).

### Dependencies Added

- [x] `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` - NestJS 11 API
- [x] `@nestjs/serve-static` - serve built UI from the API in production
- [x] `class-validator`, `class-transformer` - DTO validation (coding-standards)
- [x] `drizzle-orm`, `better-sqlite3` - SQLite persistence (data-stack)
- [x] `react`, `react-dom` - client runtime
- [x] `reflect-metadata`, `rxjs` - Nest runtime requirements
- [x] Dev: `typescript@6.0`, `@nestjs/cli`, `@nestjs/testing`, `@swc/core`, `@swc/cli`, `unplugin-swc`, `vite`, `@vitejs/plugin-react`, `vitest`, `supertest`, `@playwright/test`, `drizzle-kit`, `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-config-prettier`, `globals`, `prettier`, `concurrently`, type packages

### Developer Notes

- `pnpm dev` runs both servers; the API seeds `data/weighingms.db` on first start (git-ignored). Delete the file or call `POST /api/training/reset` to restore the scenario.
- Set `WEIGHINGMS_DB=:memory:` for isolated runs (tests do this).
- Schema changes: edit `src/server/database/schema/*`, then `pnpm db:generate`.
- Training supervisor PIN for later bolts: `4321` (hash only in seed).
