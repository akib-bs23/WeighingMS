---
stage: test
bolt: 008-weighing-station
created: 2026-10-30T11:15:00Z
---

## Test Report: weighing-station (bolt 2 of 3 — reading safety, identity, override, quit, records/audit)

### Summary

- **Unit Tests**: `classifyReading` (5 cases, both boundaries) and `hashPin`/`verifyPin` (5 cases, including a round-trip against the real seeded hash) — both pure, both 100% branch coverage.
- **Integration Tests**: 46 cases in `weighing-session.service.test.ts` (service-level; 25 new for this bolt: confirm's extended ordering, `verifyIdentity`, `authoriseOverride`, `quit`) and 23 in `weighing.api.test.ts` (API-level; 12 new: `/identity`, `/override`, `/quit`, `/weighings`, `/audit`).
- **Security tests**: PIN never appears in a thrown error's `details`/`message` (service-level) or in an HTTP response body (API-level) — both proven by explicit assertions on the full serialised error/response, not just the typed fields.
- **Total suite**: 445/445 passing across 45 files (up from 395/43 before this bolt).
- **Coverage** (`src/server` + `src/shared` + `src/client`): statements 97.3%, **branches 88.6%**, functions 95.7%, lines 97.9%; `src/server/weighing` at 97.9% statements / 90.9% branches; the two new `src/shared/weighing` modules at 100%.
- **Playwright**: unchanged from bolt 007 (5/5) — this bolt adds no UI, so no new E2E spec; the UI for identity/override/quit arrives in bolt 011/012.

### Acceptance Criteria Validation

**Story 006 — reading-safety-unstable-offline-invalid**
- ✅ Scale offline → `503 SCALE_UNAVAILABLE`, nothing recorded (unchanged behaviour, re-verified)
- ✅ −5 g, NaN-shaped (not applicable — the Dummy never reports NaN, only out-of-range integers; covered via the two reachable impossible values) and 3 500 g on scale-3kg → `422 INVALID_READING`, nothing recorded
- ✅ `classifyReading` is the single shared rule (`src/shared`), ready for the UI to reuse once bolt 011/012 plumbs scale capacity to the client
- ✅ An invalid reading is checked *before* tolerance, and a missing/unstable reading is *not* reclassified as invalid (explicit regression test for the ddd-02 ordering clarification)

**Story 007 — dyestuff-identity-verification**
- ✅ Scanning the active component's own code → `VERIFIED`
- ✅ Scanning a different recipe component's code → `MISMATCH`, exact message `"Wrong dyestuff: scanned DYE-2204, expected DYE-1180"`, blocks confirm with `409 IDENTITY_MISMATCH` even on an in-tolerance reading
- ✅ Scanning the correct code afterwards clears the mismatch and confirm succeeds
- ✅ No scan at all still allows confirm (light verification)
- ✅ A batch-card code and an unrecognised code shape are both ignored — neither verifies nor mismatches

**Story 008 — supervisor-override**
- ✅ Valid PIN (`4825`, the regenerated/documented training PIN) + reason authorises an under-tolerance reading as `OVERRIDDEN`, with `supervisorId`, `reason`, `authorisedAt` on the record and one matching `OVERRIDE` audit event
- ✅ Wrong PIN → `401 SUPERVISOR_AUTH_FAILED`, nothing recorded
- ✅ Blank reason → `400 REASON_REQUIRED`, nothing recorded
- ✅ PIN never appears in any response body or thrown error (service- and API-level)
- ✅ An `OVER`-zone reading is also allowed with reason (Step 24 pending — this bolt treats override as zone-agnostic per the story's own "until then: allowed" wording)
- ✅ Override still refuses an invalid reading or an identity mismatch — it only ever skips the tolerance check, nothing else

**Story 009 — quit-abandon-component**
- ✅ Quit returns the active component to `PENDING`, zeroes the live scale, resets `scaleId`/`tareMg`/`identity`/`identityMismatchDetail`, creates no record, and writes one `ABANDON` audit event — including at a reading of exactly 0 (the story's own edge case)
- ✅ A mismatch present at the time of Quit is cleared along with everything else
- ✅ The quit component can be re-activated afterwards exactly like a never-touched `PENDING` one
- ✅ Quitting with nothing active throws `COMPONENT_NOT_ACTIVE` — this **resolves bolt 006's own test report recommendation** ("bolt 008 should add tests confirming the `COMPONENT_NOT_ACTIVE` guard fires once Quit can leave a session with no active component")

**Story 013 — weighing-records-and-audit-trail**
- ✅ `GET /api/sessions/:id/weighings` returns every confirmed/overridden record with full traceability, including the joined `override` detail
- ✅ `GET /api/sessions/:id/audit` returns `OVERRIDE`/`ABANDON` events in time order with actor and detail
- ✅ No update/delete route exists for either — verified by the absence of such a route, not merely untested (same proof style bolt 006 used for `weighing_records`)

### Issues Found

1. **No plaintext PIN existed anywhere for the seeded hash** (see implementation-walkthrough.md) — found while writing this stage's override tests, since there was no way to exercise the success path without one. Not a code bug; resolved by regenerating the hash for a documented PIN (`4825`) and adding a dedicated test (`verifies against the real seeded supervisor hash for the documented training PIN`) that fails loudly if the seed and the documented PIN ever drift apart again.
2. No code defects found during this stage — the live walkthrough performed during Implement had already caught and fixed the one real risk (the confirm ordering ambiguity, resolved in Design before any code was written), so Test here is confirmation, not discovery.

### Known Limitations (by design, not bugs)

- `scaleIdOf`/`tareOf`'s own internal null checks and `resolveScale`'s `NO_SCALE_FOR_CLASS` remain genuinely unreachable, same as bolt 006 found — an `ACTIVE` component always has `scaleId`/`tareMg` set together (by construction in `selectAndTare`), and the seed always configures both scale classes. Quit does make `activeComponent()`'s own guard reachable (now tested, see story 009 above) but doesn't touch these three, which sit one layer deeper and are only reached after `activeComponent()` has already succeeded.
- `SeedService.getSupervisor()`'s `NO_SUPERVISOR` guard (and the pre-existing `getSessionOperator()`'s `NO_OPERATOR`) are likewise unreachable with the current always-seeded training fixture — flagged, not padded with a fake malformed-seed test that would test the fake, not the system.

### Recommendations

- Bolt 009 (overshoot, batch completion) should decide, per the Step 24 human decision, whether an `OVER`-zone reading needs anything beyond what override already provides, or a distinct `COMPENSATED` result — the domain model (bolt 006's ddd-01) only *names* that as a reserved possibility; the `WeighingResult` type union itself doesn't include it yet, so bolt 009 would need to add it if the Step 24 decision calls for it.
- No other follow-ups; the aggregate remains clean and fully tested for bolt 009 to extend.
