# Draft: Tracks 10, 11 — playback, queue, player UI

**Prerequisites:** Track 1 (`playback-core`), Track 2 (`podverse-media-engine`), Track 6 (auth).

Reference:
[DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md),
[media-player-architecture SKILL](/.cursor/skills/media-player-architecture/SKILL.md)

Seamless video steps reference Track 2 surface APIs (`attachVideoSurface`, `animateVideoSurface`) —
never remount a second Video component on full-screen open.

## Track 10 — Queue, auto-queue, playlists, history parity

10.1. Implement queue store mirroring web `QueuesProvider` boundaries. Model: Opus 4.8. Detail: [310-queue-store](/docs/proposals/mobile/_master-plan_/details/310-queue-store.md) — _TBD_
10.2. On launch fetch all queues + abridged index (same wrappers as web SSR bootstrap). Model: Opus 4.8. Detail: [311-queue-launch-hydration](/docs/proposals/mobile/_master-plan_/details/311-queue-launch-hydration.md) — _TBD_
10.3. Resolve active queue by medium via `getQueueForMedium` from `@podverse/helpers`. Model: Codex 5.3. Detail: [312-active-queue-by-medium](/docs/proposals/mobile/_master-plan_/details/312-active-queue-by-medium.md) — _TBD_
10.4. Load now-playing + upcoming via queue resource `req*` wrappers. Model: Codex 5.3. Detail: [313-queue-now-playing-upcoming](/docs/proposals/mobile/_master-plan_/details/313-queue-now-playing-upcoming.md) — _TBD_
10.5. Implement `useQueueResourcesLoadActive` equivalent RN hook. Model: Opus 4.8. Detail: [314-hook-queue-load-active](/docs/proposals/mobile/_master-plan_/details/314-hook-queue-load-active.md) — _TBD_
10.6. Implement add-to-queue next/last via same POST wrappers as web. Model: Codex 5.3. Detail: [315-queue-add-next-last](/docs/proposals/mobile/_master-plan_/details/315-queue-add-next-last.md) — _TBD_
10.7. Implement move now-playing to history on ended/skip. Model: Opus 4.8. Detail: [316-queue-move-to-history](/docs/proposals/mobile/_master-plan_/details/316-queue-move-to-history.md) — _TBD_
10.8. Implement auto-queue store mirroring web `AutoQueueProvider`. Model: Opus 4.8. Detail: [317-auto-queue-store](/docs/proposals/mobile/_master-plan_/details/317-auto-queue-store.md) — _TBD_
10.9. Implement auto-queue loader hook with playlist sequential/random sources. Model: Opus 4.8. Detail: [318-auto-queue-playlist-sources](/docs/proposals/mobile/_master-plan_/details/318-auto-queue-playlist-sources.md) — _TBD_
10.10. Implement auto-queue channel mode sources (pub-date, season, shuffle). Model: Opus 4.8. Detail: [319-auto-queue-channel-sources](/docs/proposals/mobile/_master-plan_/details/319-auto-queue-channel-sources.md) — _TBD_
10.11. Persist auto-queue shuffle/repeat prefs in device storage (web cookie keys `aqc.rd`/`aqc.rp`). Model: Codex 5.3. Detail: [320-auto-queue-prefs-storage](/docs/proposals/mobile/_master-plan_/details/320-auto-queue-prefs-storage.md) — _TBD_
10.12. Orchestrate ended event: manual upcoming first, else auto-queue row advance. Model: Opus 4.8. Detail: [321-orchestrator-ended-advance](/docs/proposals/mobile/_master-plan_/details/321-orchestrator-ended-advance.md) — _TBD_
10.13. Wire orchestrator to `@podverse/playback-core` `resolvePlaybackLoadDecision`. Model: Opus 4.8. Detail: [322-orchestrator-playback-core](/docs/proposals/mobile/_master-plan_/details/322-orchestrator-playback-core.md) — _TBD_
10.14. Implement `useMediaPlayerResourceUpdate` equivalent calling native bridge `loadAndStart`. Model: Opus 4.8. Detail: [323-hook-resource-update](/docs/proposals/mobile/_master-plan_/details/323-hook-resource-update.md) — _TBD_
10.15. Handle all `PlaybackTarget.kind` variants per parity checklist. Model: Opus 4.8. Detail: [324-playback-target-kinds](/docs/proposals/mobile/_master-plan_/details/324-playback-target-kinds.md) — _TBD_
10.16. Implement music `intent` discriminator for stats side effects. Model: Opus 4.8. Detail: [325-music-playback-intent](/docs/proposals/mobile/_master-plan_/details/325-music-playback-intent.md) — _TBD_
10.17. Implement clip/soundbite/chapter bounded play with pauseAt. Model: Opus 4.8. Detail: [326-bounded-segment-playback](/docs/proposals/mobile/_master-plan_/details/326-bounded-segment-playback.md) — _TBD_
10.18. Implement anonymous playback snapshot persist (mirror web anonymousPlaybackStorage). Model: Opus 4.8. Detail: [327-anonymous-playback-snapshot](/docs/proposals/mobile/_master-plan_/details/327-anonymous-playback-snapshot.md) — _TBD_
10.19. Reconcile anonymous snapshot to server queue on login. Model: Opus 4.8. Detail: [328-anonymous-login-reconcile](/docs/proposals/mobile/_master-plan_/details/328-anonymous-login-reconcile.md) — _TBD_
10.20. Playlist row play seeds auto-queue config like web list rows. Model: Opus 4.8. Detail: [329-playlist-play-seed-autoqueue](/docs/proposals/mobile/_master-plan_/details/329-playlist-play-seed-autoqueue.md) — _TBD_
10.21. Stats: wire `reqStats*` on play/page events from mobile client. Model: Codex 5.3. Detail: [330-stats-tracking](/docs/proposals/mobile/_master-plan_/details/330-stats-tracking.md) — _TBD_
10.22. Write native cache snapshot on queue/auto-queue changes (feeds Track 12). Model: Opus 4.8. Detail: [331-native-cache-queue-write](/docs/proposals/mobile/_master-plan_/details/331-native-cache-queue-write.md) — _TBD_
10.23. E2E: play episode, verify mini player appears (screenshot). Model: Codex 5.3. Detail: [332-e2e-play-mini-player](/docs/proposals/mobile/_master-plan_/details/332-e2e-play-mini-player.md) — _TBD_
10.24. E2E: add to queue and verify queue screen row (screenshot). Model: Codex 5.3. Detail: [333-e2e-queue-add](/docs/proposals/mobile/_master-plan_/details/333-e2e-queue-add.md) — _TBD_
10.25. E2E: auto-queue advance after track ended (screenshot or state assert). Model: Opus 4.8. Detail: [334-e2e-auto-queue-advance](/docs/proposals/mobile/_master-plan_/details/334-e2e-auto-queue-advance.md) — _TBD_

