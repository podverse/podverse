# 03 — Mobile: promote signed-out Add by RSS feeds to directory subscriptions

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

Signed out, the phone owns everything, so the phone does the whole move: subscribe to the
directory channel, rewrite every local row that points at the Add by RSS feed or its episodes,
then remove the Add by RSS feed. This plan builds that move once (plan 04 reuses it signed in)
and wires it into the signed-out add and refresh paths.

## Rows

R1, R2, R4, R5, R6, R7, R8

## Runs after

01 (route, `reqChannelAddByRSSMatch`, `addByRSSDirectoryMatchUrlVariants`, E2E fixture channel).

## Files

- `apps/mobile/src/lib/addByRss/directoryMatch.ts` (new, pure)
- `apps/mobile/src/lib/addByRss/directoryMatch.test.ts` (new)
- `apps/mobile/src/data/addByRssPromotionRemap.ts` (new, pure)
- `apps/mobile/src/data/addByRssPromotionRemap.test.ts` (new)
- `apps/mobile/src/data/repositories/addByRssPromotion.ts` (new)
- `apps/mobile/src/data/repositories/index.ts` (export the new code constant)
- `apps/mobile/src/sync/syncJobs.ts` (signed-out branch of `createAddByRssRefreshJob` only)
- `apps/mobile/src/hooks/useAddByRssAddFlow.ts` (device branch only)
- `apps/mobile/src/screens/rss/AddByRssAddScreen.tsx`
- `apps/mobile/src/screens/rss/AddByRssRemoteFeedScreen.tsx`
- `apps/mobile/src/screens/more/errorLogPresentation.ts`
- `packages/i18n-catalog/mobile/originals/{en-US,es,fr,el-GR}.json` (then `npm run i18n:compile`)
- `apps/mobile/e2e/add-by-rss-directory-match-anonymous.yaml` (new)
- `scripts/mobile/e2e-test.sh`, `apps/mobile/e2e/HOW-TO-RUN.md`,
  `docs/testing/FULL-REPO-VERIFICATION-COMMANDS.md` (register the flow the same way
  `add-by-rss-anonymous.yaml` is registered)
- `release-notes/scratchpad.md`

## 1. Every local store that points at an Add by RSS feed

Before writing code, run `rg -n "add_by_rss|addByRss|feedUrl|feed_url" apps/mobile/src/data/db/schema.ts`
and confirm this list. Add any table it misses to the remap and say so in your final message.

| Table | Add by RSS key | Becomes |
| --- | --- | --- |
| `subscribed_channel` | none | new row from the directory channel |
| `add_by_rss_feed` | `feed_url` | removed last, with `addByRssRepository.removeFeed` |
| `add_by_rss_credential_index` | `feed_url` | never touched: credentialed feeds never promote |
| `download` | `item_id_text` = `${feedUrl}::…` (`downloadIdText.ts`), `channel_id_text` = feed URL | `item_id_text` = directory item id, `channel_id_text` = channel id. `file_path` never changes |
| `playable_item` (`source = 'download'`) | `item_id_text` as in `download` | re-keyed to the directory item id (section 3 step 6) |
| `playback_local_state` | `resource_kind = 'add_by_rss'`, id = hash | `resource_kind = 'item'`, id = directory item id |
| `playback_outbox` | `resource_kind = 'add_by_rss'`, id = hash | same as above |
| `add_by_rss_feed.playback_position` | per-feed positions (read its writer to learn the shape) | each matched episode's position goes to `playback_local_state` as an `item` row under the key signed-out playback reads; unmatched ones are dropped with the feed row |
| `channel_seen` | `subscription_key` = feed URL, Add by RSS `kind` | key = channel id, directory `kind` |
| `channel_live_status` | same as `channel_seen` | same |
| `channel_auto_download` | `channel_id_text` = feed URL, Add by RSS `source` | channel id, directory `source` |
| `auto_download_candidate` | `item_id_text`, `channel_id_text` | directory ids |
| `section_chrome_flags` | `channel:<feedUrl>`, `item:<download id>` if any | `channel:<id>`, `item:<id>` |
| `queue_cache`, `playlist`, `playlist_resource` | server payloads (signed in only) | not rewritten here; plan 04 clears and refetches |

