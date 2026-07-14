# Plan 03 — Android ExoPlayer, MediaLibraryService, MediaSession

**Steps:** 2.7, 2.8, 2.9
**Model:** Opus 4.8

## Detail references

- [086-android-exoplayer-audio](/docs/proposals/mobile/_master-plan_/details/086-android-exoplayer-audio.md)
- [087-android-foreground-media-service](/docs/proposals/mobile/_master-plan_/details/087-android-foreground-media-service.md)
- [088-android-media-session-controls](/docs/proposals/mobile/_master-plan_/details/088-android-media-session-controls.md)
- [00-CAR-FOUNDATION.md](./00-CAR-FOUNDATION.md)

## Tasks

1. Implement single Media3 ExoPlayer audio path in the module.
2. Add foreground **`MediaLibraryService`** (stub/empty browse OK) for background survival and
   future Android Auto (12.11–12.13). Do not use a throwaway non-library media service.
3. Wire one MediaSession metadata/controls to the same ExoPlayer.
4. Use Track 3 foreground service permission placeholders.

## On completion

Mark steps **2.7, 2.8, 2.9** as `done`. Operator verifies with
`npm run mobile:android -- --device Pixel_6_Pro_API_33`.
