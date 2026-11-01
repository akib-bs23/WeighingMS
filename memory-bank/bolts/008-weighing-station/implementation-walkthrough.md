---
stage: implement
bolt: 008-weighing-station
created: 2026-10-30T11:05:00Z
---

## Implementation Walkthrough: weighing-station (bolt 2 of 3 — reading safety, identity, override, quit, records/audit)

### Summary

`WeighingSessionService` now enforces reading safety and identity ahead of tolerance, supports a supervisor override that produces an `OVERRIDDEN` record with full audit detail, lets the operator Quit the active component back to `PENDING` with no record kept, and exposes the records/audit read model. Live-verified end-to-end against the running dev server: identity mismatch blocking and clearing, wrong-PIN/empty-reason override refusals, a successful override producing the exact record/audit shape the stories describe, both new `INVALID_READING` cases (negative, overload), Quit returning a component to `PENDING` with a fresh tare, and `SCALE_UNAVAILABLE`/reset behaviour unchanged from bolt 006.

### Structure Overview

Everything lives in the same `WeighingModule` bolt 006 established — no new module. Two new repositories (`OverrideRepository`, write-only; `AuditEventRepository`, read+write) sit alongside the existing two. `WeighingSessionService` gained three new use cases (`verifyIdentity`, `authoriseOverride`, `quit`) and a new private `finishActive` helper that `confirm` and `authoriseOverride` both delegate to, so the "store record → progress → re-activate next" sequence exists in exactly one place regardless of which path produced the record.

### Completed Work

- [x] `src/shared/weighing/identity.ts` — `IdentityStatus`
- [x] `src/shared/weighing/reading-safety.ts` — `classifyReading(netMg, capacityMg): ReadingValidity`
- [x] `src/shared/contracts/weighing.ts` — `ComponentView.identity`/`identityMismatchDetail`; `WeighingRecordView.override`; new `AuditEventView`/`AuditEventType`
- [x] `src/server/common/security/scrypt-pin.ts` — `hashPin`, `verifyPin` (constant-time)
- [x] `src/server/database/schema/weighing.ts` — `session_components` gains `identity`/`identity_mismatch_detail`; new `overrides`, `audit_events` tables
- [x] `src/server/database/migrations/0004_weighing_safety_identity_override.sql` — generated via `pnpm db:generate`, renamed to match this project's descriptive-migration-name convention
- [x] `src/server/training/seed/seed.service.ts` — `getSupervisor()`
- [x] `src/server/weighing/override.repository.ts`, `audit-event.repository.ts` — new
- [x] `src/server/weighing/weighing-record.repository.ts` — `add` now takes `Omit<WeighingRecordView, 'override'>`; `listBySession` left-joins `overrides` and hydrates the `override` field
- [x] `src/server/weighing/weighing-session.repository.ts` — hydrates/persists the two new component columns; reset now also clears `overrides`/`audit_events`
- [x] `src/server/weighing/weighing-session.service.ts` — `verifyIdentity`, `authoriseOverride`, `quit`; `confirm` extended with the resolved check ordering; new `finishActive`/`readAndValidate`/`assertIdentityVerified` internals
- [x] `src/server/weighing/weighing.controller.ts` — `POST :sessionId/identity`, `POST :sessionId/override`, `POST :sessionId/quit`, `GET :sessionId/weighings`, `GET :sessionId/audit`
- [x] `src/server/weighing/weighing.module.ts` — registers the two new repositories

### Key Decisions

