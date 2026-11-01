# STEP 24 — Overshoot Decision

## Observed Problem

The supplied prototype (`docs/customize-weighing-station.html`) shows a "surplus panel" when a
reading exceeds tolerance (`OVER` zone). It displays a surplus magnitude and proposes
recalculating the targets of the *remaining, not-yet-weighed* recipe components to preserve the
shade ratio — for example, overshooting Yellow RGB by +2.6 g (+2.8%) is shown scaling Sodium
Sulphate from 24.000 kg to 24.624 kg and Soda Ash from 9.600 kg to 9.850 kg.

The prototype's own authors flag this as unresolved, not a confirmed requirement — it carries two
pinned open questions (§9.4, Q25: "what does FCI actually mean by 'surplus compensation'?
Recalculating remaining components as shown here, or simply displaying the excess?"; Q26: "what
happens when an overdose CANNOT be compensated?") and its own build notes call the panel
"deliberately a guess."

## What Is Known

- An over-tolerance reading already blocks normal confirmation (`422 OUT_OF_TOLERANCE`, bolt 006) —
  not in question, already built and tested.
- Recovery via Quit (abandon and re-weigh, bolt 008) or Supervisor override (PIN + mandatory
  reason, bolt 008) already exists for *any* non-`OK` zone, including `OVER` — not overshoot-specific,
  already built and tested.
- The surplus magnitude shown on the status line is already implemented as `actual − target`
  (bolt 006, `src/shared/weighing/tolerance.ts`), one of the two candidate definitions named in the
  requirements doc's OQ-16 (the other being "amount above the tolerance maximum").

## What Is Assumed (and by whom)

- That "surplus compensation" means proportionally rescaling the remaining components' targets —
  this is the **prototype's own guess**, not a brief requirement, a confirmed FCI business rule, or
  anything in the approved WeighingMS requirements. The requirements doc (`requirements.md`)
  explicitly carried this forward as **OQ-07** and **OQ-16**, marked "decide at Step 24" from the
  start of Inception — this bolt is where that promise is kept.

## Options Proposed (not silently chosen)

**A — No compensation, manual recovery only.** An over-tolerance reading simply cannot be
confirmed normally; Quit-and-reweigh or Supervisor-override are the only ways forward, and neither
touches any other component's target. Zero new domain logic beyond what bolts 006/008 already
built. Treats the recalculation question exactly like every other item this training build defers
to the real product (OrgaTEX protocol, printer model, etc.) rather than guessing at it.

**B — Suggest a recalculation, don't apply it.** Same blocking/recovery as A, plus a read-only
panel showing what the remaining components' targets *would* become if rescaled proportionally,
left unapplied unless a new explicit action commits it. More faithful to the prototype's UI, but
requires inventing a specific proportional formula the brief never actually specifies — some risk
of presenting an unconfirmed rule as if it were authoritative, even if clearly marked "suggested."

**C — Apply the recalculation automatically.** Closest to the literal prototype demo: an override
on an overshoot immediately rescales every remaining `PENDING` component's target by the same
ratio. Most feature-complete relative to the mockup, but it answers the brief's own explicitly-open
question with a specific numeric formula nobody from FCI ever confirmed, retroactively changes
other components' recorded targets mid-session, and leaves Q26 ("what happens when it can't be
compensated") completely undefined. Highest risk of inventing an unapproved business rule.

## Decision

**Option A — no compensation, manual recovery only.**

> For this training implementation, an over-tolerance component remains unconfirmed and the
> operator must use the defined recovery actions (Quit and re-weigh, or Supervisor override with a
> mandatory reason). No automatic or suggested recalculation of any other recipe component's target
> is ever performed. The surplus magnitude continues to be displayed as `actual − target`
> (resolving OQ-16 in the direction already implemented since bolt 006).

Recorded as **TD-11** in `memory-bank/intents/001-assisted-weighing-station/requirements.md`,
closing **OQ-07** and **OQ-16**. FR-21 and TD-7 amended to remove their "pending Step 24" hedges
and state this rule plainly.

## Implementation Impact

None — bolts 006 and 008 already implement everything this decision requires (blocking on `OVER`,
Quit, Override, the `actual − target` surplus wording). **Bolt 009's scope shrinks accordingly**:
it covers batch completion and the OrgaTEX write-back trigger, but has no overshoot-compensation
work of its own to build. No code changes result from this decision; only the requirements
documentation and this record.

## Test

Already covered by the existing suites, now with the force of a finalised rule rather than a
placeholder:
- `tests/shared/weighing/tolerance.test.ts` — `OVER` zone status text, `actual − target` surplus wording.
- `tests/server/weighing/weighing-session.service.test.ts` — confirm rejects an `OVER` reading with
  `422 OUT_OF_TOLERANCE`; `authoriseOverride` accepts an `OVER` reading with reason and never
  touches any other component; `quit` returns the overshot component to `PENDING` with no record.
- `tests/server/weighing/weighing.api.test.ts` — the same, over HTTP.

No new test is required by this decision, since it chooses to build nothing new — the absence of
any recalculation code path is itself the implementation of Option A.
