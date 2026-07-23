# 343-expand-without-reload

**Master step:** 11.4
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Tap mini player expands to full player without calling engine destroy/reload (audio-first).
- Position and play/pause state continuous.

## Architecture notes

Use existing root stack route `FullPlayer`. Share player state via context/store — do not remount
a second engine instance.

## Edge cases / cross-track deps

- Deep link into full player while idle
- Expand during buffering

## Acceptance criteria

- Navigation to `FullPlayer` does not call `destroy` or reload enclosure
- Position continuous across expand
- Back/collapse returns to mini without reload (audio; video animation is 11.7 deferred)

## Web parity references

- Mobile: `ROOT_STACK_ROUTES.FullPlayer` in `apps/mobile/src/navigation/index.tsx`
- Web mini↔full without remounting media element

## Verification

```bash
npm run mobile:e2e:test -- play-mini-player
```

## Depends on

- 11.1, 10.14

## Implementation notes

- `FullPlayerScreen` (`apps/mobile/src/navigation/index.tsx`) reads shared state from
  `usePlayback()` (provider hosted at the app root) — it never calls `bridge.load`/`destroy`, so the
  process-wide `nativePlaybackBridge` singleton keeps playing across the modal push/pop. Position and
  play/pause are continuous because both the mini and full player render the same provider state.
- Deep-link-into-idle edge case: when no `activeTarget`, the route shows an idle label
  (`full-player-idle`) instead of crashing.
- E2E: `play-mini-player.yaml` expands via `mini-player`, asserts `full-player-title`, collapses via
  `full-player-close`, then re-asserts `mini-player` + `playback-active-e2e` to prove playback was
  never torn down (the tab-bar E2E status is covered while the modal is open, so it is only asserted
  after collapse). Richer full-player layout is deferred to Track 11.5.
