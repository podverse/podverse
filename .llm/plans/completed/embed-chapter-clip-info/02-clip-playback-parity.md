# 02 — Clip/soundbite playback parity (all embeds)

## Goal

Embed segment end matches main app: clear `mpClip`/`mpItemSoundbite`, pause at playhead; next play resumes full item; natural `ended` advances list.

## Tasks

1. In `NonLiveMediaOrchestrator.tsx` clip/soundbite timeupdate embed branches: use same logic as main app (`setMPClip(null)` / `setMPItemSoundbite(null)`, pause) instead of `finishEmbedPlayback()`.
2. Retire clip/soundbite rewind in `finishEmbedPlayback` / `resolveEmbedPlaybackResetSeconds` / `resolveEmbedPlaybackPauseAtSeconds` where no longer needed.
3. Update unit tests: `NonLiveMediaOrchestrator.*`, `resolveEmbedPlaybackResetSeconds.test.ts`.
4. Update/add embed E2E if clip end behavior is covered.

## Verification

```bash
npm run test -w apps/web -- src/components/MediaPlayer/Controller/__tests__/NonLiveMediaOrchestrator.seekPolicy.test.tsx src/lib/embed/__tests__/resolveEmbedPlaybackResetSeconds.test.ts
make e2e_test_web_report_spec SPEC=e2e/media-player-clip-soundbite-end-pause.spec.ts,e2e/embed-video-player.spec.ts
```
