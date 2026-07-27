# 401-car-library-directory-follows

**Master step:** 12.22
**Model (author + implement):** Opus 4.8
**Status:** TBD

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

- Project `account_following_channels` (directory podcasts/music) into the `library-browse` index as
  browse nodes with a stable `idText` (channel `id_text`) + title + artwork.
- Project `account_following_playlists` as playlist nodes.
- Keep add-by-RSS follows (existing behavior); merge all sources into one node list.
- Numeric follows in `DTOAccount` may lack title/artwork — decide between (a) hydrating via
  `reqChannelGetMany` / entity lookup in the repository before projecting, or (b) extending the
  account snapshot payload so follows carry display fields. Prefer the smallest change that yields a
  usable car node (title required; artwork optional).
- Optional: deeper hydration (episodes under a podcast, items under a playlist) once a richer cached
  index exists — was previously mislabeled a "12.12 follow-up"; it belongs here.

## Non-goals

- No SQLite/network reads in the native browse path (unchanged 12.12 contract — projection happens on
  the JS write side; the car only reads cache).
- Not changing authenticated Home (`type: 'subscribed'`) behavior.

## Files (anticipated)

- `apps/mobile/src/data/repositories/accountRepository.ts` (`toLibraryBrowseNodes` + hydration)
- Possibly `apps/mobile/src/data/nativeCache/projection.ts` (node shape if childCount/kind extended)

## Acceptance criteria

- Following a directory channel (via search/add or the subscribe toggle) results in a **Library**
  node in the Android Auto / DHU tree with the phone app force-stopped.
- Followed playlists appear under Library (or a Playlists subtree).
- Add-by-RSS follows continue to appear.
- Empty cache still omits the Library node without crashing.

## Related

- [391-android-auto-browse-tree](/docs/proposals/mobile/_master-plan_/details/391-android-auto-browse-tree.md) (12.12 — the browse tree that reads this index)
- [393-car-offline-items-in-tree](/docs/proposals/mobile/_master-plan_/details/393-car-offline-items-in-tree.md) (Downloads node)
- Operator proof: [ANDROID-AUTO-DHU-CHECKLIST.md](/apps/mobile/modules/podverse-media-engine/ANDROID-AUTO-DHU-CHECKLIST.md)
