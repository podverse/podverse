# 322-orchestrator-playback-core

**Master step:** 10.13
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Wire orchestrator to `@podverse/playback-core` `resolvePlaybackLoadDecision`.
- All load decisions for play/skip/ended go through playback-core — no divergent mobile policy.

## Architecture notes

Import `resolvePlaybackLoadDecision` from `@podverse/playback-core`. Map mobile now-playing +
intent into `MediaPlayerPlaybackLoadInput`-compatible shapes.

## Edge cases / cross-track deps

- Music intent discrimination deferred detail in 10.16 but hook points here
- Bounded segments 10.17 consume pauseAt from decision

## Acceptance criteria

- Load inputs produce same decision kinds as web for audio targets
- Unit tests cover decision matrix without native
- Stubs `useHomeRowPlaybackStub` / `useClipPlaybackStub` replaced by orchestrated play path

## Web parity references

- `packages/playback-core/src/resolvePlaybackLoadDecision.ts`
- Web: `apps/web/src/lib/playback/index.ts`, `useMediaPlayerResourceUpdate.tsx`

## Verification

```bash
npm run test -w @podverse/playback-core
```

## Depends on

- 10.12
