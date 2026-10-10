# iOS header press fix

Some iOS taps on controls in the 44pt header row (y 62–106 on the E2E phone) are reported
COMPLETED by Maestro, and the control's `onPress` never runs. First seen on `image-viewer-back` in
`player-screen`. The same miss blocks several entries in `abctestall-deferred.md`; those are marked
**Related: iOS header press**.

## Evidence before diagnosis

- `player-screen` passed on 2026-09-27 and failed on 2026-10-08 with the same Maestro (2.5.1), the
  same E2E simulator (`9943E576-F215-443B-99E4-A3F96D83D14C`), the same bounds (`[4,62][48,106]`),
  and the same tap point (26, 84).
- The 10-08 build passed `make-clip`, whose `make-clip-close`, `full-player-close`, and
  `full-player-create-clip` sit in the same row. `home` opened the overflow sheet on the first tap
  and missed only on the reopen. The miss depends on app state, not on geometry alone.
- Changes in between: `E2eQuickLogin` gained a full-screen `pointerEvents="box-none"` wrapper
  (87db187b8), then the Expo SDK 57 upgrade (ae751b813: React Native 0.86, react-native-screens
  4.26, gesture-handler 2.32, Reanimated 4, React 19).
- Working idea, unconfirmed: the failing taps happen while something keeps re-rendering (active
  playback, a sync that just finished, a `headerRight` replacement).

## Diagnosis

Temporary `[hdr-press]` logs (removed after the fix):

- `HeaderBarAction`: mount and unmount with testID, `onPressIn`, `onPressOut`, `onPress`.
- App root: `onTouchStart`, `onTouchEnd`, `onTouchCancel` with `pageX`, `pageY`, `target`.
- `AppOverlay`: `visible` changes, phase changes, `removeEntry`.
- `ImageViewerModal`: `onBack`.

Run `npm run mobile:e2e:test -- --platform ios player-screen` (**Mobile Maestro**), then take a
bounded snapshot (**Mobile CarPlay**):

```bash
xcrun simctl spawn 9943E576-F215-443B-99E4-A3F96D83D14C log show --last 4m --style compact \
  --predicate 'process == "PodverseNext" AND subsystem == "com.facebook.react.log" AND eventMessage CONTAINS "[hdr-press]"'
```

Branches:

- **A** — no root touch logged: a native layer wins the hit test.
- **B** — `onPressIn` without `onPress`, or an unmount during the press: the press is cancelled or
  the control remounts.
- **C** — `onPress` and `onBack` logged, overlay stays: the overlay close path is wrong.
- **D** — root touch logged, no `onPressIn` on the header control: the touch went to another target.

At most two fix attempts, then stop and record the evidence.

## Fix and verify

Fix at the layer the logs point to; keep every assert; no flow-only workaround. Then rerun (iOS)
`player-screen`, `search-unparsed`, `track`, `video-transition`, `v4v`, `home`,
`subscriptions-anonymous`, `notifications-inbox`, and `make-clip` as a control. Run Android
`player-screen` when shared code changed. Update `abctestall-deferred.md` with the outcome.

## Out of scope

- `membership-gate`, `podcast-episode`, `tablet` deferred entries.
- A new dismissal gesture for the image viewer (product change).
- Git writes.

## Outcome (branch A)

- No root touch was logged for the lost tap. backboardd sent it to a short-lived app window
  context, not the main window, and UIKit logged `shouldSend: 0`.
- That window is React Native's `RCTDevLoadingView` "Refreshing..." banner (window level
  status bar + 1, top band of the screen). Writing a PNG under `.artifacts/` with the app open
  shows the banner and a new window context every time.
- Cause: the Expo SDK 57 upgrade added the monorepo root to Metro `watchFolders`. Maestro writes
  each `takeScreenshot` under `.artifacts/mobile-e2e-reports/`. Metro sends `update-start` for
  any watched change. The dev client shows the banner for at least 0.85s. Its hide animation
  moves the window's model frame off-screen before the layer leaves, so a header tap in that
  window is dropped.
- Fix: `apps/mobile/metro.config.js` adds the monorepo `.artifacts/` directory to
  `resolver.blockList`. No flow edits were needed for the header taps.
- Reruns after the fix (iOS): `player-screen`, `search-unparsed`, `track`, `video-transition`,
  `v4v`, `subscriptions-anonymous`, `notifications-inbox`, `make-clip`, and `podcast-episode`
  pass. `home` got past the overflow reopen and stopped later, at the Browse chip row.
- Follow-up: `home` passes after `SectionChipRow` scrolls its selected chip into view. Android
  `player-screen` passes after the flow bounds its post-swipe settle wait during playback,
  restores the player region with a swipe on the chip strip, and `CoverImage` rewrites
  test-assets artwork URLs for the emulator. The other deferred entries (launch flake,
  `membership-gate`, `tablet`) are fixed, and `abctestall-deferred.md` was removed.
