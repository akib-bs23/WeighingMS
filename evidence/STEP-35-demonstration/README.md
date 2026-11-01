# STEP 35 — Final Demonstration

Driven live against the running application (frontend :5173, API :3000) via Playwright, not
slides. All screenshots and logs below were captured in a single continuous run just now
(2026-11-01), with Part 8 re-running the full suite fresh immediately after.

## Part 1 — Batch
- `part1-01-batch-queue.png` — queue from OrgaTEX: B-24187 (RELEASED), B-24188/90/91 (QUEUED)
- `part1-02-batch-selected.png` — B-24187 selected, crumb shows BATCH/ORDER/MACHINE

## Part 2 — Recipe
- `part2-recipe-five-components.png` — all 5 components visible: Remazol Brill. Blue RSPL,
  Remazol Red RB, Remazol Yellow RGB, Sodium Sulphate, Soda Ash

## Part 3 — Scale
- `part3-01-scale-3kg-yellow-rgb.png` — Yellow RGB active, `3 kg precision` scale selected
  (completed after this screenshot)
- `part3-02-scale-32kg-sodium-sulphate.png` — Sodium Sulphate active, `32 kg floor` scale
  auto-selected

## Part 4 — Tolerance
- `part4-01-invalid-weight-blocked.png` — negative reading on scale-32kg → `INVALID READING`,
  OK · Confirm disabled (dimmed)
- `part4-02-within-tolerance-enabled.png` — re-tared and dispensed to target → `WITHIN TOLERANCE`,
  OK · Confirm enabled (bright)

## Part 5 — Complete
- `part5-batch-complete.png` — all 5 components confirmed, `Batch B-24187 weighed`, `5 of 5`

## Part 6 — Integration
- `part6-01-orgatex-confirmed-ui.png` — UI shows `Written to OrgaTEX: CONFIRMED HH:MM:SS`
- `part6-03-orgatex-network-log.txt` — the actual `POST /api/sessions/:id/complete` request and
  its response, captured from the browser's network traffic; response body's `summary.writeBack`
  shows `"status":"CONFIRMED"` with a `consumptionId`
- `part6-02-stored-transaction.json` — the stored consumption record fetched independently via
  `GET /api/training/orgatex/consumption?batchId=B-24187`, 5 lines, matching the ticket

## Part 7 — Ticket
- `part7-ticket-preview.png` — ticket preview rendered on Screen 3, `Print ticket` enabled

## Part 8 — Automated Test
- `part8-playwright-result.txt` — fresh terminal run: **19/19 passed**, ~2.0 min
- `part8-playwright-report.png` — the Playwright HTML report, same run, all green

## Note

Vitest (571/571) was not re-captured here since Step 8 asks specifically for the Playwright
result; the fresh Vitest run from Step 33 (`evidence/STEP-33-validation-report.md`) stands as
that evidence.
