# Authoring: Tracks 10, 11 — playback, queue, player UI

**Phase:** B (parallel). **Output file:**
`docs/proposals/mobile/_master-plan_/_draft-tracks/track-10-11.md`

**Detail ID range:** 310–379

Reference:
[DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md),
[media-player-architecture SKILL](/.cursor/skills/media-player-architecture/SKILL.md)

**Prerequisite note:** Track 10/11 depend on Track 1 (playback-core), Track 2 (engine), Track 6
(auth). Document in Track header.

**Default model for this file:** Opus 4.8 for orchestration/parity steps; Codex 5.3 for E2E-only
steps where noted.

Emit master-plan lines with **Model** on each step (see 01-authoring file).

## Track 10 — Queue, auto-queue, playlists, history parity

| Step | Summary | Model | Detail ID |
| ---- | ------- | ----- | --------- |
| 10.1 | Implement queue store mirroring web `QueuesProvider` boundaries. | Opus 4.8 | 310-queue-store |
| 10.2 | On launch fetch all queues + abridged index (same wrappers as web SSR bootstrap). | Opus 4.8 | 311-queue-launch-hydration |
| 10.3 | Resolve active queue by medium via `getQueueForMedium` from `@podverse/helpers`. | Codex 5.3 | 312-active-queue-by-medium |
| 10.4 | Load now-playing + upcoming via queue resource `req*` wrappers. | Codex 5.3 | 313-queue-now-playing-upcoming |
| 10.5 | Implement `useQueueResourcesLoadActive` equivalent RN hook. | Opus 4.8 | 314-hook-queue-load-active |
| 10.6 | Implement add-to-queue next/last via same POST wrappers as web. | Codex 5.3 | 315-queue-add-next-last |
| 10.7 | Implement move now-playing to history on ended/skip. | Opus 4.8 | 316-queue-move-to-history |
| 10.8 | Implement auto-queue store mirroring web `AutoQueueProvider`. | Opus 4.8 | 317-auto-queue-store |
| 10.9 | Implement auto-queue loader hook with playlist sequential/random sources. | Opus 4.8 | 318-auto-queue-playlist-sources |
| 10.10 | Implement auto-queue channel mode sources (pub-date, season, shuffle). | Opus 4.8 | 319-auto-queue-channel-sources |
| 10.11 | Persist auto-queue shuffle/repeat prefs in device storage (web cookie keys `aqc.rd`/`aqc.rp`). | Codex 5.3 | 320-auto-queue-prefs-storage |
| 10.12 | Orchestrate ended event: manual upcoming first, else auto-queue row advance. | Opus 4.8 | 321-orchestrator-ended-advance |
| 10.13 | Wire orchestrator to `@podverse/playback-core` `resolvePlaybackLoadDecision`. | Opus 4.8 | 322-orchestrator-playback-core |
| 10.14 | Implement `useMediaPlayerResourceUpdate` equivalent calling native bridge `loadAndStart`. | Opus 4.8 | 323-hook-resource-update |
| 10.15 | Handle all `PlaybackTarget.kind` variants per parity checklist. | Opus 4.8 | 324-playback-target-kinds |
| 10.16 | Implement music `intent` discriminator for stats side effects. | Opus 4.8 | 325-music-playback-intent |
| 10.17 | Implement clip/soundbite/chapter bounded play with pauseAt. | Opus 4.8 | 326-bounded-segment-playback |
| 10.18 | Implement anonymous playback snapshot persist (mirror web anonymousPlaybackStorage). | Opus 4.8 | 327-anonymous-playback-snapshot |
| 10.19 | Reconcile anonymous snapshot to server queue on login. | Opus 4.8 | 328-anonymous-login-reconcile |
| 10.20 | Playlist row play seeds auto-queue config like web list rows. | Opus 4.8 | 329-playlist-play-seed-autoqueue |
| 10.21 | Stats: wire `reqStats*` on play/page events from mobile client. | Codex 5.3 | 330-stats-tracking |
| 10.22 | Write native cache snapshot on queue/auto-queue changes (feeds Track 12). | Opus 4.8 | 331-native-cache-queue-write |
| 10.23 | E2E: play episode, verify mini player appears (screenshot). | Codex 5.3 | 332-e2e-play-mini-player |
| 10.24 | E2E: add to queue and verify queue screen row (screenshot). | Codex 5.3 | 333-e2e-queue-add |
| 10.25 | E2E: auto-queue advance after track ended (screenshot or state assert). | Opus 4.8 | 334-e2e-auto-queue-advance |

## Track 11 — Mini player, full player, seamless video

| Step | Summary | Model | Detail ID |
| ---- | ------- | ----- | --------- |
| 11.1 | Build mini player UI: artwork, title, play/pause, progress bar, expand affordance. | Codex 5.3 | 340-mini-player-ui |
| 11.2 | Mini player fixed above tab bar; respects safe area and keyboard inset. | Codex 5.3 | 341-mini-player-layout |
| 11.3 | Mini player video mode: transparent placeholder + `targetId=mini` surface registration. | Opus 4.8 | 342-mini-player-video-placeholder |
| 11.4 | Tap mini player expands to full player without calling engine destroy/reload. | Opus 4.8 | 343-expand-without-reload |
| 11.5 | Build full player screen: large artwork/video, scrubber, skip, speed, queue peek. | Codex 5.3 | 350-full-player-ui |
| 11.6 | Full player video mode: `targetId=full` surface + animateVideoSurface from mini. | Opus 4.8 | 351-full-player-video-surface |
| 11.7 | Collapse full player animates surface back to mini target. | Opus 4.8 | 352-collapse-to-mini-animation |
| 11.8 | Verify playback position continuous across mini↔full transitions (no restart). | Opus 4.8 | 353-position-continuity-verify |
| 11.9 | Full player queue/up-next sheet showing manual + auto-queue rows. | Codex 5.3 | 354-full-player-up-next |
| 11.10 | Full player chapter/soundbite list when applicable to now-playing item. | Codex 5.3 | 355-full-player-segments |
| 11.11 | Playback speed control wired to engine setRate. | Codex 5.3 | 356-playback-speed-control |
| 11.12 | Sleep timer optional feature stub (mobile-only nice-to-have). | Auto | 357-sleep-timer-optional |
| 11.13 | Share now-playing deep link action (integrates Track 15). | Codex 5.3 | 358-share-now-playing-link |
| 11.14 | Boost/V4V entry on full player where store-compliant (integrates Track 19). | Opus 4.8 | 359-v4v-boost-entry-stub |
| 11.15 | E2E: video item mini player screenshot. | Codex 5.3 | 360-e2e-video-mini-screenshot |
| 11.16 | E2E: expand to full player screenshot mid-playback (same position). | Opus 4.8 | 361-e2e-video-full-screenshot |
| 11.17 | E2E: collapse to mini screenshot without black flash or reload spinner. | Opus 4.8 | 362-e2e-video-collapse-screenshot |
| 11.18 | Document anti-pattern: never mount second Video component on full screen open. | Auto | 363-anti-pattern-no-second-video |

## Verification

- Tracks 10 and 11 complete; Detail IDs 310–334 and 340–363; Model on every step.
- Seamless video steps reference Track 2 surface APIs, not remount.
