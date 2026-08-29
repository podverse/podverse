# 081-native-playback-bridge-interface

**Master step:** 2.2
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Define TypeScript `NativePlaybackBridge` interface under `apps/mobile/src/` (or module TS folder).
- Mirror the imperative surface of web `mediaElementBridgeSurface` / `useMediaElementBridge`
  (load, play, pause, seek, rate, position, duration, destroy) without DOM types.
- Export named types only; no default export.

## Architecture notes

- Policy stays in `@podverse/playback-core`; this interface is transport only.
- Parallel web ESLint intent: RN must not call native player APIs outside this adapter.
- Extend (or sibling type) for native-cache writes from detail **114** (`writeQueueSnapshot`,
  `writeDownloadsIndex`, `writeLibraryBrowseIndex`) so queue/store code has a typed target before
  Track 12.

## Acceptance criteria

- Step 2.2 complete per master plan
- Interface compiles under mobile `tsconfig`
- Methods cover the spike audio contract (video attach APIs deferred to 2.18+)
- Cache-write method names reserved (stubs OK) per 114

## Web parity references

- `apps/web/src/hooks/useMediaElementBridge.ts`
- `apps/web/src/lib/playback/mediaElementBridgeSurface.ts` (if present)
- [media-player-architecture](/.cursor/skills/media-player-architecture/SKILL.md)
- [114-engine-native-cache-hooks](/docs/proposals/mobile/_master-plan_/phase-1/details/114-engine-native-cache-hooks.md)

## Verification

```bash
./scripts/nix/with-env npm run type-check --prefix apps/mobile || true
rg -n 'NativePlaybackBridge' apps/mobile
```
