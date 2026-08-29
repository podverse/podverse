# 04 — loadAndStart, file://, error mapping (2.25–2.27)

**Cursor model:** Opus 4.8  
**Details:** [104](../../../../docs/proposals/mobile/_master-plan_/phase-1/details/104-bridge-load-and-start.md),
[105](../../../../docs/proposals/mobile/_master-plan_/phase-1/details/105-engine-local-file-playback.md),
[106](../../../../docs/proposals/mobile/_master-plan_/phase-1/details/106-playback-error-mapping.md)

## Goal

Add `loadAndStart`, first-class `file://` playback on the shared engine, and a documented error
taxonomy mapped toward `@podverse/helpers` shapes.

## Implement

1. Native + JS `loadAndStart({ url, initialSeekSeconds? })`; migrate primary play path where
   appropriate (`useMediaPlayerResourceUpdate`).
2. Prove/document local file playback iOS + Android; handle missing file errors.
3. Pure TS error mapper + wire JS adapter `error` events through it; document codes in README.

## Do not

- Build Track 13 download UI/jobs.
- Skip keeping separate `load`/`play` for prepare-without-play.

## Done when

- Steps 2.25–2.27 `done`.

## Verification (operator)

```bash
npm run mobile:e2e:test -- play-mini-player
```