Read the exact `kind` / `source` / `resource_kind` strings from the repositories that write each
table (`channelSeenRepository`, `channelLiveStatusRepository`, `autoDownloadRepository`,
`playbackLocalStateRepository` or wherever `resource_kind` is written — find them with
`rg -n "resourceKind:|kind:|source:" apps/mobile/src/data/repositories`). Use those constants; do
not write new literals.

Merge rules when the target row already exists (same as `identityRemap.ts`):

- playback state and outbox: a completed row wins, otherwise the larger `playback_position`;
- seen and live: the later timestamp wins;
- download: keep the existing directory download, delete the Add by RSS row, and delete its file
  only if its `file_path` differs from the kept row's (use the downloads repository's file delete
  helper, not raw FS calls);
- auto-download settings: keep the existing directory row.

## 2. Pure modules

`lib/addByRss/directoryMatch.ts`:

- `buildAddByRssMatchRefs(feeds: { feedUrl: string; podcastGuid: string | null; items: {
  guid: string | null; enclosureUrl: string | null }[] }[]): DTOAddByRSSMatchFeedRef[][]` — drop
  feeds with userinfo or `requiresCredentials`, drop device-local guids
  (`isDeviceLocalAddByRSSGuid` from `@podverse/helpers`), and chunk to at most
  `ADD_BY_RSS_DIRECTORY_MATCH_MAX_FEEDS` feeds and `ADD_BY_RSS_DIRECTORY_MATCH_MAX_ITEMS` items
  per chunk, never splitting one feed across chunks. A single feed with more than the item limit
  sends only its first `MAX_ITEMS` items.
- `localItemRefsForFeed(mappedFeed: AddByRSSMappedFeed, referencedKeys: Set<string>)` — only
  episodes the device stores something for (a download, playback state, outbox row, or
  auto-download row). Read the guid from `items[n].item.guid` and the enclosure from
  `items[n].item_enclosure_sources[0].uri`. The keys are both the hash
  (`getAddByRSSHashId` on the same resource data playback builds; reuse
  `toAddByRssItemPlaybackResourceData`) and the download id (`downloadIdText.ts`).
- `shouldRunDirectoryMatch(lastRunAtMs: number | null, nowMs: number, force: boolean): boolean` —
  true when `force`, when never run, or when an hour has passed (settled decision 8).

`data/addByRssPromotionRemap.ts`: a pure function over a snapshot of the rows in section 1 and a
move `{ feedUrl, channelIdText, items: { hashId: string; downloadIdText: string; itemIdText:
string }[] }`, returning the rows to write and the rows to delete. Follow the snapshot-in,
snapshot-out shape of `remapIdentity` in `identityRemap.ts`. Export the merge helpers you need
from `identityRemap.ts` instead of copying them; update that file's header comment, which says
Add by RSS keys are not in the move maps, so it stays true.

## 3. Repository

`data/repositories/addByRssPromotion.ts`:

```ts
export const ADD_BY_RSS_PROMOTED_CODE = 'add_by_rss_promoted_to_directory';

export const addByRssPromotion = {
  findMatches(context, feeds): Promise<Map<string, DTOAddByRSSMatchFeed>>,
  promoteLocally(params: {
    context: MobileAuthRequestContext;
    feedUrl: string;
    match: DTOAddByRSSMatchFeed;   // channel is non-null
    accountSync: boolean;          // false in this plan; plan 04 passes true
  }): Promise<{ channelIdText: string }>,
};
```

`findMatches` calls `requestWithoutMobileAuth(context, (api) => api.reqChannelAddByRSSMatch({ feeds
}))` once per chunk from `buildAddByRssMatchRefs`, and returns matches with a non-null channel
keyed by feed URL.

`promoteLocally`, in order:

1. Fetch the channel with the public channel request the podcast detail screen uses, and build
   the row with `mapDirectoryChannelToSubscribed` (`subscriptionsMerge.ts`).
2. `subscriptionsRepository.subscribeLocal(entry)`. Never call the account follow route here.
3. Load the snapshot, run `addByRssPromotionRemap`, and write the result in one
   `getDb().transaction`.
4. Read the updated `playable_item` rows: for each moved download, fetch the directory item with
   the public item request and write its payload the way the download start path writes it
   (find it with `rg -n "playableItemRepository" apps/mobile/src/data/repositories/downloadsRepository.ts`).
   When the fetch fails, remove the old playable row; the file still plays.
