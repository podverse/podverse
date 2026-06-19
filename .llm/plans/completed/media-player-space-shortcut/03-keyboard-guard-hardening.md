# Space shortcut — keyboard guard hardening (optional)

## Scope

- Exclude `[role="slider"]` and `[role="dialog"]` from Space play/pause toggle.
- Stop arrow-key propagation from volume slider so global ±10s seek does not double-fire.
- Optionally skip global arrow seek when `mpItem?.live_item` is truthy.
- Unit tests for new guards.

**Optional plan.** Execute after plans 01 and 02 unless you want slider/dialog polish in the
same release.

## Why this step exists

- [`MediaPlayerProgress.tsx`](/apps/web/src/components/MediaPlayer/Sliders/MediaPlayerProgress.tsx)
  and [`VolumeSlider.tsx`](/apps/web/src/components/MediaPlayer/Sliders/VolumeSlider.tsx) are
  focusable `role="slider"` elements but are not excluded from Space — Space toggles play
  when a slider is focused.
- `VolumeSlider` handles ArrowLeft/Right locally but the window handler still seeks ±10s
  (conflicts with Settings volume shortcut copy).
- Open modals: Space can toggle playback behind a dialog if focus is on non-button content.
- Livestream: global arrow seek mutates UI `mpCurrentTime` though live position is
  meaningless (decision matrix § livestream).

## Steps

### 1. Extend Space guards

File: [`mediaPlayerWindowKeyDown.ts`](/apps/web/src/components/MediaPlayer/Controller/mediaPlayerWindowKeyDown.ts)

After existing menu-role check, before source-loaded check (or grouped with other Space-only
guards), add:

```typescript
if (target.closest('[role="slider"], [role="dialog"]')) {
  return;
}
```

Consider also `target.closest('[contenteditable]')` without requiring `="true"` — align with
input guard at top of function for consistency.

### 2. Unit tests

File: [`mediaPlayerWindowKeyDown.test.ts`](/apps/web/src/components/MediaPlayer/Controller/mediaPlayerWindowKeyDown.test.ts)

Add cases:

- Space on element with `role="slider"` — `togglePlayPause` not called.
- Space inside `[role="dialog"]` on a non-button div — not called.
- Space on `body` with loaded channel — still called (regression).

### 3. Volume slider arrow propagation

File: [`VolumeSlider.tsx`](/apps/web/src/components/MediaPlayer/Sliders/VolumeSlider.tsx)

In `handleKeyDown`, after handling ArrowLeft/Right, call `e.stopPropagation()` so the
window listener in `MediaPlayerController` does not also seek.

### 4. Optional — skip arrow seek for livestream

File: [`mediaPlayerWindowKeyDown.ts`](/apps/web/src/components/MediaPlayer/Controller/mediaPlayerWindowKeyDown.ts)
and/or [`MediaPlayerController.tsx`](/apps/web/src/components/MediaPlayer/Controller/MediaPlayerController.tsx)

Pass `mpItem` (or `isLiveItem: boolean`) into `MediaPlayerKeyDownState`. Early-return
ArrowLeft/ArrowRight when live item is active.

Add unit tests for arrow keys with live item set.

### 5. E2E (minimal)

If feasible without flaky focus:

- Tab to volume slider → ArrowLeft changes volume without large seek jump (may require harness
  or snapshot of `mpCurrentTime` display).

Otherwise document manual check in plan completion notes.

## Files touched (expected)

- `apps/web/src/components/MediaPlayer/Controller/mediaPlayerWindowKeyDown.ts`
- `apps/web/src/components/MediaPlayer/Controller/mediaPlayerWindowKeyDown.test.ts`
- `apps/web/src/components/MediaPlayer/Sliders/VolumeSlider.tsx`
- Optionally `MediaPlayerController.tsx` (live item in keydown state)

## Verification (operator)

```bash
npm run lint
npm run test:unit
make e2e_test_web_report_spec SPEC=e2e/media-player-keyboard-shortcuts.spec.ts
make e2e_test_web_report_spec SPEC=e2e/media-player-space-shortcut.spec.ts
```

## Behavior changes (intentional)

- Space on focused progress/volume slider no longer toggles play (more correct for a11y).
- Volume arrows no longer also seek the episode when slider is focused.
- Livestream arrow keys may become no-ops if step 4 is implemented.
