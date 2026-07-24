# Plan 01 — Native video surface z-order vs the modal full player

**Severity:** HIGH. **Model:** Opus 4.8 (native + architecture; on-device verification required).

## Problem

The single native video surface is attached once to a process-global container and only re-framed to
the RN-measured rect:

- iOS: `PodverseVideoSurfaceHost.attachToKeyWindowIfNeeded()` adds `containerView` to the **key
  window** (`ios/PodverseVideoSurfaceHost.swift`).
- Android: `PodverseVideoSurfaceHost.attachToContent(activity)` adds the `SurfaceView` to
  **`android.R.id.content`** (`android/.../PodverseVideoSurfaceHost.kt`).

`FullPlayerScreen` is presented as a React Navigation **modal**:

```709:735:apps/mobile/src/navigation/index.tsx
<RootStack.Screen name={ROOT_STACK_ROUTES.FullPlayer} options={{ presentation: 'modal' }}>
```

A modal-presented screen renders in a layer **above** the window overlay / content view, with an
opaque background (`FullPlayerScreen` uses `themeStyles.screen.backgroundColor`). So when the user
expands to the full player:

- The mini surface worked because the mini player lives in the base view controller / content.
- The full surface is **occluded** by the modal. The user sees the artwork `<Image>` rendered inside
  the `full-player-video-surface` placeholder (graceful but wrong) — not live video frames.

This violates detail 099 acceptance ("expanding/collapsing changes only surface geometry/parenting;
playhead continuous across reparent") and defeats the seamless-video goal (Track 11.18 anti-pattern
is a *second* surface; here the single surface is simply hidden behind the modal).

## Goal

The one native surface renders in **both** the mini and full player, transitioning without reload,
regardless of the full player being a modal.

## Approach (pick during implementation; A preferred)

### Option A — true reparent onto the RN placeholder's native view (preferred)

Expose the video placeholder as a real native view (Expo `View` / `ViewManager`) so the single
`AVPlayerLayer` / `SurfaceView` is **moved into that view's hierarchy** on `animateVideoSurface`,
instead of reframing a window/content overlay. The placeholder already exists in both `MiniPlayer`
and `FullPlayerScreen`; convert it (or add a child) to a native host view whose `nativeTag` is passed
to `attachVideoSurface`. Reparent = `addSubview` / `addView` onto the target host, then match bounds.
Because the placeholder is inside the modal's own view tree, z-order is correct in both states.

- iOS: pass the placeholder's `reactTag`; resolve the `UIView` via the module's view registry and
  `addSubview(containerView)`; keep the single `AVPlayerLayer`.
- Android: resolve the target `ViewGroup` by tag and `addView(surfaceView)`; keep the single
  `SurfaceView` (watch for `SurfaceView` re-attach flicker — consider `TextureView` if flicker is
  unacceptable during reparent).

### Option B — present the surface above the modal (fallback if A is too invasive now)

Keep the overlay approach but attach it to the layer that sits **above** the presented modal:

- iOS: add `containerView` to the **presented** view controller's window/topmost window
  (`UIApplication` topmost presented VC's view), re-attaching when the modal presents/dismisses.
- Android: host the surface in a view added to the modal fragment's container (or a `Dialog`/window
  with a higher z-order), re-attaching on modal show/hide.

Option B keeps the reframe model but must re-target the container on every present/dismiss — more
fragile than A. Only choose B if A cannot land in this pass; if B is chosen, document the follow-up
to migrate to A.

## Steps

1. Confirm the failure on device/simulator+emulator first (expand full player during video playback;
   observe artwork instead of frames). Capture before screenshots.
2. Implement Option A (or B) on **both** platforms. Do not create a second player/surface; only move
   the existing one. Preserve `currentItemHasVideo` gating and `setVideoSurfaceVisible`.
3. Keep the mini↔full animate contract (`animateVideoSurface('full'|'mini', durationMs)`), the
   `registerTarget` self-heal, and the audio-only hide policy (2.23) intact.
4. Update `apps/mobile/modules/podverse-media-engine/README.md` § "Player UI single-surface
   ownership" to describe the real reparent (not window/content reframe).
5. Add an addendum note to
   `docs/proposals/mobile/_master-plan_/details/099-surface-reparent-implementation.md` recording
   that the initial landing used a window/content overlay (occluded by the modal) and this pass
   implements the true reparent. Do not change its `Status`.

## Verification (MUST be on device — Maestro cannot see occlusion)

- Manual: play the seeded video item (E2E button or a real video feed), expand to full player, and
  confirm **live frames** render in the full player (not static artwork); collapse and confirm frames
  continue in the mini player with no reload / playhead jump. Test both iOS simulator and Android
  emulator, plus at least one physical device.
- Re-run the structural E2E after the change (still only asserts placeholders):

```bash
npm run mobile:e2e:test -- video-transition
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

- Add a line to `apps/mobile/e2e/HOW-TO-RUN.md` stating the video-transition flow is **structural
  only** and true frame/occlusion rendering must be verified manually on-device.
