# 04 — Mobile: signed-in add, refresh, and sign-in carry use the server conversion

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

Signed in, the server owns the follow, the queue, and the playlists (plan 02). The phone asks
the server to convert, then applies the same local move plan 03 built for its device-only rows,
and drops its cached server payloads so the next read shows directory episodes.

## Rows

R1, R2, R4, R5, R6, R7

## Runs after

02 (convert route, follow response with `directory_channel`, new client return type) and 03
(`addByRssPromotion`, `ADD_BY_RSS_PROMOTED_CODE`, `shouldRunDirectoryMatch`).

## Files

- `apps/mobile/src/data/repositories/addByRssPromotion.ts`
- `apps/mobile/src/sync/syncJobs.ts` (signed-in branch of `createAddByRssRefreshJob` only)
- `apps/mobile/src/hooks/useAddByRssAddFlow.ts` (server branch only)
- `apps/mobile/src/data/repositories/addByRssLoginSettle.ts`
- `apps/mobile/src/screens/home/AddByRssHomeDetailScreen.tsx`
- `apps/mobile/src/sync/syncQueue.test.ts` or the existing refresh-job test (extend; find it with
  `rg -ln "add-by-rss-refresh" apps/mobile/src/sync`)
- `apps/mobile/e2e/add-by-rss-directory-match-signed-in.yaml` (new) and its registration in
  `scripts/mobile/e2e-test.sh`, `apps/mobile/e2e/HOW-TO-RUN.md`,
  `docs/testing/FULL-REPO-VERIFICATION-COMMANDS.md`
- `release-notes/scratchpad.md`

## 1. Repository addition

In `addByRssPromotion.ts` add:

```ts
convertAccountFeed(params: {
  context: MobileAuthRequestContext;
  feedUrl: string;
  feedGuid: string | null;
}): Promise<{ channelIdText: string } | null>
```

1. `requestWithMobileAuthRefresh(context, (api) => api.reqAccountAddByRSSConvertToChannel({
   feed_url, feed_guid }))`.
2. `converted: true`: build a `DTOAddByRSSMatchFeed` from the response (`channel`, and `items`
   mapped from `{ add_by_rss_hash_id, item_id_text }`; the download id for each hash comes from the
   local mapped feed, as plan 03 computes it) and call `promoteLocally` with `accountSync: true`.
3. `converted: false` with `reason: 'not_followed'` and a `channel`: another device converted it
   already. Call `findMatches` for this one feed with its local item refs to get the item map, then
   `promoteLocally` the same way.
4. `no_match` or `requires_credentials`: return null and leave everything as it is.

With `accountSync: true`, `promoteLocally` also:

- calls `queueRepository.clearAll()` (the queue cache holds server payloads with Add by RSS rows);
- clears the cached `playlist` and `playlist_resource` rows for playlists the account owns, with
  the playlist repository's existing clear (find it with `rg -n "clear" apps/mobile/src/data/repositories/playlist*.ts`);
- does not call the account follow route: the server already follows the channel.

Then the next subscriptions hydrate picks up the server's directory follow; `subscribeLocal`
already wrote the same row, so nothing flickers.

## 2. Signed-in refresh

In `createAddByRssRefreshJob`, signed-in branch, after `splitStoredUserinfo` and **before** the
membership check (converting needs no membership, settled decision 5):

1. Same pacing as plan 03 (`shouldRunDirectoryMatch`, same module-level timestamp).
2. List the account's followed feeds on this device (`addByRssRepository.listFeeds()`), drop
   credentialed ones, `findMatches` for all of them in chunks.
3. For each match, `convertAccountFeed` one at a time.
4. Same `try/catch` rule as plan 03: log, never rethrow, carry on to the membership check and
   `requestRefreshAll`. A 401 goes through `requestWithMobileAuthRefresh` as usual.

## 3. Signed-in add

`useAddByRssAddFlow.ts`, server branch: read `directory_channel` from
`reqAccountFollowAddByRSSChannel`. When set:

- `subscriptionsRepository.subscribeLocal` with the channel (fetched and mapped as in plan 03);
- skip the parse request and the local Add by RSS row;
- append the `ADD_BY_RSS_PROMOTED_CODE` log entry;
- call `onDirectoryChannel` (added in plan 03), which opens the podcast detail.

## 4. Sign-in carry and the follow button

- `addByRssLoginSettle.ts`: for each feed it follows on the account (L128), when the response has
  `directory_channel`, call `promoteLocally` for that feed with `accountSync: true` and a match
  built from `findMatches` for that feed (so local downloads and positions move). Count it as
  saved, as today.
- `AddByRssHomeDetailScreen.tsx` follow button (L512): when the response has
  `directory_channel`, run the same `promoteLocally`, then navigate to the directory podcast detail
  with `navigation.replace` instead of `setFollowed` and `loadDetail`.

## Tests

- Refresh-job test: signed in with a matching feed calls convert before the membership check, and
  a convert failure still reaches `requestRefreshAll`.
- Maestro `add-by-rss-directory-match-signed-in.yaml`: sign in with the E2E account the other
  signed-in Add by RSS flows use, add the fixture URL, assert the directory podcast detail. Copy
  the sign-in steps from the existing signed-in Add by RSS flow. This flow needs the
  **Mobile E2E API** tab running.

## Release scratchpad

```markdown
## Mobile: signed-in Add by RSS feeds already in Podverse become subscriptions

- Surfaces: mobile
- Change: signed in, adding an RSS URL Podverse already has opens the Podverse podcast and
  follows it on the account. Refresh (at most hourly, always on pull-to-refresh) converts
  existing Add by RSS follows that now match, on the server and on the phone; the queue, history,
  and owned playlists move on the server, and downloads and positions move on the phone. Works
  without a membership. Signing in with signed-out feeds that match moves them too.
- Who notices: signed-in users with Add by RSS shows that are in the directory
- Operator steps: none
```
