# 04 — Sync progress indicator

**Cursor model:** Opus 5
**Reasoning:** high
**Detail:** [718-sync-progress-indicator](/docs/proposals/mobile/_master-plan_/phase-2/details/718-sync-progress-indicator.md)
**Master step:** P2.4.9
**Depends on:** 03

Read [`mobile-sync-orchestration`](/.cursor/rules/mobile-sync-orchestration.mdc) before starting.

## Goal

A thin bar that says what is syncing and how many steps remain, sitting directly above the mini
player — or directly above the tab bar when the mini player is hidden — and disappearing when the
queue drains.

## Work

1. Build the bar as a component reading the queue state from prompt 03. Content is the running job's
   label plus `{completed} of {total}`, with a determinate fill. Follow the existing 2dp
   `progressTrack` / `progressFill` pattern in `MiniPlayer.tsx:72-78`; if this becomes the app's
   second determinate bar, extract a shared primitive rather than copying it a third time.
2. Mount it in the custom `tabBar` column at `apps/mobile/src/navigation/index.tsx:871-880`, **above
   `<MiniPlayer>`**. `MiniPlayer` returns `null` when nothing is playing
   (`MiniPlayer.tsx:106-108`), so it falls to the tab bar automatically — do not write conditional
   placement logic for that.
3. Mount it in the tablet branch too. At ≥900dp the navigator returns a bare `<BottomTabBar>` and the
   bar would silently vanish. Do **not** fix the wider tablet divergence here; it is recorded in
   [896](/docs/proposals/mobile/_master-plan_/phase-2/details/896-defer-tablet-layout-parity.md).
4. Fix the bottom content inset. There is no `MINI_PLAYER_HEIGHT` and no `useBottomTabBarHeight` in
   the app today, so lists can already slide under the mini player and this bar makes it worse.
   Introduce one shared bottom-chrome height that the mini player, this bar, and scrollable content
   all read, and apply it where lists hardcode bottom padding (`HomeScreen.tsx:240-242` and the
   `spacing['2xl']` sites across detail screens).
5. Show nothing on failure. A failed job is skipped by the queue and the bar behaves normally.
   Offline is expected and must not produce a red bar.
6. Accessibility per [`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc):
   `accessibilityRole="progressbar"` with `accessibilityValue={{ min, max, now, text }}` (nearest
   precedent: `FullPlayerScreen.tsx:316-327`) and `accessibilityLiveRegion="polite"`. Announce
   meaningful transitions only — per-item announcements on a 40-channel sync are unusable.
7. Job labels go in the **`mobile`** i18n catalog; these strings have no web counterpart.

## Constraints

- Do not add bottom safe-area padding to the bar. `BottomTabBar` owns the home-indicator inset.
- No dismiss control and no lingering "done" state — presence is derived from queue state alone.
- Do not run tests during implementation.

## Watch for

Pull-to-refresh and OPML import keep their own local spinners **and** report to the bar. If that
reads as duplicated feedback in practice, say so rather than quietly dropping one.

## Done when

The bar appears when the queue starts, tracks a total that can grow, disappears when the queue
drains, sits correctly with and without the mini player on both phone and tablet, and no list's last
row is occluded.
