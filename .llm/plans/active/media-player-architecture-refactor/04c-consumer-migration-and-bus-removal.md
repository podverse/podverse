# Phase 4c — UI consumer migration; remove the `MEDIA_PLAYER` event group

## Goal

Migrate every UI consumer that fires or listens to
`EVENTS.MEDIA_PLAYER.*` window events onto the typed
`useMediaPlayerControls()` hook from 4a, then delete the
`MEDIA_PLAYER` group from
[`apps/web/src/constants/events.ts`](../../../../apps/web/src/constants/events.ts).

After this phase, no code in the app dispatches or listens for window
events to control the media player. Every interaction with the player
flows through the typed bridge.

## Scope (15 consumer files identified)

```
apps/web/src/components/MediaPlayer/Buttons/IncrementBackButton.tsx
apps/web/src/components/MediaPlayer/Buttons/IncrementForwardButton.tsx
apps/web/src/components/MediaPlayer/Buttons/JumpBackButton.tsx
apps/web/src/components/MediaPlayer/Buttons/JumpBackButtonMobile.tsx
apps/web/src/components/MediaPlayer/Buttons/JumpForwardButton.tsx
apps/web/src/components/MediaPlayer/Buttons/JumpForwardButtonMobile.tsx
apps/web/src/components/MediaPlayer/Buttons/TrackPreviousButton.tsx        (8 dispatches)
apps/web/src/components/MediaPlayer/Buttons/TrackPreviousButtonMobile.tsx  (8 dispatches)
apps/web/src/components/MediaPlayer/Sliders/MediaPlayerProgress.tsx
apps/web/src/components/MediaPlayer/Controller/mediaPlayerWindowKeyDown.ts
apps/web/src/components/MediaPlayer/Controller/mediaPlayerWindowKeyDown.test.ts
apps/web/src/components/Clip/ClipForm.tsx                                   (3 dispatches)
apps/web/src/components/ItemTranscript/ItemTranscript.tsx
apps/web/src/app/add-by-rss/episode/AddByRSSEpisodePageClient.tsx
apps/web/src/constants/events.ts                                            (delete MEDIA_PLAYER group)
```

Plus the single listener site that 4a already migrated to the bridge:

```
apps/web/src/hooks/useMediaElementBridge.ts  (no longer listens to window events)
```

(The legacy `MediaPlayerControllerAV.tsx` listener block was deleted
in 4b along with the file.)

## Migration order (one commit per logical group)

The migration is grouped so each commit is self-consistent and easy to
revert. Keyboard handler is **last** because it is the most cross-
cutting consumer.

### Commit 1: Increment / Jump buttons

Files:

- `IncrementBackButton.tsx` (5s back)
- `IncrementForwardButton.tsx` (15s forward; uses `JUMP_FORWARD`)
- `JumpBackButton.tsx`
- `JumpBackButtonMobile.tsx`
- `JumpForwardButton.tsx`
- `JumpForwardButtonMobile.tsx`

Pattern (before):

```typescript
window.dispatchEvent(
  new CustomEvent(EVENTS.MEDIA_PLAYER.JUMP_BACK, {
    detail: { time: 10 },
  }),
);
```

Pattern (after):

```typescript
const { jumpBy } = useMediaPlayerControls();
jumpBy(-10);
```

The mobile and non-mobile variants share the same pattern. Each
button's `onClick` becomes a one-liner.

### Commit 2: Progress slider

File: `MediaPlayerProgress.tsx`

Pattern (before):

```typescript
window.dispatchEvent(
  new CustomEvent(EVENTS.MEDIA_PLAYER.SEEK, { detail: { time: newTime } }),
);
```

Pattern (after):

```typescript
const { seek } = useMediaPlayerControls();
seek(newTime);
```

The slider's drag-end callback calls `seek`. The drag-in-progress
callback continues to update local state for visual feedback only —
the bridge isn't called until release.

### Commit 3: Transcript click-to-seek

File: `ItemTranscript.tsx`

Single dispatch site. Becomes a `seek(timestamp)` call.

### Commit 4: Clip form

File: `ClipForm.tsx` (3 dispatches: `SEEK` × 2, `PAUSE_AT` × 1).

The `SEEK` dispatches map to `seek(time)`. The `PAUSE_AT` dispatch
maps to `pauseAt(time)` on the bridge.

Note: the policy in 3a is the **primary** producer of `pauseAt` (it
arms it inside `loadAndStart` when `decision.pauseAtSeconds` is set).
The clip form uses it independently when the user adjusts the clip's
end time while it is already playing — a different code path that the
policy does not cover. The bridge's `pauseAt` is reusable for both.

