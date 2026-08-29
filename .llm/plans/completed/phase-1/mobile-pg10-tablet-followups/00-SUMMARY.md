# Mobile PG-10 tablet — follow-up hardening (2026-08-05)

## Goal

Close the coverage gaps that surfaced when reviewing the archived **PG-10 tablet** slice
(`.llm/plans/completed/phase-1/mobile-pg10-tablet/`). The tablet layouts ship and pass E2E, but three
things are under-verified. This set hardens them without changing the shipped behavior.

**Not** a new feature track. PG-10 (18.1–18.5, 18.15) stays `done` in the master plan; these steps
only add assertions / a documented decision / a regression guard.

## Scope (three follow-ups)

1. **FullPlayer two-column has no E2E coverage (Track 18.4).** `tablet.yaml` asserts the Home grid
   and `podcast-detail-split`, but never opens the full player, so `full-player-two-column` (only
   set when `isTablet`) is only manually verified. → Extend `tablet.yaml` to open + assert it.
2. **The 600–899dp band is untested at the render level.** `resolveIsTablet` flips at `md`=600 but
   the nav rail / split use `lg`=900, so 600–899dp gets 2-col grid + bottom bar + no split (unless
   landscape). Pure logic is unit-covered (`resolveColumns.test.ts`), but no rendered device sits in
   that band (E2E only covers ~390 phone, ~800→1280 Pixel tablet, ~1032 iPad). → Record the intended
   behavior as a decision; only add a mid-band device as an optional nightly (never a PR gate).
3. **Phone Home switched ScrollView → FlatList (broader than tablet).** Rows moved out of the
   `feedCard` wrapper on the primary phone screen. `home` E2E passes, but the phone visual change
   should be confirmed intentional (and documented) or reverted. → Verify + lock intent.

## Out of scope

- Watch / TV (18.6–18.14), CI tablet nightly (18.16), store screenshots (18.17), Track 19 IAP.
- Any redesign of the full player or Home (Track 23 operator polish territory — hard stop).

## Constraints learned from the code (must respect)

- `scripts/mobile/e2e-test.sh` `flow_needs_tablet()` matches only the **exact** basename `tablet`,
  and **tablet flows cannot be mixed with phone flows** in one run. So the FullPlayer assertion is
  cleanest as an **extension of `tablet.yaml`**, not a new `tablet-*.yaml` (a new file would run on
  phones unless `flow_needs_tablet()` is widened).
- Playback hits test-assets on `:2111`, so adding play to `tablet.yaml` means `tablet` must join
  `flow_needs_test_assets()` and the **Mobile E2E test-assets** server must be up for tablet runs.
- Agents do **not** run tests; the operator verifies with the commands in `COPY-PASTA.md`.

## Reference

- Archived slice: `.llm/plans/completed/phase-1/mobile-pg10-tablet/`
- Full-player open pattern: `apps/mobile/e2e/play-mini-player.yaml`
- Breakpoints: `packages/design-tokens/src/tokens.ts` (`sm`/`md`/`lg` = 0/600/900)
- Responsive: `apps/mobile/src/theme/useResponsive.ts`, `resolveColumns.ts`
