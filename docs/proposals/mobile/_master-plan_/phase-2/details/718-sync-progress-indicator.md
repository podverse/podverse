# 718-sync-progress-indicator

**Master step:** P2.4.9
**Model (author + implement):** Opus 5
**Status:** planned
**Depends on:** [717-fast-startup-and-sync-queue](/docs/proposals/mobile/_master-plan_/phase-2/details/717-fast-startup-and-sync-queue.md)

## Scope

A thin bar that tells the user what is syncing and how much is left, and gets out of the way when
the work is done. It is what makes the fast-start tradeoff in
[717](/docs/proposals/mobile/_master-plan_/phase-2/details/717-fast-startup-and-sync-queue.md)
honest: the app renders from cache immediately, so the user needs a way to see that it is still
catching up.

## Placement

Directly above the mini player; directly above the tab bar when the mini player is hidden. Both fall
out of one insertion point — the custom `tabBar` column in
`apps/mobile/src/navigation/index.tsx:871-880`:

```tsx
<View>
  <PlaybackE2eStatus />
  <MiniPlayer onExpand={onOpenFullPlayer} />
  <BottomTabBar {...props} />
</View>
```

The bar goes above `<MiniPlayer>`. `MiniPlayer` returns `null` when nothing is playing
(`MiniPlayer.tsx:106-108`), so the bar lands on the tab bar automatically with no conditional
placement logic.

**Do not add bottom safe-area padding to the bar.** `BottomTabBar` owns the home-indicator inset and
sits below it.

**Tablet:** at ≥900dp the navigator takes a different branch that renders `BottomTabBar` alone, so
the bar must be added to that branch too or it silently vanishes on tablet. That branch is itself a
known deviation — see
[896-defer-tablet-layout-parity](/docs/proposals/mobile/_master-plan_/phase-2/details/896-defer-tablet-layout-parity.md).

## Content

`{label} — {completed} of {total}`, driven by the queue's progress state. The label is the running
job's i18n key; the counts come from the queue and **the total may grow mid-run** as jobs discover
more work. Do not smooth that over by pretending the denominator is fixed.

Determinate fill, following the existing 2dp `progressTrack`/`progressFill` pattern in
`MiniPlayer.tsx:72-78`. There is no shared progress primitive today; if this is the second
determinate bar in the app, extract one.

The bar is present only while the queue is non-empty. It disappears when the queue drains — no
lingering "done" state, no dismiss control.

## Failure behaviour

Nothing. A failed job is skipped, the run finishes, the bar disappears as normal, and the next
trigger retries. Offline is expected behaviour and must not produce a red bar.

The failure goes to the sync event log instead —
[719](/docs/proposals/mobile/_master-plan_/phase-2/details/719-sync-event-log.md).

## Content inset

`apps/mobile` has **no** bottom-chrome compensation today: no `MINI_PLAYER_HEIGHT`, no
`useBottomTabBarHeight`, and list padding is generic spacing (`HomeScreen.tsx:240-242` and the
`spacing['2xl']` sites across the detail screens). Last rows can already slide under the mini
player, and this bar makes that worse.

Fix it here rather than deferring: introduce one shared bottom-chrome height source that the mini
player, this bar, and scrollable content all read, and apply it where lists currently hardcode
bottom padding. A bar that occludes the last row of every list is not an improvement.

## Accessibility

Per [`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc):

- `accessibilityRole="progressbar"` with `accessibilityValue={{ min, max, now, text }}` — the app
  has no progressbar role yet; the closest precedent is the full-player scrubber
  (`FullPlayerScreen.tsx:316-327`).
- `accessibilityLiveRegion="polite"` so the state change is announced without stealing focus
  (precedent: `GatedFeatureNotice.tsx:100`).
- Announce meaningful transitions only. A per-item announcement on a 40-channel sync is unusable.

## Acceptance criteria

- The bar appears when the queue starts and disappears when it drains, on phone and tablet.
- With something playing, it sits above the mini player; with nothing playing, above the tab bar.
- The label reflects the running job and the counts reflect real queue state, including a total that
  grows.
- A failing job produces no visible change in the bar.
- No list's last row is occluded by the bar, the mini player, or the tab bar.
- The bar is announced by VoiceOver and TalkBack with a role, a value, and a name.

## Verification

```bash
npm run lint
npm run test:unit
npm run mobile:e2e:test -- home
```