### Commit 5: Add-by-RSS episode page

File: `AddByRSSEpisodePageClient.tsx`

Single `SEEK` dispatch (from a "play from time X" link in the
episode's notes). Becomes `seek(time)`.

### Commit 6: Track-previous buttons

Files:

- `TrackPreviousButton.tsx` (8 dispatches)
- `TrackPreviousButtonMobile.tsx` (8 dispatches)

These have the most dispatches because the "previous" semantics differ
based on current playhead and queue state:

- If currentTime > 3s, seek to 0 (restart current item).
- Else, navigate to the previous queue resource and start it.

Every dispatch is `SEEK { time: 0 }`. They become `seek(0)`. The 8
sites collapse into one helper:

```typescript
function restartCurrentItem(controls: MediaElementBridge) {
  controls.seek(0);
}
```

Live in
`apps/web/src/components/MediaPlayer/Buttons/buildTrackPreviousAction.ts`
and shared by both buttons.

### Commit 7: Keyboard handler

Files:

- `mediaPlayerWindowKeyDown.ts`
- `mediaPlayerWindowKeyDown.test.ts`

The keyboard handler currently dispatches `SEEK` for `ArrowLeft` /
`ArrowRight` / number keys. It needs access to the bridge.

Two options:

- **A. Make the handler a hook.** Replace the imperative
  `mediaPlayerWindowKeyDown` function with a
  `useMediaPlayerKeyboardShortcuts()` hook that calls
  `useMediaPlayerControls()` and binds a window keydown listener via
  `useEffect`. Mounted once near the root of the player tree.
- **B. Keep the imperative function, accept controls as an argument.**
  The window keydown listener at the call site reads controls from a
  ref that the controls provider populates. This preserves the
  current call-site shape.

**Choose A.** Hook form is more idiomatic, the controls dependency is
a real React dependency, and the test rewrite (below) is mechanical.

`mediaPlayerWindowKeyDown.ts` becomes
`useMediaPlayerKeyboardShortcuts.ts`. The exported function signature
changes from `(event: KeyboardEvent) => void` to
`(): void` (it's a hook).

`mediaPlayerWindowKeyDown.test.ts` is rewritten as
`useMediaPlayerKeyboardShortcuts.test.tsx`:

- Renders the hook inside a `<MediaPlayerControlsProvider>` with a
  fake bridge.
- Synthesizes keyboard events on `document`.
- Asserts the fake bridge methods were called with expected args.

(The original test had its own `EVENTS.MEDIA_PLAYER.SEEK` listener as
the assertion mechanism — that listener is removed.)

### Commit 8: Delete the event group

File: `apps/web/src/constants/events.ts`

Remove the `MEDIA_PLAYER` key from the exported `EVENTS` object. The
adjacent groups (e.g. `AUTH`, `MODAL`) stay.

Run final ripgrep to confirm zero references:

```bash
rg "EVENTS\.MEDIA_PLAYER|MEDIA_PLAYER\.SEEK|MEDIA_PLAYER\.JUMP|MEDIA_PLAYER\.PAUSE_AT" apps/web
```

Should return zero hits. CI lint will fail otherwise (TypeScript will
flag the missing property).

## Verification per commit

After each commit on the refactor branch:

```bash
npm run lint -w apps/web
npm run test:unit -w apps/web
```

Spec-scoped E2E for the consumer touched:

- Commits 1–2 → `make e2e_test_web_report_spec SPEC=e2e/media-player-keyboard.spec.ts`
  (or whichever spec covers jump/seek; Phase 1 added the necessary
  spec).
- Commit 3 → transcript spec.
- Commit 4 → clip-form spec.
- Commit 5 → add-by-RSS episode spec.
- Commit 6 → track-previous spec.
- Commit 7 → keyboard-shortcuts spec.

After commit 8 (the deletion), run the full Phase 1 suite:

```bash
make e2e_test_web_report
```

## Out of scope

- Final controller slim-down + ESLint guards (Phase 5).
- Renaming any consumer file (cosmetic; do in Phase 5 if desired).

## Exit criteria

- `EVENTS.MEDIA_PLAYER` is not exported from
  `apps/web/src/constants/events.ts`.
- No `apps/web/src/**` file references the removed event names.
- The keyboard handler is a hook, not a window-event-bound imperative
  function.
- The track-previous helper exists and both `TrackPreviousButton`
  variants call it.
- The Phase 1 baseline E2E suite passes — every player-control
  interaction works.

## Verification commands

```bash
npm run lint -w apps/web
npm run test:unit -w apps/web
make e2e_test_web_report
```