5. `addByRssRepository.removeFeed(feedUrl)`.
6. `syncEventLogRepository.append({ errorCode: ADD_BY_RSS_PROMOTED_CODE, jobKind:
   'add-by-rss-refresh', message: '<channel title> (<channel id_text>)', occurredAt: Date.now(),
   outcome: 'reconciled', details: { movedItems: <n> } })`. Use
   `formatDirectoryChannelGoneDetail` for the message.
7. Re-project caches the same way `identityRemapRepository` does after `applyMoves`
   (`projectCaches`, car library index), then `homeFeedRefresh.notify()`.

The whole promotion for one feed is idempotent: rerunning it after a crash between steps 2 and 5
finds the subscription present, no rows left to move, and removes the feed.

## 4. Signed-out refresh

In `createAddByRssRefreshJob`, signed-out branch, before `listDeviceRefreshFeedUrls`:

1. Keep a module-level `lastDirectoryMatchAtMs: number | null`. Compute `force` from the run's
   trigger: read `syncJobPlan.ts` for how a pull-to-refresh run is told apart and use that.
2. If `shouldRunDirectoryMatch(...)`:
   - list `addByRssRepository.listSignedOutFollowedFeeds()`, read each mapped feed and its local
     refs, `findMatches`, and `promoteLocally` each match one at a time;
   - set `lastDirectoryMatchAtMs` after the request answers (success or 4xx), not before;
   - wrap the whole step in `try/catch`. On error, `logger.warn` with the error and the count of
     feeds, and carry on. Never rethrow: the device parse must still run when the API is down.
3. Then the existing code: `listDeviceRefreshFeedUrls` now returns only the feeds still present.

## 5. Signed-out add

In `useAddByRssAddFlow.ts` `addFeed`, device branch, before the device parse:

- When the URL has no credentials, call `findMatches` with just this URL and no items.
- On a match: `promoteLocally` is not needed (nothing local exists yet). Call
  `subscriptionsRepository.subscribeLocal` with the mapped channel, append the same log entry,
  `homeFeedRefresh.notify()`, and call a new optional option `onDirectoryChannel?(channel:
  DTOChannelDirectoryMatch)`. Do not parse.
- When the request fails, carry on with the device parse. Do not show an error.

In `AddByRssAddScreen.tsx` and `AddByRssRemoteFeedScreen.tsx`, pass `onDirectoryChannel` that
replaces the current screen with the directory podcast detail. Use the same navigation the
search results list uses to open a directory channel (`rg -n "navigate\('PodcastDetail'"
apps/mobile/src` and reuse that helper or params builder so music channels open the right
screen).

## 6. Error log label

Add `error_log.add_by_rss_promoted_to_directory` to the four mobile originals. English: `Moved to
Podverse Directory` (title case, **ui-copy-casing**). Map it in `errorLogPresentation.ts` beside
`DIRECTORY_CHANNEL_CONVERTED_CODE`, showing the message as the detail. Run `npm run i18n:compile`.

## Tests

- `directoryMatch.test.ts`: chunking at 100 feeds and 500 items, credentialed feeds dropped,
  device-local guids dropped, `shouldRunDirectoryMatch` cases.
- `addByRssPromotionRemap.test.ts`: every table in section 1, plus each merge rule, plus an
  episode with no match left alone, plus a second run returning no writes.
- Maestro `add-by-rss-directory-match-anonymous.yaml`, signed out: open Add by RSS, type
  `http://localhost:2111/feeds/directory-match-podcast.rss` (the fixture from plan 01), submit,
  and assert the directory podcast detail title from the seed. Copy the opening steps and
  timeouts from `add-by-rss-anonymous.yaml` (**mobile-maestro-timeouts**).

## Release scratchpad

```markdown
## Mobile: Add by RSS feeds already in Podverse become regular subscriptions (signed out)

- Surfaces: mobile
- Change: signed out, adding an RSS URL that Podverse has already parsed subscribes to the
  Podverse podcast instead. On refresh (at most hourly, always on pull-to-refresh) existing
  signed-out Add by RSS feeds that now match are moved: downloads, playback positions, seen and
  live badges, and auto-download settings follow the matching episodes. Episodes with no match
  keep working as before. Password-protected feeds never move. Each move is written to the error
  log as "Moved to Podverse Directory".
- Who notices: signed-out users; those shows gain clips, chapters, and the full podcast page
- Operator steps: none
```
