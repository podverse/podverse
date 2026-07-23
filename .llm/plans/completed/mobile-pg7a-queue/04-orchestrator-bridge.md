# 04 — Orchestrator, playback-core, bridge load, kinds, intent, bounded segments

Implement master steps **10.12–10.17**. Highest-risk PG-7a prompt.

## Detail docs

- [321-orchestrator-ended-advance](/docs/proposals/mobile/_master-plan_/details/321-orchestrator-ended-advance.md)
- [322-orchestrator-playback-core](/docs/proposals/mobile/_master-plan_/details/322-orchestrator-playback-core.md)
- [323-hook-resource-update](/docs/proposals/mobile/_master-plan_/details/323-hook-resource-update.md)
- [324-playback-target-kinds](/docs/proposals/mobile/_master-plan_/details/324-playback-target-kinds.md)
- [325-music-playback-intent](/docs/proposals/mobile/_master-plan_/details/325-music-playback-intent.md)
- [326-bounded-segment-playback](/docs/proposals/mobile/_master-plan_/details/326-bounded-segment-playback.md)

## Tasks

1. Ended/skip orchestrator: manual upcoming first, else auto-queue advance, else stop — parity with
   `NonLiveMediaOrchestrator` (`apps/web/src/components/MediaPlayer/Controller/`). Guard duplicate
   ended events.
2. All load decisions through `@podverse/playback-core` `resolvePlaybackLoadDecision`.
3. RN `useMediaPlayerResourceUpdate` equivalent: apply decision via native bridge (`loadAndStart`
   or `load`+`play`), start position, rate, pauseAt.
4. Explicit paths for every `PlaybackTarget.kind` (audio-first; video/livestream: audio or safe
   notice until PG-5).
5. Music `MusicItemPlaybackIntent` discriminator for stats side effects.
6. Replace `useClipPlaybackStub` / home play stubs with bounded clip/soundbite/chapter play +
   real episode play.
7. Mark **10.12–10.17** / **321–326** `done`.

## Acceptance

- Home/Episode play starts audio via engine; stubs removed for those paths
- Clip bounded play pauses at end
- Queue advance on ended uses playback-core + orchestrator order
- Unit-testable pure decision paths where practical (no native in Vitest)

Do not run tests during agent work.