## Track 11 — Mini player, full player, seamless video

11.1. Build mini player UI: artwork, title, play/pause, progress bar, expand affordance. Model: Codex 5.3. Detail: [340-mini-player-ui](/docs/proposals/mobile/_master-plan_/details/340-mini-player-ui.md) — _TBD_
11.2. Mini player fixed above tab bar; respects safe area and keyboard inset. Model: Codex 5.3. Detail: [341-mini-player-layout](/docs/proposals/mobile/_master-plan_/details/341-mini-player-layout.md) — _TBD_
11.3. Mini player video mode: transparent placeholder + `targetId=mini` surface registration. Model: Opus 4.8. Detail: [342-mini-player-video-placeholder](/docs/proposals/mobile/_master-plan_/details/342-mini-player-video-placeholder.md) — _TBD_
11.4. Tap mini player expands to full player without calling engine destroy/reload. Model: Opus 4.8. Detail: [343-expand-without-reload](/docs/proposals/mobile/_master-plan_/details/343-expand-without-reload.md) — _TBD_
11.5. Build full player screen: large artwork/video, scrubber, skip, speed, queue peek. Model: Codex 5.3. Detail: [350-full-player-ui](/docs/proposals/mobile/_master-plan_/details/350-full-player-ui.md) — _TBD_
11.6. Full player video mode: `targetId=full` surface + animateVideoSurface from mini. Model: Opus 4.8. Detail: [351-full-player-video-surface](/docs/proposals/mobile/_master-plan_/details/351-full-player-video-surface.md) — _TBD_
11.7. Collapse full player animates surface back to mini target. Model: Opus 4.8. Detail: [352-collapse-to-mini-animation](/docs/proposals/mobile/_master-plan_/details/352-collapse-to-mini-animation.md) — _TBD_
11.8. Verify playback position continuous across mini↔full transitions (no restart). Model: Opus 4.8. Detail: [353-position-continuity-verify](/docs/proposals/mobile/_master-plan_/details/353-position-continuity-verify.md) — _TBD_
11.9. Full player queue/up-next sheet showing manual + auto-queue rows. Model: Codex 5.3. Detail: [354-full-player-up-next](/docs/proposals/mobile/_master-plan_/details/354-full-player-up-next.md) — _TBD_
11.10. Full player chapter/soundbite list when applicable to now-playing item. Model: Codex 5.3. Detail: [355-full-player-segments](/docs/proposals/mobile/_master-plan_/details/355-full-player-segments.md) — _TBD_
11.11. Playback speed control wired to engine setRate. Model: Codex 5.3. Detail: [356-playback-speed-control](/docs/proposals/mobile/_master-plan_/details/356-playback-speed-control.md) — _TBD_
11.12. Sleep timer optional feature stub (mobile-only nice-to-have). Model: Auto. Detail: [357-sleep-timer-optional](/docs/proposals/mobile/_master-plan_/details/357-sleep-timer-optional.md) — _TBD_
11.13. Share now-playing deep link action (integrates Track 15). Model: Codex 5.3. Detail: [358-share-now-playing-link](/docs/proposals/mobile/_master-plan_/details/358-share-now-playing-link.md) — _TBD_
11.14. Boost/V4V entry on full player where store-compliant (integrates Track 19). Model: Opus 4.8. Detail: [359-v4v-boost-entry-stub](/docs/proposals/mobile/_master-plan_/details/359-v4v-boost-entry-stub.md) — _TBD_
11.15. E2E: video item mini player screenshot. Model: Codex 5.3. Detail: [360-e2e-video-mini-screenshot](/docs/proposals/mobile/_master-plan_/details/360-e2e-video-mini-screenshot.md) — _TBD_
11.16. E2E: expand to full player screenshot mid-playback (same position). Model: Opus 4.8. Detail: [361-e2e-video-full-screenshot](/docs/proposals/mobile/_master-plan_/details/361-e2e-video-full-screenshot.md) — _TBD_
11.17. E2E: collapse to mini screenshot without black flash or reload spinner. Model: Opus 4.8. Detail: [362-e2e-video-collapse-screenshot](/docs/proposals/mobile/_master-plan_/details/362-e2e-video-collapse-screenshot.md) — _TBD_
11.18. Document anti-pattern: never mount second Video component on full screen open. Model: Auto. Detail: [363-anti-pattern-no-second-video](/docs/proposals/mobile/_master-plan_/details/363-anti-pattern-no-second-video.md) — _TBD_
