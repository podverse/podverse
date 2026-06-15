# 01 — Restore the progress bar (video controls overlay)

## Root cause

In `apps/web/src/styles/components/embed/EmbedVideoControlsOverlay.module.scss`, `.overlayBottom` uses `justify-content: center` and `.controlsRow` has no width, so the inner `.controls` (`width: 100%`) shrink-wraps and `.progressRow` (`flex: 1 1 auto; min-width: 0`) collapses to zero width. The audio embed is unaffected because its surface is full width. This is why the scrubber disappeared in video mode (episode/chapter video screenshots show time + mute + more + play but no progress bar).

## Tasks

1. In `apps/web/src/styles/components/embed/EmbedVideoControlsOverlay.module.scss`, give `.controlsRow` `flex: 1 1 auto; width: 100%; min-width: 0;` so the controls span the strip (the `justify-content: center` on `.overlayBottom` then has nothing to compress).
2. In `apps/web/src/styles/components/embed/EmbedPlayerControls.module.scss`, add a small floor to `.progressRow` (e.g. `min-width: 3rem`) so the scrubber never fully collapses on narrow iframes.

## Notes

- The scrubber itself is the shared `MediaPlayerProgress` (`layoutVariant="embed"`) rendered by `EmbedPlayerControls`; no component is missing — this is purely a flex-layout collapse.
- In video mode the controls overlay still auto-hides during playback by design (`useEmbedVideoOverlayVisibility`) and reappears on hover/focus. That behavior stays.

## Verification

```bash
make e2e_test_web_report_spec SPEC=e2e/embed-video-player.spec.ts
```
