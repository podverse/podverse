# Space shortcut — unify toggle with PlayButton

## Scope

- Route keyboard Space play/pause through `setMPIsPlaying(!mpIsPlaying)` instead of
  `bridge.togglePlay()`.
- Add/update unit tests and E2E asserting actual play-state toggle (not just stability).
- Fixes livestream audio and video; aligns non-live keyboard with UI play button.

Out of scope for this plan: main-content focus on click (plan 02), slider/dialog guards
(plan 03).

## Why this step exists

[`MediaPlayerController.tsx`](/apps/web/src/components/MediaPlayer/Controller/MediaPlayerController.tsx)
registers a window `keydown` listener that calls `togglePlay()` on the non-live bridge.
[`PlayButton.tsx`](/apps/web/src/components/MediaPlayer/Buttons/PlayButton.tsx) uses
`setMPIsPlaying(!mpIsPlaying)`.

During livestream (`mpItem.live_item`), the non-live bridge is disarmed
([`mediaElementBridgeSurface.ts`](/apps/web/src/hooks/mediaElementBridgeSurface.ts)) while
video.js follows `mpIsPlaying` in
[`MediaPlayerControllerLiveStreamAV.tsx`](/apps/web/src/components/MediaPlayer/Controller/MediaPlayerControllerLiveStreamAV.tsx).
Space therefore does not reliably pause live playback.

For non-live audio/video, both paths usually work when focus is correct, but keyboard should
match the UI contract exactly.

## Current state

Listener callback (approx. lines 64–66):

```typescript
() => {
  void togglePlay();
}
```

`NonLiveMediaOrchestrator` already syncs `mpIsPlaying` ↔ bridge via effect (lines 680–686).

## Steps

### 1. Update MediaPlayerController

File: [`MediaPlayerController.tsx`](/apps/web/src/components/MediaPlayer/Controller/MediaPlayerController.tsx)

- Import `mpIsPlaying` and `setMPIsPlaying` from `useMediaPlayer()` (already has
  `mpAddByRSS`, `mpChannel`, `mpDuration`).
- Remove `togglePlay` from `useMediaPlayerControls()` destructuring if no longer used in this
  file (keep `bridgeSeek` for seek).
- Add `mpIsPlayingRef` synced via `useEffect` (same pattern as `mpChannelRef`).
- Pass toggle callback to `handleMediaPlayerWindowKeyDown`:

```typescript
() => {
  setMPIsPlaying(!mpIsPlayingRef.current);
}
```

- Add `setMPIsPlaying` to the `useEffect` dependency array for the keydown listener.

### 2. Unit tests

File: [`mediaPlayerWindowKeyDown.test.ts`](/apps/web/src/components/MediaPlayer/Controller/mediaPlayerWindowKeyDown.test.ts)

No change required to the pure helper unless you add new guard cases in plan 03. Existing
tests already assert `togglePlayPause` is invoked when guards pass.

Optional: add a small integration-style test on `MediaPlayerController` only if an existing
pattern exists; otherwise rely on E2E.

### 3. E2E — assert play-state toggle

Extend or replace coverage in
[`media-player-space-shortcut.spec.ts`](/apps/web/e2e/media-player-space-shortcut.spec.ts)
and/or [`media-player-keyboard-shortcuts.spec.ts`](/apps/web/e2e/media-player-keyboard-shortcuts.spec.ts).

Minimum new behavior to lock in:

1. Load non-live audio via existing harness or seeded podcast flow.
2. Focus `#mainOuterWrapper` programmatically (`page.locator('#mainOuterWrapper').focus()`).
3. Press Space — assert `[data-media-player-playing]` on the persistent player play button
   toggles (or equivalent stable selector).
4. Press Space again — assert it toggles back.

Use [`mediaPlayerHarness`](/apps/web/e2e/helpers/mediaPlayerHarness.ts) helpers where
available.

Do **not** remove the existing “no crash without media” case.

### 4. Livestream note (manual / follow-up E2E)

Seeded livestream E2E may lack enclosure URLs today
([`media-player-livestream-audio-start.spec.ts`](/apps/web/e2e/media-player-livestream-audio-start.spec.ts)).
Document in spec comments that plan 01 enables Space for live when a feed is playable; add
full live Space E2E when seed/HLS mocks exist (see decision matrix § 6c).

## Files touched (expected)

- `apps/web/src/components/MediaPlayer/Controller/MediaPlayerController.tsx`
- `apps/web/e2e/media-player-space-shortcut.spec.ts` (and/or keyboard-shortcuts spec)

## Verification (operator)

```bash
npm run lint
npm run build:packages
npm run build -w apps/web
npm run test:unit
make e2e_test_web_report_spec SPEC=e2e/media-player-space-shortcut.spec.ts
make e2e_test_web_report_spec SPEC=e2e/media-player-keyboard-shortcuts.spec.ts
```

Open `.artifacts/e2e-reports/latest/web/index.html`.

## Risk

**Low.** Same path as `PlayButton`; isolated to controller wiring. Does not fix focus
retention — user must still have non-interactive focus for Space to reach the handler (plan
02).
