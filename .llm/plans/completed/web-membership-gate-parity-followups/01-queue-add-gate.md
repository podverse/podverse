# 01 — Gate "Add to Queue" (member-only) on web

## Problem

Every "Add to Queue Next/Last/Between" action calls a member-gated endpoint
(`reqQueueResource*Add{Next,Last,Between}`, `skipMembershipStatus: false`). Each call site uses the
generic pattern:

```12:15:apps/web/src/components/List/Podcasts/Episodes/ListEpisodeRow.tsx
showToastPromise(apiRequestService.reqQueueResourceItemAddNext(queue.id_text, item.id_text), {
  success: tFeatures('queue.added_to_queue'),
  error: tFeatures('queue.add_error'),
});
```

So a logged-in **expired** member sees the `queue.add_error` toast instead of the membership modal.
Mobile gates queue-add (plan 03 / `useHomeRowPlayback.runQueueAction`), so web is not at parity.

## Approach (shared helper — do not duplicate try/catch 16×)

Add a small helper that awaits the add promise, routes membership 403s to the gate, and otherwise
matches today's success/error toast. Mirror the `ModalPlaylistAddTo` refactor done in Step 8
(replace `showToastPromise` with explicit `await` + `tryHandleMembershipGateError` + `showToast`).

Option A (preferred): a hook `useQueueAddWithGate()` returning
`runQueueAdd(promiseFactory, { successKey, errorKey })` that internally uses `useMembershipGate` +
`showToast`. Each row swaps its `showToastPromise(...)` for `runQueueAdd(() => apiRequestService.reqQueue…(…), …)`.

Behavior:
- success → `showToast(t(successKey), 'success')`
- membership 403 → gate modal only (no toast)
- other error → `showToast(t(errorKey), 'error')`

Keep the existing logged-out `setModalLoginRequired(login_to_add_to_queue)` guard **before** the call
(that path is unchanged; the gate only handles logged-in denials in `catch`).

## Call sites (all "queue next/last/between" onClicks)

`reqQueueResource*Add(Next|Last|Between)` appears in (verify each; some are play-section headers):

- `components/List/Podcasts/Episodes/ListEpisodeRow.tsx`
- `components/List/Music/Albums/Tracks/ListTrackRow.tsx`
- `components/List/Clips/ListClipRow.tsx`
- `components/List/ItemSoundbites/ListItemSoundbiteRow.tsx`
- `components/List/Playlists/ListPlaylistResourceRow.tsx`
- `components/List/Queues/ListQueueResources.tsx` (add-between on insert; reorder itself is NOT gated)
- `components/Common/Podcast/Episode/CommonEpisodeRow.tsx`
- `components/Common/Artist/Album/Track/CommonTrackListRow.tsx`
- `components/Core/Podcast/Episodes/CoreEpisodeHeaderPlaySection.tsx`
- `components/Core/Artist/Album/Track/CoreTrackHeaderPlaySection.tsx`
- `components/Media/ItemSoundbite/ItemSoundbiteHeaderPlaySection.tsx`
- `components/Media/Clip/ClipHeaderPlaySection.tsx`
- `components/AddByRSS/Podcast/Episode/AddByRSSEpisodeRow.tsx`
- `components/AddByRSS/Podcast/Episode/AddByRSSEpisodeDetailHeader.tsx`
- `components/AddByRSS/Artist/Album/Track/AddByRSSTrackRow.tsx`
- `components/AddByRSS/Artist/Album/Track/AddByRSSTrackDetailHeader.tsx`

(If any of these use `showToastPromiseWithLoading`, preserve the loading UX equivalently.)

## Tests

- Extend `apps/web/e2e/membership-gating.spec.ts` (or add a sibling spec) with an expired-member
  "Add to Queue Next" from a list row: mock the queue add-item 403 with the real membership payload
  (`i18nKey: membership.membership_expired`, `renewPath: /membership/renew`) and assert the membership
  modal + Renew navigation, matching the playlist-create case.

## Done when

- No queue-add call site shows the generic `queue.add_error` toast for a membership 403; all show the
  shared membership modal. Logged-out and success paths unchanged.
