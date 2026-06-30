# 06 — Playback, queue, auto-queue, and playlist parity

## Scope

Generate a deep proposal for mirroring Podverse web **playback policy**, **queue**, **auto-queue**,
and **playlist-driven play** on mobile — the most sophisticated product areas.

**Output file:**
`docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md`

Docs only — no code changes.

## Audience

Agents implementing the mobile player and queue; operators prioritizing parity work.

## Required document sections

1. **Executive summary** — reuse pure policy + same API sequences; replace DOM bridge with native
   audio bridge + native car cache.
2. **Web architecture recap (cited)** — summarize layers from
   [media-player-architecture SKILL](/.cursor/skills/media-player-architecture/SKILL.md):
   - Policy: `apps/web/src/lib/playback/`
   - Bridge: `useMediaElementBridge`, `mediaElementBridgeSurface.ts`
   - Controls: `MediaPlayerControlsProvider`, `useMediaPlayerControls`
   - Orchestration: `NonLiveMediaOrchestrator`, `NonLiveMediaMount`
   - State: `MediaPlayerProvider`, `applyPlaybackLoad`
   - Decision matrix: `MEDIA-PLAYER-DECISION-MATRIX.md`
3. **Mobile target architecture** — mermaid flow parallel to web:

   ```mermaid
   flowchart LR
     UI[Play actions] --> Hook[useMediaPlayerResourceUpdate equivalent]
     Hook --> Policy[playback-core resolvePlaybackLoadDecision]
     Policy --> Bridge[NativePlaybackBridge]
     Bridge --> Native[TrackPlayer or AVPlayer]
     Car[CarPlay AndroidAuto] --> Cache[(Native cache)]
     Hook --> Cache
   ```

4. **`packages/playback-core` role** — what moves from web; what stays in `apps/web` and
   `apps/mobile` separately (hooks, bridge).
5. **Playback policy parity checklist** — enumerate `PlaybackTarget.kind` values and mobile
   handling (`item-podcast`, `clip`, `chapter`, `add-by-rss`, etc.) from
   `resolvePlaybackLoadDecision.ts`.
6. **Manual queue parity** — server endpoints from `apps/api/src/routes/queue.ts`; client wrappers
   in `packages/helpers-requests/src/api/queue/`; web hooks:
   - `useQueueResourcesLoadActive`
   - `useQueueResourcesUpdateNowPlaying`
   - `useMediaPlayerControllerQueueHeadLoading`
   - `combineQueueNowPlayingAndUpcoming`
   Describe mobile equivalent flow step-by-step.
7. **Abridged index / resume** — `QueueResourcesAbridgedIndex`, SSR bootstrap in
   `apps/web/src/app/layout.tsx`, `resumeSeekFromAbridged`; mobile launch fetch strategy.
8. **Auto-queue parity** — `AutoQueueProvider`, `useAutoQueueLoadResources`:
   - Playlist mode: `reqPlaylistResourceGetManyForQueueByListPosition`, shuffle variant
   - Channel mode: `reqItemGetManyForQueueByPubDate`, season, shuffle
   - Client-only state; cookie prefs `aqc.rd`, `aqc.rp` → mobile local prefs
   - Advance on ended: `NonLiveMediaOrchestrator` path
9. **Playlist integration** — play from playlist row seeds auto-queue config; cite
   `CommonEpisodeListRow` / list row patterns; playlist pages under `apps/web/src/app/playlist/`.
10. **Anonymous playback** — `anonymousPlaybackStorage.ts`; mobile secure storage equivalent.
11. **Native car layer (summary)** — link
    [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md);
    native cache contract JS must write when queue/library changes.
12. **Testing parity proposal** — unit tests on `playback-core`; integration tests on queue API
    (existing); mobile Maestro flows mirroring web e2e areas (`apps/web/e2e/media-player-*.spec.ts`
    as reference only).
13. **Known deferrals** — livestream HLS (`video.js`); embed mode.

## Exploration checklist

- `apps/web/src/lib/playback/` — all files
- `apps/web/src/contexts/AutoQueue.tsx`, `Queue.tsx`, `MediaPlayer.tsx`
- `apps/web/src/hooks/useMediaPlayerResourceUpdate.tsx`
- `apps/web/src/hooks/useAutoQueueLoadResources.tsx`
- `apps/web/src/hooks/useQueueResourcesLoadActive.tsx`
- `packages/helpers-requests/src/api/queue/`, `playlist/`

## Diagrams (required)

1. Web vs mobile side-by-side playback stack.
2. Queue + auto-queue state machine on ended/skip.

## Conventions

Markdown ≤100 cols. Cite hook and `req*` names. Link to 04 overview and 05 parity matrix.

## Verification

```bash
test -f docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md
```
