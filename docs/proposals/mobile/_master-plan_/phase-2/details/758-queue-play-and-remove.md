# 758-queue-play-and-remove

**Master step:** P2.1.5
**Model (author + implement):** Opus 5
**Status:** done

## Scope

The two mutations the queue screen exists for. Today both are placeholders: `handleQueueUiAction`
only sets a notice string, and the row's `onPress` is `() => {}`.

### Repository first

`queueRepository` can add and mark played but cannot delete, and has no add-between. Screens must not
call `req*` directly ([`mobile-react-native`](/.cursor/rules/mobile-react-native.mdc)), so the
methods land in the repository before any UI uses them:

| Repository method                                            | API                                               |
| ------------------------------------------------------------ | ------------------------------------------------- |
| `removeItem` / `removeClip` / `removeSoundbite`              | `reqQueueResource{Item,Clip,ItemSoundbite}Delete` |
| `removeAddByRss`                                             | `reqQueueResourceItemAddByRSSDelete`              |
| `addItemBetween` and the clip / soundbite / add-by-RSS peers | `reqQueueResource*AddBetween`                     |
| `addSoundbiteNext` / `addSoundbiteLast`                      | `reqQueueResourceItemSoundbite{AddNext,AddLast}`  |
| `addAddByRssNext` / `addAddByRssLast`                        | `reqQueueResourceItemAddByRSS{AddNext,AddLast}`   |

Every mutation projects the native cache the way the existing add methods do — CarPlay and Android
Auto read that cache with the app closed
([`mobile-carplay-android-auto`](/.cursor/rules/mobile-carplay-android-auto.mdc)).

### Tap plays and removes

Tapping a row plays the resource and takes it out of the queue, matching web's
`createPlayAndRemoveHandler`. The whole row is the control; there is no separate play button and no
navigation to detail from this screen.

Sequence, in this order:

1. Splice the row out of the in-memory list so the list repaints on the press, before any await
   ([`mobile-progress-ux-and-notification-channels`](/.cursor/rules/mobile-progress-ux-and-notification-channels.mdc)).
2. Load the resource into the player with the existing playback path, clearing auto-queue the way web
   does (`autoQueueShouldClear`) so the played item does not re-enter from the auto-queue.
3. Reconcile with `useQueueResourcesLoadActive` afterwards.

Resolve the playback target from the resource's own shape — item, clip, soundbite, or add-by-RSS —
reusing the loaders those paths already have rather than adding a fifth
([`reuse-beyond-components`](/.cursor/rules/reuse-beyond-components.mdc)).

**Playing a queued item is a zone move, not a removal**, so it emits no removal tombstone; a
deliberate delete does ([`playback-meaningful-events`](/.cursor/rules/playback-meaningful-events.mdc)).
Getting this backwards makes a played item reappear on the next device sync.

### Remove is swipe-only

`SwipeActionRow` with `removeLabel` from `features.queue.remove_from_queue`, `testID`
`queue-row-${queueResourceId}-swipe` (revealed control becomes `…-swipe-remove`). No persistent
inline remove button and no More-menu remove row — the swipe is the affordance, matching Downloads
and the Home unsubscribed rows.

`SwipeActionRow` already exposes the same action through `accessibilityActions`, so screen reader
users are not swipe-only ([`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc)).

### Failure handling

Optimistic removal rolls back on failure and surfaces `features.queue.remove_error` — a silently
swallowed rejection is indistinguishable from a missed tap
([`mobile-surface-async-errors`](/.cursor/rules/mobile-surface-async-errors.mdc)). Membership
rejections go through `useMembershipGate().handleGateError` rather than the generic error
([`generic-login-required-copy`](/.cursor/rules/generic-login-required-copy.mdc)).

## Acceptance criteria

- Tapping any row plays it, removes it from the list immediately, and clears auto-queue.
- Clip, soundbite, and add-by-RSS rows all play from the queue, not only plain items.
- Swipe-left reveals Remove; the same action is reachable via `accessibilityActions`.
- A failed remove restores the row and shows the error; a membership rejection opens the gate.
- Playing a queued item emits no removal tombstone; the swipe delete does.
- No `req*` call from the screen; all mutations go through `queueRepository`.

## Web parity references

- [`ListQueueResources`](apps/web/src/components/List/Queues/ListQueueResources.tsx) —
  `createPlayAndRemoveHandler`, optimistic splice, `autoQueueShouldClear`
- [`ListQueueResourceRow`](apps/web/src/components/List/Queues/ListQueueResourceRow.tsx) —
  `reqQueueResource*Delete` per resource type

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- queue-screen
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
