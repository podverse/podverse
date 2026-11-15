# 05 — Web: add and refresh use the directory match

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

The website always goes through the server (browsers cannot fetch RSS cross-site). On add, the
follow route already converts (plan 02); the web client follows its answer and opens the podcast
page. On refresh, the web client asks for matches, converts each one, and drops the local Add by
RSS record.

## Rows

R1, R2, R4, R6, R7

## Runs after

01 and 02.

## Files

- `apps/web/src/utils/addByRSS/actions.ts` (`followAddByRSSChannelAndQueue`)
- `apps/web/src/utils/addByRSS/actions.test.ts`
- `apps/web/src/utils/addByRSS/api.ts` (add `matchAddByRSSFeeds` and `convertAddByRSSFeed`)
- `apps/web/src/utils/addByRSS/directoryPromotion.ts` (new)
- `apps/web/src/utils/addByRSS/directoryPromotion.test.ts` (new)
- `apps/web/src/utils/addByRSS/parseAll.ts`
- `apps/web/src/hooks/useAddByRSSAddFeedFlow.ts`
- `apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastHeader.tsx`
- `apps/web/src/components/AddByRSS/Artist/AddByRSSArtistHeader.tsx`
- `apps/web/src/components/AddByRSS/Artist/Album/AddByRSSAlbumHeader.tsx`
- `apps/web/src/utils/addByRSS/actions.publisherListedFeeds.test.ts` (types only)
- `apps/web/e2e/add-by-rss-directory-match.spec.ts` (new)
- the web E2E spec order list (**e2e-report-order**; find it with
  `rg -ln "add-by-rss-remote-feed.spec" apps/web scripts`)
- `release-notes/scratchpad.md`

## 1. Add

Change `followAddByRSSChannelAndQueue` to return a union:

```ts
type FollowAddByRSSResult =
  | { kind: 'directory'; channel: DTOChannelDirectoryMatch; account: DTOAccount }
  | { kind: 'add_by_rss'; requestId: string; record: AddByRSSFeedRecord; account: DTOAccount };
```

When `followAddByRSSChannel` returns `directory_channel`, do not store credentials, do not upsert
a local record, do not enqueue a parse, and remove any local record for that URL
(`getAddByRSSFeedByUrl` then `removeAddByRSSFeed`). Return `kind: 'directory'`.

Callers:

- `useAddByRSSAddFeedFlow.ts` (`runParseAndRedirect` L100–151, `addFeed` L185–200): on
  `kind: 'directory'`, `router.push(channelPathForMedium(channel.medium_id, channel.id_text))`
  (`apps/web/src/utils/redirect/mergedIdentity.ts` L61–69) and skip polling.
- The three headers: on `kind: 'directory'`, `router.replace` to the same path.

## 2. Refresh

`directoryPromotion.ts`:

```ts
export const promoteMatchingAddByRSSFeeds = async (params: {
  feeds: AddByRSSFeedRecord[];
  force: boolean;
}): Promise<{ convertedFeedUrls: string[] }>
```

- Module-level `lastRunAtMs`; run when `force`, never run, or an hour has passed.
- Skip feeds with `requiresCredentials` or userinfo.
- Build refs with no items (the server has the account's rows; plan 02 moves them), chunk by
  `ADD_BY_RSS_DIRECTORY_MATCH_MAX_FEEDS`, call `matchAddByRSSFeeds`.
- For each match, `convertAddByRSSFeed({ feed_url, feed_guid })` (the feed guid comes from the
  local record's mapped feed, `mappedFeed.channel.channel.podcast_guid`, when present).
  `converted: true` or `not_followed` removes the local record with `removeAddByRSSFeed`.
- After any conversion, dispatch the existing feed-changed event (`feedChangedEvent.ts`) so open
  lists drop the row, and reload the queue the way the app does after a queue mutation (find it
  with `rg -n "queue" apps/web/src/providers -l` and reuse the existing reload).
- Errors are logged with `logger.warn` and swallowed; the refresh continues.

In `runAddByRSSParseAll` (`parseAll.ts` L52–94), call `promoteMatchingAddByRSSFeeds` first and
pass only the feeds not converted to the existing enqueue. Add a `force` param, true from the
explicit refresh button in `AddByRSSListClient.tsx` (L282–305), false from
`backgroundRefresh.ts`. Do not change the other callers' behavior beyond passing `force: false`.

## Tests

- `directoryPromotion.test.ts`: pacing, credentialed feeds skipped, local record removed on
  `converted: true` and `not_followed`, kept on `no_match`, errors swallowed.
- `actions.test.ts`: directory answer skips parse and storage.
- `add-by-rss-directory-match.spec.ts` (**e2e-readability**): a signed-in member opens Add by RSS,
  enters `E2E_DIRECTORY_MATCH_FEED_URL` from `seedConstants.ts`, submits, and lands on the
  directory podcast page showing the seeded title and a subscribed state. Capture the verified
  heading (**e2e-screenshot-verified-element**). No parse stub is needed: the follow route answers
  without parsing.

## Release scratchpad

```markdown
## Web: Add by RSS feeds already in Podverse become subscriptions

- Surfaces: web
- Change: adding an RSS URL Podverse already has opens the Podverse podcast page and subscribes.
  Refreshing Add by RSS feeds (at most hourly in the background, always from the refresh button)
  converts existing Add by RSS follows that now match; the queue and owned playlists follow on the
  server.
- Who notices: website users with Add by RSS shows that are in the directory
- Operator steps: none
```
