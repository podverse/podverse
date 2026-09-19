# 753-clip-authoring-playback-hold

**Master step:** P2.1.4
**Model (author + implement):** Opus 5
**Status:** done

## Scope

The playback behavior clip authoring depends on: the item being clipped must still be the item being
clipped when the user finishes. Two mechanisms, both owned here — the **hold** that stops the queue
from advancing, and the **preview window** the time cards play through.

### The hold

While Make Clip is open, reaching the end of the media pauses and keeps the now-playing item. No
`moveNowPlayingToHistory`, no manual-queue step, no auto-queue seed. A user who sets a start time at
2:40:00 of a three-hour episode and then goes looking for the end must not come back to the next
episode in the queue and a clip form pointing at nothing.

The decision lives in [resolveQueueAdvance.ts](/packages/playback-core/src/resolveQueueAdvance.ts) as
a new `holdNowPlaying` input returning `{ kind: 'hold' }`, checked before the manual queue and
auto-queue branches:

```typescript
if (input.holdNowPlaying) {
  return { kind: 'hold' };
}
```

Policy goes in the package, not in the provider, for the same reason the rest of the queue policy is
there: it is a rule about what should happen, it is worth a unit test, and web will need it when its
clip editor stops advancing. Enforcement is in `PlaybackProvider.advance()`, which returns after
pausing when the hold is on, so both the native `ended` event and `completeNowPlaying()` route through
one check.

The screen begins the hold on mount and ends it on unmount. That is the shape of the previous
generation's `setRepeatMode(RepeatMode.Track)` / `RepeatMode.Off` pair, without the side effect:
repeat-one **restarts** the episode at the end of the file, which moves the playhead the user was
aiming at. Holding pauses instead, so the position they left is the position they return to.

**Web is not changed here.** Its clip edit page sets `autoQueueConfig.disabled: true` and nothing
reads it, so web's editor can still advance. That is a real gap, recorded rather than fixed, because
web's advance path is `useQueueResourcesLoadActive` rather than the shared resolver, and rewiring it
belongs with the media-player architecture work
([`cross-surface-change-impact`](/.cursor/rules/cross-surface-change-impact.mdc)).

### The preview window

Two previews, both a seek plus a boundary:

| Preview    | Seeks to                              | Pauses at   |
| ---------- | ------------------------------------- | ----------- |
| Start time | the start second                      | end, if set |
| End time   | `end - CLIP_END_PREVIEW_LEAD_SECONDS` | end         |

The end preview plays the **approach** to the boundary, not the boundary itself — hearing three
seconds of run-up is how you tell whether a clip ends on a sentence or through one. Three seconds is
what the previous generation used and what web's `ClipForm` hardcodes today; it becomes
`CLIP_END_PREVIEW_LEAD_SECONDS` in `@podverse/helpers` so both surfaces move together.

`PlaybackProvider` grows a `previewWindow({ fromSeconds, pauseAtSeconds })` that seeks and arms the
existing `pauseAtRef` boundary, which already pauses on the progress tick. The previous generation
polled with a 500ms `setInterval` per preview; nextgen already has the boundary mechanism that clip
playback uses, so the preview is the same mechanism with different numbers rather than a timer that
can outlive the screen.

### Loading paused

Editing a clip from a list has to load that clip's episode without playing it. `playTarget` already
accepts `autoPlayOverride`, used by cold-start restore, but nothing public exposes it. A session
method loads an item paused at a given second so the edit entry can prepare the player without
starting audio in the user's ear.

## Acceptance criteria

- `resolveQueueAdvance` returns `hold` whenever `holdNowPlaying` is true, regardless of manual queue
  depth or auto-queue availability, with unit tests covering the precedence.
- With Make Clip open, reaching the end of the media pauses, leaves the item as now playing, writes
  no history row, and starts nothing else.
- Closing Make Clip restores normal advance behavior, including for an item that already ended while
  the hold was on.
- The hold does not suppress user-initiated skips — next and previous still work while authoring.
- Start preview seeks to the start time and plays; with an end time set it pauses there.
- End preview seeks three seconds before the end time and pauses at the end time.
- Leaving the screen mid-preview disarms the boundary; no preview keeps pausing playback afterwards.
- A clip opened for editing from a list loads its episode paused at the clip start, with no audio.

## Web parity references

- Clip boundary on load: `packages/playback-core/src/resolvePlaybackLoadDecision.ts` (`pauseAtSeconds`
  at `end_time + 1`)
- Web preview buttons and the hardcoded three-second lead: `apps/web/src/components/Clip/ClipForm.tsx`
- Web's unread auto-queue intent: `apps/web/src/app/clip/edit/[clip_id]/ClipEditPageContext.tsx`

## Verification

```bash
npm run test -w @podverse/playback-core
npm run mobile:e2e:test -- make-clip
```
