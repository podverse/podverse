# 340-mini-player-ui

**Master step:** 11.1
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Build mini player UI: artwork, title, play/pause, progress bar, expand affordance.
- Replace placeholder `MiniPlayerSlot` content with real controls bound to queue now-playing +
  native bridge state.

## File paths

- `apps/mobile/src/navigation/index.tsx`
- New components under `apps/mobile/src/components/player/` (suggested)

## Acceptance criteria

- Shows title/artwork for current now-playing audio item
- Play/pause toggles native bridge
- Progress updates without jank (throttled position observer)
- Expand control navigates to full player route
- `testID="mini-player"` retained for E2E

## Web parity references

- Web mini/player chrome behavioral parity
- Mobile placeholder: `apps/mobile/src/navigation/index.tsx` MiniPlayerSlot

## Verification

```bash
npm run mobile:e2e:test -- play-mini-player
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```

## Implementation notes

- Component: `apps/mobile/src/components/player/MiniPlayer.tsx`, rendered in the phone tab bar column
  in `apps/mobile/src/navigation/index.tsx` (replaces the old `MiniPlayerSlot` placeholder).
- Binds to `usePlayback()`: artwork/title/channel from `nowPlaying`, play/pause via `pause`/`resume`,
  thin progress bar from `positionSeconds`/`durationSeconds` (flex-ratio track, no % string types).
- testIDs: `mini-player` (retained), `mini-player-title`, `mini-player-play-pause`,
  `mini-player-progress`. Expand tap navigates to the `FullPlayer` route.
- Video mini placeholder (11.3) intentionally **not** implemented.

## Depends on

- 10.14 resource update; 10.4 now-playing
