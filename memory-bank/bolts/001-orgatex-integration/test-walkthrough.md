---
stage: test
bolt: 001-orgatex-integration
created: 2026-10-29T10:09:00Z
---

## Test Report: orgatex-integration

### Summary

- **Tests**: 67/67 passed (9 test files, Vitest 5, ~0.6 s)
- **Coverage** (src/server + src/shared): statements 97.1%, **branches 89.3%**, functions 97.3%, lines 97.8%
- **Quality gates**: `pnpm lint` ✅, `pnpm format:check` ✅, `pnpm typecheck` ✅, `pnpm build` ✅, `pnpm test:e2e` ✅ (runs; no specs until UI bolts)

### Test Files

- [x] `tests/shared/parse-quantity.test.ts` - g/kg decimal strings → integer mg (13 conversions), float-drift cases, invalid input, too many decimals, unsafe size, unknown unit
- [x] `tests/server/training/seed-loader.test.ts` - prototype scenario loaded; recipe/container/scale quantities in mg; supervisor PIN hash-only; rejection of unknown dyestuff, extra decimals, count mismatch, duplicate sequence, bad status, zero target
- [x] `tests/server/integrations/orgatex/dummy-orgatex.api.test.ts` - `GET /api/batches` exact values, `GET /api/batches/:batchId` incl. 404 format and exact ids, `GET /api/batches/:batchId/recipe` with all 5 components, dyestuff data, no tare exposed, RECIPE_NOT_FOUND, read-only (PUT/POST/DELETE → 404)
- [x] `tests/server/integrations/orgatex/orgatex-availability.api.test.ts` - initial state, offline → 503 on all three endpoints, recovery, lastServedAt, body validation (400)
- [x] `tests/server/integrations/orgatex/dummy-orgatex.adapter.test.ts` - `OrgatexPort` DI binding, same data as endpoints, last-contact tracking, ORGATEX_UNAVAILABLE / BATCH_NOT_FOUND propagation
- [x] `tests/server/training/reset.api.test.ts` - seeding on start, reset restores data + availability in < 2 s, repeatable
- [x] `tests/server/health.api.test.ts` - health endpoint, unknown route error format
- [x] `tests/server/common/api-exception.filter.test.ts` - 500 without leaking internals, 503 warning, validation arrays, string responses, fallbacks
- [x] `tests/server/database/database.provider.test.ts` - file DB with folder creation + migrations, in-memory DB

### Acceptance Criteria Validation

- ✅ **`pnpm install`; `pnpm dev` starts API :3000 and client :5173**: verified manually (API log shows all routes mapped; client served page and proxied `/api/health`)
- ✅ **`pnpm lint`, `pnpm format:check`, `pnpm test` pass; `pnpm test:e2e` runs**: all green
- ✅ **Empty DB on start → migrations applied, OrgaTEX seed loaded**: reset.api "seeds the database on application start"; dev log "Seeded dummy-orgatex"
- ✅ **`/api/batches` → 4 batches, B-24187 RELEASED, others QUEUED, prototype values**: dummy-orgatex.api (exact equality)
- ✅ **`/api/batches/B-24187` → SO-9931, JET-04, Teal 4C, 100% CTN knit, 480 kg, 5**: dummy-orgatex.api
- ✅ **Recipe → 5 components in sequence, prototype targets/tolerances/lots/containers in mg, Blue RSPL `DYE-1180`**: dummy-orgatex.api
- ✅ **Unknown batch → `404 BATCH_NOT_FOUND` standard format**: dummy-orgatex.api
- ✅ **OrgaTEX offline → 503 on all three; online restores**: orgatex-availability.api
- ✅ **Reset restores seed and OrgaTEX online < 2 s**: reset.api (measured ~6 ms in dev)
- ✅ **`OrgatexPort` returns same data, maps offline to ORGATEX_UNAVAILABLE**: dummy-orgatex.adapter
- ✅ **No floating-point arithmetic on quantities**: parse-quantity (string arithmetic; `1.1 kg` → exactly 1 100 000 mg)
- ✅ **Evidence produced**: `evidence/STEP-17-dummy-data.json`, `evidence/STEP-18-api-tests.txt`

Story acceptance criteria covered: 001 (scaffold, seed, reset, mg), 002 (list, detail, 404), 003 (recipe values, read-only; tare clarified as WeighingMS-owned), 006 (503 offline, online restore, status/lastServedAt).

### Issues Found

- **Vitest/SWC did not parse decorators** initially — unplugin-swc reads decorator settings from the root `tsconfig.json`; fixed by pointing it at `tsconfig.test.json` with explicit parser options.
- **Vite config warning** (ESM in a CommonJS package) — fixed by renaming `vite.config.ts` / `vitest.config.ts` to `.mts`.
- **Branch coverage 78.6% on first run** (below the 80% standard) — added filter, database-provider and size-limit tests → 89.3%.
- **`pnpm test:e2e` failed with no specs** — script now passes `--pass-with-no-tests` until UI bolts add specs.

### Notes

- ESLint: test files relax only the `no-unsafe-*` / `no-explicit-any` rules (supertest bodies and raw seed edits are untyped JSON); source code keeps the full strict type-checked rule set.
- Remaining uncovered lines are defensive paths (static client present, unknown-route branch in registry log, optional seed fields).
- `@types/better-sqlite3` (9.6) lags better-sqlite3 13; only affects the `$client` typing used in one test.
