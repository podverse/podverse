# 759-queue-reorder-long-press-drag

**Master step:** P2.1.5
**Model (author + implement):** Opus 5
**Status:** done

## Scope

Whole-row long-press drag to reorder the queue, and the server position math behind the drop. The
operator chose long-press drag over the existing handle-scoped drag and over move-up / move-down menu
items, so the row carries three gestures at once and the arbitration between them is the real work.

### Relationship to the DnD deferral

[599-defer-pixel-dnd-polish](599-defer-pixel-dnd-polish.md) stops agents at "functional reorder (up
or down, or basic drag)". Long-press drag of the whole row goes past that line, so this detail
**reopens the functional half** of 599 for the queue screen at the operator's request. What stays
deferred: haptics, spring animation, custom drag chrome, and lift shadows.

### Gesture arbitration

`ReorderableSections` attaches `Gesture.Pan().activeOffsetY([-8, 8])` to `ReorderHandle` inside a
`GestureDetector`. Two changes:

1. The vertical pan can also be driven from the row body, gated by `activateAfterLongPress` so a
   quick tap still reaches the row's play-and-remove press.
2. That pan must lose to `SwipeActionRow`'s horizontal `Swipeable` pan and win over the row press
   once the long press has fired.

Compose them explicitly rather than relying on whichever recognizer happens to claim the touch
first. The failure modes to test on device are a tap that starts a drag, a swipe that starts a drag,
and a drag that fires the row press on release.

Extend `ReorderableSections` behind a prop so the Tab bar settings screen and playlist detail keep
handle-only drag — do not fork a second reorder engine
([`mobile-reusable-components`](/.cursor/skills/mobile-reusable-components/SKILL.md)).

The row keeps `accessibilityRole="adjustable"` with Move up / Move down actions
(`misc.move_up` / `misc.move_down`), because a drag gesture is unusable with a
screen reader ([`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc)).
Those actions are the accessible path to the same reorder, not a second feature.

### Drop position math

Web resolves a drop index into one of three calls. Mirror it exactly — this is the part most likely
to be reinvented incorrectly:

| Drop index       | Call                                                 |
| ---------------- | ---------------------------------------------------- |
| `0`              | `addNext`                                            |
| `length - 1`     | `addLast`                                            |
| anything between | `addBetween(prev.list_position, next.list_position)` |

Positions come from the **reordered** list's neighbors, not the original indices. Dispatch on the
moved resource's type (item, clip, soundbite, add-by-RSS) using the repository methods added in
[758](758-queue-play-and-remove.md). Apply the returned `list_position` to the moved row, then
reconcile with `useQueueResourcesLoadActive`.

Put the index-to-call resolution in a pure function with unit tests — first, last, middle,
single-item list, and a no-op drop where `fromIndex === toIndex` — so the arithmetic is verifiable
without a device.

### Failure handling

A failed reorder reloads from the server rather than leaving the optimistic order in place, so the
list never disagrees with the queue that playback will actually follow. Membership rejections route
through `useMembershipGate().handleGateError`, the same as web's `tryHandleMembershipGateError`.

## Acceptance criteria

- Long-pressing a row lifts it; dragging reorders; releasing persists via the right call for the
  drop position.
- A short tap still plays and removes; a horizontal swipe still reveals Remove. No gesture triggers
  another.
- Move up / Move down remain available as accessibility actions on every row.
- The drop resolver is a tested pure function covering first, last, middle, single, and no-op.
- A failed reorder reloads from the server; a membership rejection opens the gate.
- Tab bar settings and playlist detail reorder behavior is unchanged.

## Web parity references

- [`ListQueueResources`](apps/web/src/components/List/Queues/ListQueueResources.tsx) — `handleDragEnd`
  position math, per-type dispatch, and `queueResourcesLoadActive` reconcile

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- queue-screen
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
