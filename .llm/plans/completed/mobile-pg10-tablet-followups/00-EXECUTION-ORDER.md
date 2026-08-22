# Execution order — mobile-pg10-tablet-followups

Run COPY-PASTA prompts **1 → 2 → 3** in order. They are independent in code, but 01 and 03 both
touch E2E/screen wiring, so keep them sequential to avoid re-merging.

## Steps

1. **01** — FullPlayer two-column E2E assertion: extend `tablet.yaml` to open the full player and
   assert `full-player-two-column` + screenshot; add `tablet` to `flow_needs_test_assets()`
   (Track 18.4 coverage).
2. **02** — Mid-band (600–899dp) breakpoint decision: document the intended `md` vs `lg` layering in
   the device-matrix doc; keep any mid-band device as an optional nightly note only (no PR gate).
3. **03** — Phone Home FlatList visual confirm: lock the intended post-refactor layout (rows outside
   `feedCard`) with a code comment, or restore rows-in-card if it was an unintended regression.

## Parallelism

Low risk to parallelize, but 01 edits `tablet.yaml` + `e2e-test.sh` and 03 may edit `HomeScreen.tsx`
+ a screenshot expectation; prefer sequential. 02 is docs-only.

## After each prompt

- Mark `[x]` in `COPY-PASTA.md` and move the finished numbered file to
  `.llm/plans/completed/mobile-pg10-tablet-followups/`.
- Do **not** run tests during agent work; the operator verifies at the end.
- **No master-plan status changes** — PG-10 (18.1–18.5, 18.15) is already `done`; this set only
  hardens it. (If 02 concludes a mid-band nightly is wanted, note it against 18.16, still `_TBD_`.)

## Definition of done for the set

- `tablet.yaml` asserts `full-player-two-column` on both tablet slots + screenshot exists.
- Device-matrix doc states the 600–899dp intended behavior (and whether a nightly device is wanted).
- Phone Home layout intent is explicit in code (comment or restored wrapper); `home` E2E still green.
