# STEP 30 — Failure Scenario Tests

Automated via `playwright/failure-scenarios.spec.ts` (9/9 passing) and `playwright/weighing.spec.ts`
/`playwright/confirm-print.spec.ts` (over/under tolerance detail, Re-tare, Quit already covered
there too). HTML report: `playwright/report/index.html`. Video recorded per test
(`playwright/.results/`).

| Scenario | Expected | Actual | Pass |
|----------|----------|--------|------|
| Scale unavailable | Safe failure — `SCALE OFFLINE` on the readout, status line explains, OK disabled, status-strip dot turns red within 2 s, recovers without reload | Exactly this; `scale-3kg` taken offline mid-session, `SCALE OFFLINE`/`SCALE 3 kg · OFFLINE` both shown, OK disabled, dot recovers to green on bring-back | ✅ |
| OrgaTEX unavailable | Defined behaviour — status strip shows `ORGATEX · UNAVAILABLE`; a batch already in progress keeps weighing to completion; write-back `PENDING`, `CONFIRMED` after Retry (TD-8) | All 5 components weighed and confirmed with OrgaTEX offline throughout; batch completed; `Written to OrgaTEX: PENDING`; `CONFIRMED HH:MM:SS` after bringing OrgaTEX online and pressing Retry | ✅ |
| Printer unavailable | Defined behaviour — ticket preview still shown; print error with Retry; batch stays completed (TD-9) | `Printer unavailable` shown, ticket preview visible underneath, ticket stays `PENDING`; printing again (the same "Print ticket" control — no separate Retry label for the ticket, unlike the write-back banner) succeeds once the printer is back online | ✅ |
| Invalid weight | Cannot confirm | −5 g on scale-3kg → `INVALID READING`, OK disabled | ✅ |
| Over tolerance | Cannot confirm | Simulated overshoot → `OVER TOLERANCE — SURPLUS`, OK disabled | ✅ |
| Under tolerance | Cannot confirm | 93.0 g against a 94.0 ± 0.5 g target → `DISPENSE — ... REMAINING`, OK disabled | ✅ |
| Re-tare | Weight reset | 500.0 g set, Re-tare pressed → readout returns to `0.0 g` | ✅ |
| Quit | Safe exit | Active component quit mid-pour → returns to `PENDING`, `"Select a pending component to continue."` shown, re-selectable from scratch with a fresh tare | ✅ |
| Incomplete batch | Cannot complete | 4 of 5 components confirmed, `POST .../complete` → `409 BATCH_INCOMPLETE` | ✅ |

## Note on the printer-unavailable control

The write-back `PENDING` banner (Screen 3's OrgaTEX row) has its own explicit **Retry** button;
the ticket's `PENDING` state does not — the same **Print ticket** button (not yet relabelled
`Reprint`, since nothing has actually printed yet) is the retry, matching
`TicketService.submit`/`retry`'s semantics (an unprinted ticket is never "reprinted," only
retried). Functionally correct and covered by the spec above; flagged here only as a minor label
asymmetry between the two `PENDING` controls on the same screen, not a defect.
