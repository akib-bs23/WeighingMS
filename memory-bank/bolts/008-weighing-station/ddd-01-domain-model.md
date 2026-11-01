---
stage: model
bolt: 008-weighing-station
created: 2026-10-30T10:30:00Z
---

## Static Model: weighing-station (bolt 2 of 3 — reading safety, identity, override, quit, records/audit)

This bolt **extends** the single `WeighingSession` aggregate modelled in `memory-bank/bolts/006-weighing-station/ddd-01-domain-model.md` — it does not redesign anything 🟢 006 already decided. Several elements were deliberately left as forward-declared placeholders in that document, tagged 🟡 008; this document is where they get their real shape. Any place this model is more specific than the 006 placeholder (identity, in particular) is called out explicitly as a **refinement**, not a contradiction.

No source code was read or written to produce this document, per the Domain Model stage constraint. (Shared contracts already approved and shipped in bolts 001–002 — `WeightReading`, `ScaleReadingError` — are treated as fixed requirements input, the same way 🟢 006 treated `ScalePort` as a given.)

---

### Entities (new or changed)

- **ComponentWeighing** (🟢 006, **refined** here) — adds `identity: IdentityStatus` (replacing 006's lighter `verifiedIdentity: boolean` placeholder — see Value Objects) and `identityMismatch: { scannedCode: string, scannedDyestuffCode: string } | null`, carried only while a mismatch is active. Business rule (new): a component with `identity = MISMATCH` cannot produce a `WeighingRecord` via the normal confirm path (409), only via Override (story 008 doesn't name identity as a Step-24-style gate it waives, so override does **not** bypass identity — these are independent blocks; override only concerns tolerance). Scanning the correct code, or Quit, clears the mismatch (story 007 AC3).
- **WeighingRecord** (🟢 006, **unchanged** shape) — this bolt is the first to actually produce a `result = OVERRIDDEN` row (006 only ever wrote `IN_TOLERANCE`); no new fields needed, `Override` carries the extra detail by reference.
- **Override** (🟡 006 placeholder → now fully specified) — `overrideId` (uuid), `recordId` (the `WeighingRecord` it authorises), `supervisorId`, `reason` (non-empty string, mandatory), `authorisedAt`. Immutable, created atomically with its `WeighingRecord` (one override always produces exactly one record; there is no "override with no confirmation").
- **AuditEvent** (🟡 006 placeholder → now fully specified) — `eventId` (uuid), `sessionId`, `type` (`OVERRIDE` | `ABANDON` | `REPRINT` — `REPRINT` stays reserved for bolt 010, this bolt only needs the type to exist so the column/enum doesn't change again later), `actorId`, `detail` (free-form string — e.g. "Override: 93.0 g, reason: Lab approved" / "Abandon: RC-24187-03 at 60.0 g"), `occurredAt`. Write-once; read via `listBySession`, ordered by `occurredAt`.
- **Supervisor** (new, narrow) — not a general user account (explicitly out of scope, story 008): just the one seeded credential needed to authorise an override — `operatorId`, `name`, `pinHash` (scrypt, never the raw PIN). Distinct from the session's regular `operatorId` (TD-6's training operator); a session always has exactly one operator, but an override's `supervisorId` is a *different* identity authenticated for that single action only — it does not change who the session belongs to.

### Value Objects (new)

