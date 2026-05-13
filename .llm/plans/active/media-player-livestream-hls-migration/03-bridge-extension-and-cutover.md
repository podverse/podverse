# Phase 3 — Bridge extension and cutover (placeholder)

## Expand later

High-level intent (details belong in sub-plans):

- Extend `MediaElementSource` / `useMediaElementBridge` with an HLS
  path (native vs `hls.js`).
- Teach `<MediaElement>` + `mediaElementSourceFromTarget` the
  `livestream` case; delete `LegacyLiveStreamControllerSelector`.
- Remove `apps/web/src/components/MediaPlayer/Controller/LiveStream/`
  and `MediaPlayerControllerLiveStreamAV.tsx`.
- `apps/web/package.json`: remove `video.js`, add `hls.js`; run
  `make sync_lockfile` and Linux-canonical lockfile policy per
  monorepo `AGENTS.md`.

## Exit (when expanded)

Single element path for live + non-live; `video.js` gone; E2E
livestream suite passes.

## Verification (placeholder)

```bash
npm run lint -w apps/web
npm run test:unit
make e2e_test_web_report
```
