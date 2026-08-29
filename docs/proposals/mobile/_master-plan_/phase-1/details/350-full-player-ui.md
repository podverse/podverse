# 350-full-player-ui

**Master step:** 11.5
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Build full player screen: large artwork (audio), scrubber, skip, speed entry, queue peek entry.
- Replace placeholder `FullPlayerScreen`.

## File paths

- `apps/mobile/src/navigation/index.tsx` FullPlayerScreen
- Suggested: `apps/mobile/src/screens/player/FullPlayerScreen.tsx`

## Acceptance criteria

- Artwork/title/scrubber/skip controls work for audio now-playing
- Scrubber seeks via bridge
- Entry points to up-next (11.9) and speed (11.11)
- `testID="full-player-screen"` retained

## Web parity references

- Web full media player layout (behavioral)
- Mobile placeholder FullPlayerScreen

## Verification

```bash
npm run mobile:e2e:test -- play-mini-player
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```

## Depends on

- 11.4

## Implementation notes

- Extracted the placeholder route into `apps/mobile/src/screens/player/FullPlayerScreen.tsx`
  (navigation renders it via a render-prop with `onClose={() => navigation.goBack()}`). It reads the
  shared `usePlayback()` state — no second engine instance (11.4 contract preserved).
- Audio layout: large artwork (`radii.md`), title/channel, tap-to-seek scrubber, position/duration,
  play/pause + skip-to-next controls, and disabled entry-point buttons for Up Next (11.9) and
  Playback Speed (11.11) that light up when their handlers are wired in prompt 04+.
- Scrubber seeks via the bridge: `onPress` maps `locationX / trackWidth` to
  `seekTo(ratio * durationSeconds)` (measured with `onLayout`).
- i18n: added `media_player.seek`, `media_player.skip_to_next`, `media_player.up_next` to the
  consumer catalog (web parity) and ran `npm run i18n:compile`. Speed entry reuses
  `media_player.playback_speed.playback_speed`; close reuses `misc.close`.
- Retained `testID="full-player-screen"`; new testIDs: `full-player-title`, `full-player-position`,
  `full-player-scrubber`, `full-player-play-pause`, `full-player-skip-next`, `full-player-up-next`,
  `full-player-speed`, and `full-player-idle` (deep-link-into-idle edge case).
- Deferred: video surface (11.6), collapse animation (11.7).
