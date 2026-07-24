# PG-5 video — post-implementation gap remediation

Created after reviewing the full working-tree diff for the PG-5 "seamless video" work
(`feature/mobile-app-init-7`, details 093–112). All PG-5 code is uncommitted; the master-plan
steps 2.14–2.33 are marked `done`, but this review found gaps between what the acceptance criteria
claim and what actually ships.

## Scope of the review

Reviewed: native surface hosts (`PodverseVideoSurfaceHost.swift` / `.kt`), engine video-capability
detection (`PodverseAudioEngine.*`), the Expo module bridge (`attachVideoSurface` /
`animateVideoSurface` / `setVideoSurfaceVisible`), the JS adapter + serialization, the RN target hook
(`useVideoSurfaceTarget.ts`), player integration (`MiniPlayer.tsx`, `FullPlayerScreen.tsx`,
`PlaybackProvider.tsx`, `navigation/index.tsx`), enclosure resolution, the new Vitest suites, and the
audio/video E2E flows + seed fixtures.

## What is correct (no action needed)

- Serialization arg order matches native positional signatures on both platforms; validation covers
  malformed rects/urls (unit-tested).
- Android converts `measureInWindow` dp → px via `displayMetrics.density`; iOS uses points directly.
- Video-capability detection is wired: iOS `emitVideoCapability()` on `.readyToPlay` + teardown;
  Android `onVideoSizeChanged` + reset-to-false on stop/load.
- Visibility gate (`desiredVisible && currentItemHasVideo && activeTarget != nil`) is correct, and
  `PlaybackProvider` drives `setVideoSurfaceVisible(activeTarget?.kind === 'item-video')`.
- Enclosure resolver falls through to the single `video/mp4` enclosure for the seeded video item, so
  playback starts and `onVideoSizeChanged` can fire.
- `registerTarget` self-heals the animate/onLayout ordering race (re-applies frame when
  `target === activeTarget`).

## Serious gaps found

1. **Surface occlusion by the modal full player + no true reparent (HIGH).** The single native
   surface is attached to the **key window** (iOS) / **`android.R.id.content`** (Android) and only
   *reframed* to the measured RN rect. But `FullPlayerScreen` is a React Navigation
   `presentation: 'modal'` screen (`navigation/index.tsx`), presented **above** the window overlay.
   On expand, the full-player video region will show the opaque modal (and the artwork `<Image>`
   fallback rendered inside the placeholder) instead of live frames. This contradicts detail 099's
   acceptance ("expanding/collapsing changes only surface geometry/parenting; playhead continuous
   across reparent"). The mini player (in the base view controller) is unaffected. → **Plan 01.**

2. **New mobile Vitest tests are in no CI or documented verification gate (MEDIUM).** `apps/mobile`
   is a standalone install excluded from root `npm run test:unit`; `ci.yml` skips unit tests and its
   operator checklist + `apps/mobile/e2e/HOW-TO-RUN.md` never mention `npm --prefix apps/mobile run
   test`. The serialization + error-taxonomy suites can silently rot. → **Plan 02.**

## Supporting gap (folded into Plan 01)

- The `video-transition.yaml` / `engine-audio-spike.yaml` flows only assert RN placeholder testIDs
  and screenshot; they **cannot** detect occlusion (gap 1) or prove real frames rendered. Treat them
  as structural checks and add an explicit **manual on-device** frame/occlusion verification step.

## Out of scope

- No changes to the audio engine transport, serialization, or seed data (all verified correct).
- Not re-opening PG-5 master steps; these are follow-up remediation plans.

## Outputs

- `01-video-surface-reparent.md` — fix/verify native surface z-order vs the modal full player.
- `02-mobile-unit-test-ci-gate.md` — wire mobile Vitest into a real gate + docs.
