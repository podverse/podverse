# Refuse a blocked feed on every entry path

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

## Rows

R2. Podcast Index sync, subscribe, Add by RSS, and OPML must not parse, list, or add a feed that prompt 1 blocked.

## Runs after

`01-import-v4-flag-blocks.md`

## Files

- `packages/orm/src/services/feed/feedEntryBlock.ts`
- `packages/orm/src/services/feed/feedEntryBlock.test.ts`
- `packages/orm/src/index.ts` (only if the new function is not already exported through the feed service barrel)
- `packages/parser/src/lib/rss/parser.ts`
- `packages/parser/src/lib/rss/parser.parseRSSFeedAndSaveToDatabase.conditions.test.ts`
- `apps/api/src/controllers/mq/mq.ts`
- `apps/api/src/controllers/account/accountFollowingAddByRSSChannel.ts`
- `apps/api/openapi.yml` (paths `rss/add/on-demand`, `rss/refresh/on-demand`, and `follow/add-by-rss-channel`)
- `apps/api/src/test/feed-blocked.integration.test.ts`
- `packages/helpers/src/lib/opmlImportCache.ts`
- `packages/mq/src/functions/mq/rss/processOpmlImport.ts`
- `apps/workers/src/commands/mq/rss/runAddByRSSParser.ts`
- `release-notes/scratchpad.md`

Update the OPML unit test that constructs `OpmlImportTotals` if one exists. Search `enqueuedIndexed` before adding a totals field.

## Tests

- `feedEntryBlock.test.ts`: pure function, no database.
- Extend `parser.parseRSSFeedAndSaveToDatabase.conditions.test.ts` so a feed whose policy blocks parse does not call `getOrCreateByFeed`.
- `apps/api/src/test/feed-blocked.integration.test.ts`: a feed with `parse_allowed`, `public_visible`, and `add_allowed` false returns 403 `feed_blocked` from `POST /mq/rss/add/on-demand` and `POST /account/follow/add-by-rss-channel`, and does not enqueue. Follow the fixture style in `apps/api/src/test/channel-add-by-rss-directory-match.integration.test.ts`.

## Release scratchpad

Append this entry at the end of `release-notes/scratchpad.md`. Do not edit any other entry.

```markdown
## v4 spam and takedown feeds stay blocked

- Surfaces: workers, api, parser
- Change: `v4ImportFlaggedFeeds` writes a v5 feed for every v4 podcast flagged spam or takedown, with parse, public listing, and add turned off. Subscribe, Add by RSS, OPML, and a later Podcast Index parse stop on that feed. `other`, `always-allow`, and non-public podcasts are unchanged.
- Who notices: operators who run the import; a person who tries to add one of those feeds
- Operator steps: from the repo root, with the local database up and `V4_DATABASE_URL` set, run `npm run v4_import_flagged_feeds -w apps/workers -- --dry-run`, then the same command without `--dry-run`
```

## Decisions

- One lookup, used by every entry path. A feed is blocked when `shouldAttemptFeedParseFromLifecycleAndPolicy` is false or `isFeedPolicyAddAllowed` is false. A feed with no policy row is not blocked. That matches today's parser, which treats a missing policy as allowed.
- Look up by Podcast Index id first, then by canonical URL. Either match blocks the entry.
- Do not create a channel, a follow, a pending follow, or a queue message for a blocked feed.
- Podcast Index producers (`mqRSSAddTrendingPodcastsFromPodcastIndex` and the other bulk adders) stay as they are. They only enqueue. The parser is the gate that stops the feed from being fetched or given a channel.
- A blocked add returns HTTP 403 with `code: 'feed_blocked'`. Do not spend the on-demand hourly refresh count or the dedupe key on that request. Check the block before those writes in `MQController.rssAddToOnDemandMQ`.
- OPML uses a new outcome `blocked` and a `blocked` total. It does not follow an existing channel for that URL, and it does not call `mqRSSAdd` or `mqAddByRSSAdd`.

## Helper

`packages/orm/src/services/feed/feedEntryBlock.ts`:

- `isFeedEntryBlocked(feed)` reads `feed.feed_lifecycle_state.feed_lifecycle_state_type.state_key` (missing means `active`) and `feed.feed_policy`.
- `findBlockedFeed({ url, podcastIndexId })` uses `FeedService.getByPodcastIndexId` and `FeedService.getByUrl`. Those loads already include `feed_policy` and `feed_lifecycle_state` through `FEED_RELATIONS` in `packages/orm/src/services/feed/feed.ts`. Return the feed when `isFeedEntryBlocked` is true, otherwise null.

Export the helper from the orm package barrel if callers outside orm need it.

## Parser

In `parseRSSFeedAndSaveToDatabase` (`packages/parser/src/lib/rss/parser.ts`), the policy check currently sits after `channelService.getOrCreateByFeed` (the call near the `handleGetRSSFeed` result). Move that check to immediately after `handleGetRSSFeed`, before `getOrCreateByFeed` and before the Podcast Index title fill. Keep the later check that runs after the body is fetched. A blocked feed throws the existing message `feed lifecycle/policy blocks parse` and never calls `getOrCreateByFeed`.

`forceParse` does not bypass this check. Do not add a bypass.

## API

`POST` `rss/add/on-demand` and `rss/refresh/on-demand` share `MQController.rssAddToOnDemandMQ` in `apps/api/src/controllers/mq/mq.ts`. Both refuse when `findBlockedFeed` returns a feed.

`POST` `follow/add-by-rss-channel` in `accountFollowingAddByRSSChannel.ts` refuses before `addOrUpdateRSSChannel`.

The `add-by-rss-directory-match` set (prompt 02) adds a directory match to the same controller.
Whichever lands second keeps this blocked check first, then the directory match, then the Add by
RSS cap. The match itself never returns a blocked feed, because it only matches channels whose
feed policy is `public_visible`.

Document the 403 and `feed_blocked` on those operations in `apps/api/openapi.yml`. Search the path fragments above. Do not rewrite the file.

## OPML and the Add by RSS parser

`processOpmlImport` checks `findBlockedFeed` for each feed URL before the existing-follow branch and before either enqueue. Outcome `blocked`.

`mqAddByRSSRunParser` in `runAddByRSSParser.ts` checks the URL before `parseRSSFeedForAddByRSS`. A blocked URL is a finished message with no parse and no catalog write. Follow the failure recording already in that function so the account sees a failed parse rather than a saved follow of the flagged URL.

## Leave alone

- `isSeedablePodcast` and the catalog seed.
- Non-public podcasts, `other`, and `always-allow`.
- Clip and playlist snapshots.
- Do not run `v4ImportFlaggedFeeds`.

## Close

This prompt is last. After the scratchpad entry, move
`.llm/plans/active/v4-flagged-feed-block/` to
`.llm/plans/completed/v4-flagged-feed-block/`. Do not commit. End the final message with the
cumulative verification in `00-EXECUTION-ORDER.md`. Do not run those commands.
