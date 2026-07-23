# 323-hook-resource-update

**Master step:** 10.14
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Implement `useMediaPlayerResourceUpdate` equivalent calling native bridge load+play
  (`loadAndStart` when added; until then `load` then `play` per current bridge).
- Apply playback-core decision: URL, start position, rate, pauseAt.

## Architecture notes

Web hook: `useMediaPlayerResourceUpdate.tsx`. Mobile adapter:
`apps/mobile/src/bridge/nativePlaybackBridge.ts` +
`modules/podverse-media-engine` `NativePlaybackBridge`. Prefer adding `loadAndStart` on bridge
if still missing (master step text).

## Edge cases / cross-track deps

- Enclosure host rewrite for Android E2E (5.23)
- Add-by-RSS already plays via `useAddByRssPlayback` — converge on this hook over time
- Video kinds: load audio path only in PG-7a; surface attach is Track 11/PG-5

## Acceptance criteria

- Explicit play from Home/Episode loads enclosure and starts audio
- Position continuity on queue advance
- Errors map to helpers playback error shapes where defined
- E2E testID / mini-player slot becomes active

## Web parity references

- Web: `apps/web/src/hooks/useMediaPlayerResourceUpdate.tsx`
- Bridge: `apps/mobile/modules/podverse-media-engine/src/NativePlaybackBridge.ts`

## Verification

```bash
npm run mobile:e2e:test -- podcast-episode
```

## Depends on

- 10.13; engine spike GO
