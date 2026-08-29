# 401-car-library-directory-follows

**Master step:** 12.22
**Model (author + implement):** Opus 4.8
**Status:** done
**Depends on:** 9b.8 / [600 unified subscriptions repository](/docs/proposals/mobile/_master-plan_/phase-1/details/600-unified-subscriptions-repository.md)

## Problem

The car **Library** browse node is built from the `library-browse` native-cache index, but that index
is currently derived **only** from add-by-RSS follows:

```ts
// apps/mobile/src/data/repositories/accountRepository.ts
const toLibraryBrowseNodes = (account: DTOAccount): NativeCacheBrowseNode[] => {
  const followedRss = account.account_following_add_by_rss_channels ?? [];
  return followedRss.map((channel) => ({ idText: channel.feed_url, title: ..., kind: 'podcast', ... }));
};
```

Directory subscriptions (`account_following_channels`, numeric ids) and followed playlists
(`account_following_playlists`) are **not** projected. Consequence in Android Auto / DHU: a user who
only follows directory channels sees **no Library node** (root omits empty nodes), so the head unit
drops straight into **Downloads** and "back" from Downloads does nothing (it is the effective root).

Confirmed during the 12.17 DHU pass: Downloads browse + offline play worked app-closed; Library was
absent because the only subscription was a directory follow.

## Scope

- **Consume the shared `subscriptionsRepository` (600)** as the source of merged follows instead of
  re-implementing hydration here. The car library-browse projection maps
  `subscriptionsRepository.list()` (directory + add-by-RSS, already deduped/sorted/hydrated) →
  `NativeCacheBrowseNode[]`. This guarantees car parity with Home (601) and Library (602).
- Project `account_following_playlists` as playlist nodes (playlists are not part of 600's channel
  list; hydrate via `reqPlaylistGetMany` in the repository or extend the snapshot).
- Keep add-by-RSS follows appearing (now delivered via 600's merge, not a car-only branch).
- Numeric directory follows lacking title/artwork are handled by 600's hydration + cache (title
  required; artwork optional). If 600 is not yet implemented, that repository work is the
  prerequisite — do not duplicate the merge logic in `accountRepository`.
- Optional: deeper hydration (episodes under a podcast, items under a playlist) once a richer cached
  index exists — was previously mislabeled a "12.12 follow-up"; it belongs here.

## Non-goals

- No SQLite/network reads in the native browse path (unchanged 12.12 contract — projection happens on
  the JS write side; the car only reads cache).
- Not changing authenticated Home (`type: 'subscribed'`) behavior.

## Files (anticipated)

- `apps/mobile/src/data/repositories/subscriptionsRepository.ts` (600 — merged source; consumed here)
- `apps/mobile/src/data/repositories/accountRepository.ts` (`toLibraryBrowseNodes` now maps the
  shared list; playlist projection + write path)
- Possibly `apps/mobile/src/data/nativeCache/projection.ts` (node shape if childCount/kind extended)

## Acceptance criteria

- Following a directory channel (via search/add or the subscribe toggle) results in a **Library**
  node in the Android Auto / DHU tree with the phone app force-stopped.
- Followed playlists appear under Library (or a Playlists subtree).
- Add-by-RSS follows continue to appear.
- Empty cache still omits the Library node without crashing.

## Related

- [391-android-auto-browse-tree](/docs/proposals/mobile/_master-plan_/phase-1/details/391-android-auto-browse-tree.md) (12.12 — the browse tree that reads this index)
- [393-car-offline-items-in-tree](/docs/proposals/mobile/_master-plan_/phase-1/details/393-car-offline-items-in-tree.md) (Downloads node)
- Operator proof: [ANDROID-AUTO-DHU-CHECKLIST.md](/apps/mobile/modules/podverse-media-engine/ANDROID-AUTO-DHU-CHECKLIST.md)
