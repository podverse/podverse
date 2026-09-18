# 757-queue-screen-list-and-row-parity

**Master step:** P2.1.5
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Rebuild [`LibraryQueueScreen`](apps/mobile/src/screens/library/LibraryQueueScreen.tsx) as one
virtualized list of queue resources, replacing the two-`SectionCard` sketch. Play, remove, and
reorder behavior are [758](758-queue-play-and-remove.md) and [759](759-queue-reorder-long-press-drag.md);
this detail is the list, its rows, and its states.

### One list, not two sections

Web renders a single list where now-playing is prepended only when the viewed queue is **not** the
active queue, then all upcoming resources. Mobile already has that composition in
[`useQueueResourcesLoadActive`](apps/mobile/src/hooks/useQueueResourcesLoadActive.ts), which calls
`combineQueueNowPlayingAndUpcoming` from `@podverse/playback-core` and writes the result to
`QueuesProvider`. The screen switches to that hook and drops its own `usePrimaryQueue` +
`useQueueResources` orchestration, the `features.queue.queue_next` second card, and the
`queue.id_text` debug line.

The mini player is the now-playing surface, so the combined list needs no separate pinned header.

### AV / Music selector

`OptionChipGroup` with two chips — `media.podcast.podcasts` and `media.music.music` — mirroring web's
`ButtonTabs` in `QueuesPageListHeader`. Two or three options means chips, not a pushed option list
([`mobile-settings-option-density`](/.cursor/rules/mobile-settings-option-density.mdc)). Selecting a
chip calls `useQueueResourcesLoadActive(medium_id)`; `getQueueForMedium` already resolves the right
server queue per medium.

Selection persists per the queue screen instance
([`filter-sort-persistence`](/.cursor/rules/filter-sort-persistence.mdc)).

### Row type parity

`queueResourceToHomeRow` returns `null` whenever `resource.item` is null, which silently drops every
clip, soundbite, and add-by-RSS resource — those carry their item at `resource.clip.item` /
`resource.item_soundbite.item`, or no item at all. Web dispatches on resource type instead
(`ListQueueResourceRow`). Extend the mapper to resolve the item through the resource's own shape and
keep returning `null` only when no title can be produced.

Add-by-RSS resources render from `add_by_rss_resource_data`, and a redacted resource
(`is_add_by_rss_redacted`) shows `features.add_by_rss.private_item_placeholder` with no artwork,
matching web.

### List mechanics

`FlatList` (via `FillList`) keyed on `queueResourceId`, not `ListSection` + `.map()`
([`mobile-list-virtualization`](/.cursor/rules/mobile-list-virtualization.mdc)). The list owns the
scroll; the chip row sits in `ListHeaderComponent`. Pull-to-refresh reloads the selected medium.

### States

| State                    | Presentation                                                         |
| ------------------------ | -------------------------------------------------------------------- |
| Loading                  | `AuthAwareLoadState` spinner; never an empty message while in flight |
| Signed out               | `showAuthRequired` — generic `authentication.login_required`         |
| Signed in, no membership | `useMembershipGate().openGate('needs_membership')` on gated action   |
| Empty queue              | `ListEmpty`; an empty queue is a real answer, not an error           |
| Load failed              | `ListError` with retry                                               |

Queue is a **membership-tier** feature
([`mobile-anonymous-vs-account-features`](/.cursor/rules/mobile-anonymous-vs-account-features.mdc)),
so the current auth-only check is not sufficient. A signed-in user with no network still sees their
queue from `queueRepository` — signed-in and online are different conditions.

## Acceptance criteria

- One `FlatList` of resources; no `queue_next` card, no `id_text` debug text, no in-body heading.
- AV / Music chips switch queues and the selection is remembered per instance.
- Clip, soundbite, and add-by-RSS resources render instead of being dropped; redacted add-by-RSS
  shows the placeholder.
- Loading, signed-out, empty, and error states are distinct, and empty never shows while loading.
- The screen reads through `queueRepository` (via the hook) and never calls `req*` directly.

## Web parity references

- [`QueuesPageContext`](apps/web/src/app/queues/QueuesPageContext.tsx) — now-playing + upcoming
  composition and the login branch
- [`QueuesPageListHeader`](apps/web/src/app/queues/QueuesPageListHeader.tsx) — AV / Music tabs
- [`ListQueueResourceRow`](apps/web/src/components/List/Queues/ListQueueResourceRow.tsx) — resource
  type dispatch and add-by-RSS redaction

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- queue-add
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