- **ReadingValidity**: `VALID` | `INVALID`, derived from a `WeightReading` and the scale's `capacityMg` — `INVALID` when `netMg` is `null` (and `error` is not a connectivity fault — see below), negative, or when `overload` is `true` or the raw value exceeds `capacityMg`. Pure function of its inputs (`classifyReading(reading, capacityMg): ReadingValidity`), lives in `src/shared` alongside `ToleranceEvaluator` so the UI's later "INVALID READING" state (bolts 011/012) reuses the identical rule rather than re-deriving it — same reasoning 🟢 006 used for `ToleranceEvaluator`.
  - **Ordering rule** (new, resolves a gap 006 left implicit): confirmation checks happen in a fixed order — (1) scale reachable at all (`ScalePort` throwing `SCALE_UNAVAILABLE` short-circuits everything, unchanged from 006) → (2) `ReadingValidity` → (3) `stable` (006's existing `READING_UNSTABLE`) → (4) identity (`MISMATCH` blocks) → (5) `Zone` (tolerance). An invalid reading is never evaluated for stability or tolerance; there is no such thing as a "stable but invalid" confirm attempt reaching the tolerance check.
- **IdentityStatus**: `UNVERIFIED` | `VERIFIED` | `MISMATCH`. **Refines** 006's `verifiedIdentity: boolean` placeholder — a boolean can't represent "never scanned, and that's fine" (story 007 AC4: light verification, confirm is allowed with no scan at all) versus "scanned and wrong" (AC2: blocks confirm even in tolerance), so a tri-state replaces it. Starts `UNVERIFIED` on activation; becomes `VERIFIED` when the active component's own barcode is scanned; becomes `MISMATCH` when a *different* dyestuff's barcode is scanned while this component is active; a batch-card code (not a dyestuff barcode at all) scanned on this screen is simply ignored for identity (story 007 edge case) — it neither verifies nor mismatches.
- **SupervisorCredential**: a PIN (never persisted, never logged, never echoed in any response) checked against a seeded `Supervisor.pinHash` using the same hash scheme the seed already uses (scrypt) — verification is a pure comparison function taking the plaintext PIN and the stored hash, returning a boolean, with no side effect of its own (NFR-11).

### Aggregates (amendments to the 🟢 006 `WeighingSession` aggregate — no new aggregate)

- **Invariant 2, amended**: "`PENDING → ACTIVE → DONE`, never backwards, never skipped" still holds for all forward progress and remains absolute once a component is `DONE` (DONE is still terminal — Quit can never touch a `DONE` component, story 009 only ever quits the *active* one). The one addition is an explicit **Quit transition**: `ACTIVE → PENDING` is now a legal exception, triggered only by the Quit operation, never by progression or activation. This is a retreat, not a violation of "never backwards" in the sense 006 meant (which was about progression skipping/rewriting history) — it's spelled out here so bolt 008's implementation doesn't have to either violate the invariant's letter or invent an undocumented carve-out.
- **Invariant 6** (new): a `WeighingRecord` with `result = OVERRIDDEN` can only be created together with exactly one `Override` referencing it, in the same operation — there is no path that creates an `OVERRIDDEN` record without an `Override`, and no path that creates an `Override` without a record (they are two facts about one atomic action, not two independently-created entities).
- **Invariant 7** (new): Quit never creates a `WeighingRecord` (confirmed by story 009 AC1: "no weighing record exists for it") and always creates exactly one `AuditEvent` of type `ABANDON` — even when the reading was `0` (story's own edge case: abandoning intent is itself the thing being audited, independent of what the scale showed).
- **Invariant 8** (new): an identity `MISMATCH` and an open override dialog are both **session-level transient UI state tied to the active component**, not persisted facts — Quit clears both (story 009 AC2) because they only ever made sense in the context of the component being abandoned.

### Domain Events (new, continuing 🟡 006's forward-declared names)

- **IdentityVerified** — Trigger: the active component's own barcode is scanned. Payload: `sessionId`, `componentId`.
- **IdentityMismatched** — Trigger: a different dyestuff's barcode is scanned while a component is active. Payload: `sessionId`, `componentId`, `scannedDyestuffCode`, `expectedDyestuffCode`.
- **WeighingConfirmed**, extended (🟢 006 declared it; this bolt is the first to emit it with `result = OVERRIDDEN`) — unchanged payload shape (the created `WeighingRecord`), now sometimes carrying an `OVERRIDDEN` one.
- **OverrideAuthorised** (🟡 006 → now concrete) — Trigger: a supervisor PIN check succeeds and a reason is present. Payload: the created `Override` **and** the `WeighingRecord` it authorised (both created together, Invariant 6).
- **ComponentAbandoned** (🟡 006 → now concrete) — Trigger: Quit. Payload: `sessionId`, `componentId`, `actorId`, `readingAtAbandonMg` (for the audit detail string).

### Domain Services

- **ReadingSafetyEvaluator** (new, pure, `src/shared`) — Operation: `classifyReading(reading: WeightReading, capacityMg: Quantity): ReadingValidity`. Dependencies: none. Mirrors `ToleranceEvaluator`'s shape (pure, shared, no I/O) so the eventual UI state (bolt 011/012) is a thin render of this function's output, exactly as the existing `ReadoutPanel`/`StatusLine` render `ToleranceEvaluator`'s output today.
- **IdentityVerifier** (new, application-level — needs the active component's expected barcode, which is session state) — Operations: `verify(sessionId, scannedCode): SessionView` (sets `VERIFIED`, `MISMATCH`, or leaves `UNVERIFIED` unchanged for a non-dyestuff code). Dependencies: `WeighingSessionRepository`.
- **OverrideAuthoriser** (🟡 006 → now concrete) — Operation: `authorise(sessionId, supervisorPin, reason)`. Steps: re-read the scale itself (never trust a client-supplied weight, same rule 005/006 already established for plain confirm); check `SupervisorCredential`; require non-empty `reason`; create the `WeighingRecord` (`OVERRIDDEN`) + `Override` + `AuditEvent(OVERRIDE)` atomically; advance progression exactly as a normal confirm does (reuses `ProgressionPolicy`, 🟢 006 — override is a variant of confirm, not a separate progression path). Dependencies: `WeighingSessionRepository`, `OverrideRepository`, `AuditEventRepository`, `ScalePort`, the seeded `Supervisor` credential.
- **ComponentAbandoner** (new) — Operation: `quit(sessionId, actorId)`. Steps: re-tare the active component's scale (`ScalePort.tare`, same primitive 🟢 006's `retare` already uses); move the active component `ACTIVE → PENDING` (Invariant 2 amendment); clear `activeComponentId`, any `identityMismatch`, and (implicitly, since it's UI-only state) any open override dialog; create `AuditEvent(ABANDON)`. Dependencies: `WeighingSessionRepository`, `ScalePort`, `AuditEventRepository`.
- **WeighingSessionService.confirm** (🟢 006, **extended** here, not redesigned) — gains the ordered checks from `ReadingValidity` and `IdentityStatus` ahead of its existing stability/tolerance checks (see the Ordering rule above); on an out-of-tolerance or mismatched reading it still refuses (422/409) exactly as before — override is reached through the separate `OverrideAuthoriser` operation, never by confirm silently escalating itself.
- **WeighingRecordRepository**, **AuditEventRepository** read sides (🟡 006 placeholders → now concrete) — `listBySession(sessionId)` for both, satisfying story 013 directly.

### Repository Interfaces (new/completed)

- **OverrideRepository** (🟡 006 → concrete) — Methods: `add(override): void`. No read method is needed by any story in this bolt (overrides are always read *through* their `WeighingRecord`, not listed on their own) — not adding one now avoids building an unused surface (coding-standards: no speculative API).
- **AuditEventRepository** (🟡 006 → concrete) — Methods: `add(event): void`, `listBySession(sessionId): AuditEvent[]` (time-ordered, story 013 AC2).
- **WeighingRecordRepository** (🟢 006 write-only → this bolt adds the read side) — adds `listBySession(sessionId): WeighingRecord[]` (story 013 AC1). No update/delete added — there still isn't one (NFR-9, unchanged).
- **SupervisorCredentialRepository** (new) — Methods: `findByOperatorId(operatorId): { pinHash: string } | null` (or simply "the one seeded supervisor" — there is exactly one in training data; the interface doesn't assume that forever, but the implementation may). Read-only; no write path exists in this domain (provisioning a supervisor is explicitly out of scope, story 008).

### Ubiquitous Language (additions)

- **Reading safety**: the rule that a weighing can never be confirmed from a reading the scale itself reports as broken (missing, negative, over capacity) — independent of and checked before tolerance.
- **Identity verification**: scanning the physical dyestuff container's own barcode to confirm it matches the recipe component currently active; optional unless it's actually done, in which case a wrong scan blocks confirmation until resolved.
- **Mismatch**: the state where the most recently scanned dyestuff barcode does not match the active component's expected one.
- **Override**: unchanged definition from 🟢 006 — a supervisor's authorisation to confirm a reading that is not in the `OK` zone — now fully specified: PIN + mandatory reason, producing an `OVERRIDDEN` record and an audit trail entry, the PIN itself never stored or exposed.
- **Quit / Abandon**: giving up on the current component without recording anything, returning it to `PENDING` so it can be weighed again from scratch (fresh tare, fresh identity state).
- **Audit trail**: the time-ordered, append-only log of privileged/exceptional actions (override, abandon, and — later — reprint) against a session, independent of the weighing records themselves and never editable.

---

## Coverage Check Against This Bolt's Stories

| Story | Modelled by |
|-------|-------------|
| 006 reading-safety-unstable-offline-invalid | `ReadingValidity`, `ReadingSafetyEvaluator`, the confirm ordering rule, (unchanged) `ScalePort` 503 propagation |
| 007 dyestuff-identity-verification | `IdentityStatus`, `identityMismatch`, `IdentityVerifier`, `IdentityVerified`/`IdentityMismatched` events |
| 008 supervisor-override | `Supervisor`, `SupervisorCredential`, `Override`, `OverrideAuthoriser`, Invariant 6, `OverrideAuthorised` event |
| 009 quit-abandon-component | `ComponentAbandoner`, Invariant 2 amendment, Invariant 7, Invariant 8, `ComponentAbandoned` event |
| 013 weighing-records-and-audit-trail | `WeighingRecordRepository.listBySession`, `AuditEventRepository.listBySession`, `AuditEvent` entity (fully specified) |

## Completion Criteria

- [x] All domain entities identified and documented (new + refined)
- [x] Business rules captured for each entity
- [x] Aggregate boundaries respected — no new aggregate; amendments to the existing `WeighingSession` aggregate are explicit and don't contradict 🟢 006
- [x] Domain events specified, continuing the 🟡 006 forward-declared names
- [x] Repository interfaces defined (including why `OverrideRepository` has no read method)
- [x] All five of this bolt's stories covered by the model (table above)
- [x] Every 🟡 006 placeholder (`verifiedIdentity`, `Override`, `AuditEvent`, `OverrideAuthoriser`, the two repositories) is now either confirmed as-is or explicitly refined, with the refinement called out