- **Confirm ordering resolved as planned in ddd-02**: `READING_UNSTABLE` (unchanged, covers `null`/unstable) → `INVALID_READING` (new, only reached for a stable, present number) → `IDENTITY_MISMATCH` (new) → `OUT_OF_TOLERANCE` (unchanged). Verified live with both invalid cases (−5 g, 3 500 g on the 3 kg scale) and confirmed the existing `SCALE_UNAVAILABLE`/unstable paths are untouched.
- **Identity reuses `classifyScan` from `src/shared/batches/scan-code.ts`** (bolt 004) rather than inventing a second code-kind classifier — a batch card scanned on Screen 2 is silently ignored for identity (story 007 AC4), exactly as that function already distinguishes `BATCH`/`DYESTUFF`/`UNKNOWN`.
- **Override never bypasses reading safety or identity** — `authoriseOverride` calls the same `readAndValidate`/`assertIdentityVerified` internals as `confirm`; only the tolerance-zone check is skipped. Checked order inside override: reason non-empty (400) → PIN (401) → reading safety/identity → record. No story mandates this order between 400/401; it's a reasonable "cheap request-shape check before the async credential check" choice, called out here rather than left implicit.
- **No new table for the supervisor.** `SeedService.getSupervisor()` reads the existing seeded operator roster (already supports a `SUPERVISOR` role with `pinHash` from an earlier session) — exactly the ddd-02 decision, no DB write path, no reset-registry entry needed.
- **Quit fully resets the component to its pre-activation shape** (`scaleId: null`, `tareMg: null`, `identity: 'UNVERIFIED'`, `identityMismatchDetail: null`), not just its `state` — so a future re-activation behaves identically to a never-touched `PENDING` component, with no stale device/identity state left over.
- **`quit`'s `actorId` is derived from `session.operatorId`**, not passed by the caller — there is exactly one operator per session (TD-6, no login), so a controller-supplied actor would be a parameter with no real meaning in this training build (coding-standards: no speculative API). The domain model's `ComponentAbandoned` event still carries an `actorId`; it's just sourced internally.
- **`WeighingRecordRepository.add` narrows its parameter to `Omit<WeighingRecordView, 'override'>`** — the override detail is written separately by `OverrideRepository.add` in the same logical operation (Invariant 6) and only joined back in on read, so the write path never has to special-case the two result kinds.

### Deviations from Plan

- **Regenerated the supervisor PIN hash.** The seeded `pinHash` from an earlier session had no recorded plaintext anywhere (checked `workbook.md`, `docs/brief.md`, every `evidence/*` file, and the requirements doc) — nothing could ever have exercised the override success path with it. Replaced it with a freshly generated hash for a documented training PIN, **`4825`**, verified to round-trip with the new `verifyPin` before use. This is training fixture data with no real-world credential value; regenerating it is not a scope change to any story.
- **`verifyIdentity` ended up synchronous** (`SessionView`, not `Promise<SessionView>`) — it never actually awaits anything (no scale/device I/O, unlike every other session operation), and the stricter lint rules (`@typescript-eslint/require-await`) correctly flagged the unnecessary `async`. The controller method and route are unaffected (Nest accepts a plain return value exactly like a Promise).

### Dependencies Added

None (`node:crypto`'s `scrypt`/`timingSafeEqual` are builtins).

### Developer Notes

- Verified the exact Drizzle `leftJoin` result-key behaviour (keyed by the table's own SQL name, e.g. `weighing_records`/`overrides`) with a small throwaway script before relying on it in `WeighingRecordRepository.listBySession` — this is the first join in the codebase, nothing to copy from.
- `pnpm build` succeeds; `pnpm typecheck`/`pnpm lint`/`pnpm format:check` all green.
- Full live walkthrough performed against the already-running dev stack (`pnpm dev:server`): identity verify/mismatch/clear, confirm blocked by mismatch, both `INVALID_READING` cases, override wrong-PIN/empty-reason/success with the exact record+audit shape, Quit resetting a component to `PENDING`, `SCALE_UNAVAILABLE` unchanged, and `POST /training/reset` clearing all four weighing-domain tables (`overrides`, `audit_events`, `weighing_records`, `session_components` all reach 0 rows).
- Client-side `ComponentView`/`WeighingRecordView` fixtures in bolt 007's tests (`WeighScreen.test.tsx`, `TrainerPanel.test.tsx`) needed the new required fields added — no behavioural change to those tests, just satisfying the widened shared contract (TS caught every call site; none were missed).
