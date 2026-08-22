# 01 — FullPlayer two-column E2E assertion (Track 18.4 coverage)

**Cursor model:** Codex 5.3
**Ship bar:** `tablet.yaml` opens the full player on the tablet slots and asserts the two-column
layout (`full-player-two-column`) with a screenshot, on both iOS and Android tablet.

## Why

`FullPlayerScreen` sets `testID="full-player-two-column"` only when `isTablet` (artwork left column
/ controls right column — Track 18.4). Nothing in E2E currently opens the full player on a tablet
slot, so this layout is only manually verified. The phone `play-mini-player.yaml` covers the phone
(single-column) player but runs on phone slots only.

## Context (read first)

- `apps/mobile/e2e/tablet.yaml` — current tablet flow (login → home grid → search → podcast split).
- `apps/mobile/e2e/play-mini-player.yaml` — canonical **open full player** pattern to mirror:
  play via `home-row-play-.*` → wait `playback-active-e2e` → assert `mini-player` → tap
  `mini-player` → assert `full-player-screen` → (iOS `full-player-close` / Android `Back`).
- `apps/mobile/src/screens/player/FullPlayerScreen.tsx` — `full-player-two-column` testID + the
  `full-player-title` / `full-player-play-pause` ids (present in both layouts).
- `scripts/mobile/e2e-test.sh` — `flow_needs_e2e_api()` already lists `tablet`;
  `flow_needs_test_assets()` does **not** (must add — playback hits `:2111`);
  `flow_needs_tablet()` matches only exact basename `tablet` and **forbids mixing tablet + phone
  flows** in one run (so extend `tablet.yaml`, do **not** add a new `tablet-player.yaml`).

## Tasks

1. **Extend `apps/mobile/e2e/tablet.yaml`** after the existing `tablet-podcast-detail` screenshot:
   - From the podcast detail (split), tap an episode row (`podcast-episode-row-0`), assert
     `episode-detail-screen`.
   - Play: `tapOn: id: "home-row-play-.*"` (regex — dynamic id, same as play-mini-player).
   - `extendedWaitUntil` visible `playback-active-e2e` (`${TIMEOUT_SLOW}`); assert `mini-player`.
   - Tap `mini-player`; assert `full-player-screen`.
   - **Assert `full-player-two-column`** (the tablet-only testID) + `full-player-title`.
   - `takeScreenshot: tablet-full-player`.
   - Close to keep the flow clean: iOS `tapOn: id: full-player-close`; Android `pressKey: Back`
     (mirror the platform-gated close in `play-mini-player.yaml`); then `extendedWaitUntil
     notVisible: full-player-screen`.
   - Keep the split still asserted before this section (do not remove existing steps/screenshots).
2. **`scripts/mobile/e2e-test.sh`** — add `tablet` to the `flow_needs_test_assets()` case list so
   the runner requires the test-assets server for the tablet run (playback fixtures on `:2111`).
   Update the nearby comment that enumerates test-assets flows.
3. **Docs** — in `apps/mobile/e2e/HOW-TO-RUN.md` (and the tablet note in `apps/mobile/APPS-MOBILE.md`
   if it lists tablet prerequisites), note that the **Mobile E2E test-assets** server must now be up
   for `npm run mobile:e2e:test -- tablet` (previously tablet was UI+API only).

## Guards / gotchas

- The tablet flow gets longer + now needs `:2111`; keep the play section minimal (no speed/sleep
  panels — those are already covered on phone by `play-mini-player.yaml`).
- Do not add `full-player-two-column` assertions to phone flows — the id is absent when `!isTablet`.
- Android native-stack modal close uses hardware Back (Maestro Close tap is a no-op there) — mirror
  the existing `when: platform: Android → pressKey: Back` block exactly.
- iPad renders the tablet layout in portrait (~1032dp ≥ lg); Android tablet is already landscape
  from the existing `setOrientation` step — both satisfy `isTablet`, so no extra rotation needed.

## Acceptance

- `npm run mobile:e2e:test -- tablet` is green on `ios-tablet` and `android-tablet`, with
  `full-player-two-column` asserted and `tablet-full-player.png` present in both slot reports.
- Runner fails fast with a clear message if `:2111` is down for the tablet run.

## Alternative (only if a separate flow is preferred later)

Add `tablet-player.yaml` **and** widen `flow_needs_tablet()` (and the `all`-suite exclusion) to
match `tablet*`. More moving parts in `e2e-test.sh`; not needed for this ship bar.
