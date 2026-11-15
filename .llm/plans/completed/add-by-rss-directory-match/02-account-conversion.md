# 02 — Convert an account's Add by RSS follow to a directory follow

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

One ORM service turns one account's Add by RSS follow into a directory channel follow and moves
that account's queue and playlist rows onto the directory episodes, in one transaction. Two API
entry points call it: the Add by RSS follow route (on add) and a new convert route (on refresh).

## Rows

R1, R4, R5, R7, R8

## Runs after

01 (`getForFeedUrls`, `getItemIdTextsForChannel`, DTOs, `reqChannelAddByRSSMatch`).

If `v4-flagged-feed-block` prompt 02 has landed, its blocked-feed check in
`accountFollowingAddByRSSChannel.ts` stays first. The directory match runs after it.

## Files

- `packages/orm/src/services/account/accountAddByRSSDirectoryConversion.ts` (new)
- `packages/orm/src/services/account/accountAddByRSSDirectoryConversion.test.ts` (new, pure
  helpers only)
- the ORM barrel that exports `AccountFollowingAddByRSSChannelService` (add the new service there)
- `packages/helpers/src/dtos/channel/channelAddByRSSMatch.ts` (add the conversion DTO types)
- `apps/api/src/controllers/account/accountFollowingAddByRSSChannel.ts`
- `apps/api/src/controllers/account/accountAddByRSSConvert.ts` (new)
- `apps/api/src/routes/account.ts`
- `apps/api/openapi.yml`
- `apps/api/src/test/account-add-by-rss-convert.integration.test.ts` (new)
- `apps/api/src/test/api-key-routes-account-subscriptions-add-by-rss.integration.test.ts`
- the `openapiApiKeyPermissions.test.ts` table (find with `rg -l openapiApiKeyPermissions apps/api`)
- `packages/helpers-requests/src/api/account/follow/addByRSSChannel.ts`
- `packages/helpers-requests/src/api/_request.ts`
- `apps/web/src/utils/addByRSS/api.ts`
- `apps/mobile/src/data/repositories/addByRssLoginSettle.ts`
- `apps/mobile/src/hooks/useAddByRssAddFlow.ts`
- `apps/mobile/src/screens/home/AddByRssHomeDetailScreen.tsx`
- `release-notes/scratchpad.md`

The three client files change only for the new return type (section 4). Plans 04 and 05 add the
behavior.

## 1. DTO additions

In `channelAddByRSSMatch.ts`:

```ts
export type DTOAddByRSSConvertedItem = { add_by_rss_hash_id: string; item_id_text: string };
export type DTOAddByRSSConvertResponse =
  | {
      converted: true;
      channel: DTOChannelDirectoryMatch;
      items: DTOAddByRSSConvertedItem[];
      queue_rows_moved: number;
      queue_rows_dropped: number;
      playlist_rows_moved: number;
      playlist_rows_dropped: number;
    }
  | {
      converted: false;
      reason: 'no_match' | 'not_followed' | 'requires_credentials';
      channel: DTOChannelDirectoryMatch | null;
    };
```

`channel` on `converted: false` is the match when one exists (so a second device whose follow is
already gone can still move its own rows), else null.

## 2. ORM service

`AccountAddByRSSDirectoryConversionService.convert(params: { accountId: number; feedUrl: string;
feedGuid: string | null }): Promise<DTOAddByRSSConvertResponse>`

Steps:

1. `canonical = canonicalAddByRSSFeedUrl(params.feedUrl)`. Null, or a URL with userinfo, returns
   `{ converted: false, reason: 'no_match', channel: null }`.
2. `ChannelAddByRSSDirectoryMatchService.getForFeedUrls([{ feedUrl: canonical, feedGuid }])`.
   No match returns `no_match`.
3. Open a transaction (follow the transaction style in
   `packages/orm/src/services/archivedFollowConversion.ts`). Select the
   `account_following_add_by_rss_channel` row for (`account_id`, `feed_url = canonical`)
   `FOR UPDATE`.
   - No row: commit and return `{ converted: false, reason: 'not_followed', channel: match }`.
   - `requires_credentials` true: return `{ converted: false, reason: 'requires_credentials',
     channel: null }`.
4. Insert `account_following_channel (account_id, channel_id, last_seen_at)` with
   `ON CONFLICT DO NOTHING` (same `orIgnore` style as the ORM `followChannel`). When a row already
   exists, set `last_seen_at = GREATEST(existing, add_by_rss.last_seen_at)`.
5. Load the account's Add by RSS episode rows for this feed:
   - `queue_resource` joined to `queue` where `queue.account_id = accountId` and
     `add_by_rss_hash_id IS NOT NULL`;
   - `playlist_resource` joined to `playlist` where `playlist.account_id = accountId` and
     `add_by_rss_hash_id IS NOT NULL`.
   Keep only rows whose `canonicalAddByRSSFeedUrl(add_by_rss_resource_data.feed_url)` equals
   `canonical` (filter in TypeScript after a SQL prefilter on
   `add_by_rss_resource_data->>'feed_url' IN (variants)` using
   `addByRSSDirectoryMatchUrlVariants(canonical)`).
6. For those rows read `{ guid, enclosure_url }` with `extractAddByRSSHashInput` (helpers
   `addByRSSHash.ts`), then `getItemIdTextsForChannel(channel, refs)`. Load the `Item` ids for the
   matched id_texts in one query.
7. For each row with a matched item, inside the same transaction:
   - If the same queue (or playlist) already has a row with that `item_id`: delete this Add by RSS
     row and count it as dropped. For queue rows in history, keep whichever of the two has the
     larger `playback_position` by copying that value onto the kept row before the delete.
   - Else update the row: `item_id = <id>`, `add_by_rss_hash_id = NULL`,
     `add_by_rss_resource_data = NULL`. Leave `list_position`, `playback_position`, and every
     other column alone. Count it as moved.
   Rows with no matched item stay as they are.
8. Delete the `account_following_add_by_rss_channel` row.
9. Commit. Return `converted: true` with `items` = every `{ add_by_rss_hash_id, item_id_text }`
   pair moved or dropped (clients use it for their own caches), and the four counts.
10. After commit, `logger.info('Add by RSS follow moved to directory channel', { accountId,
    channelIdText, queueRowsMoved, queueRowsDropped, playlistRowsMoved, playlistRowsDropped })`.
    No feed URL in the log. No `account_content_log` / Removed Content row.

`queue_resource_check` and `playlist_resource_check` (`0001_app_schema.sql` L4482 and L4593)
require exactly one of `item_id`, `add_by_rss_hash_id`, `clip_id`, `item_soundbite_id`. Rows
selected here have `add_by_rss_hash_id` set, so the update that sets `item_id` and clears both Add
by RSS columns keeps the check true. Clip and soundbite rows are never selected. A playlist row
with `source_removed_at` set is left alone.

Put the pure parts (row filter by canonical URL, the keep-or-drop decision for a duplicate) in
exported functions so the unit test covers them without a database.

## 3. API

### Convert route

`POST /account/add-by-rss/convert-to-channel` in `routes/account.ts`, beside the other
`/add-by-rss/*` routes. Authenticated; `skipMembershipStatus: true` (settled decision 5).
`apiKeyAccess({ resource: 'subscriptions', action: 'create' })` — read **api-key-route-access**
(`.cursor/rules/api-key-route-access.mdc`) and use the exact resource and action names that rule
lists for directory follows. Rate limit with `rateLimitEndpoint` and the same limiter the
`/add-by-rss/parse` route uses.

Body (Joi): `feed_url` string max 2048 required; `feed_guid` string max 255 allow null default
null. Response 200 `DTOAddByRSSConvertResponse`.

OpenAPI: the path with `x-api-key-permission`, request, and both response shapes. Add the route
to the api-key route table test and the `openapiApiKeyPermissions` table.

### Follow route converts on add

In `accountFollowingAddByRSSChannel.ts` `addOrUpdateRSSChannel` (L64–147), after body
validation and the blocked-feed check (if present), before the Add by RSS cap check:

1. Skip the match when `requires_credentials` is true or the URL has userinfo.
2. Otherwise `getForFeedUrls([{ feedUrl: canonical, feedGuid: null }])`.
3. On a match:
   - If the account already follows this URL as Add by RSS, call the conversion service.
   - Else follow the directory channel with the same ORM call `followChannel` in
     `accountFollowingChannel.ts` (L154–196) uses.
   - Respond **200** `{ message: 'Followed directory channel', directory_channel:
     DTOChannelDirectoryMatch }`. Do not insert an Add by RSS row and do not apply the Add by
     RSS cap.
4. No match: today's behavior, and the 201 body gains `directory_channel: null`.

Update the OpenAPI response for `follow/add-by-rss-channel` with both shapes.

## 4. Request client

In `addByRSSChannel.ts`, change `reqAccountFollowAddByRSSChannel` to return
`Promise<{ account: DTOAccount; directory_channel: DTOChannelDirectoryMatch | null }>`: read
`directory_channel` from the POST response (missing means null), then `reqAuthMe`.

Add `reqAccountAddByRSSConvertToChannel(api, { feed_url, feed_guid }):
Promise<DTOAddByRSSConvertResponse>` and the `ApiRequestService` method beside
`reqAccountFollowAddByRSSChannel`.

Update the four callers for the new return shape only, keeping behavior:

- `apps/web/src/utils/addByRSS/api.ts` `followAddByRSSChannel`: return the new object; update its
  callers' types (`rg -n "followAddByRSSChannel\(" apps/web/src`) to read `.account` where they
  used the account.
- `addByRssLoginSettle.ts`, `useAddByRssAddFlow.ts`, `AddByRssHomeDetailScreen.tsx`: they ignore
  the value today; leave them ignoring it. Plan 04 adds the handling.

## Tests

`account-add-by-rss-convert.integration.test.ts`:

- Follow an Add by RSS URL matching a seeded channel through `POST /account/follow/add-by-rss-channel`:
  200, `directory_channel` set, no Add by RSS row, a directory follow row, and the Add by RSS cap is
  not consumed (an account at its cap still succeeds).
- A non-matching URL: 201, `directory_channel: null`, Add by RSS row as before.
- `requires_credentials: true` on a matching URL: Add by RSS row, no conversion.
- Convert route: an account with an Add by RSS follow, a queue with one matching upcoming row, one
  matching history row, one unmatched row, and an owned playlist holding a matched row plus the
  same directory item already present. Expect moved/dropped counts, the unmatched row untouched,
  the follow gone, a directory follow present, `last_seen_at` carried over.
- Convert route when the follow is gone: `not_followed` with `channel` set.
- Convert route needs no membership: an expired account converts.
- Another account's playlist holding the same Add by RSS episode is unchanged.

`accountAddByRSSDirectoryConversion.test.ts` for the pure helpers.

## Release scratchpad

```markdown
## Add by RSS feeds that are in the directory become subscriptions

- Surfaces: api
- Change: `POST /account/follow/add-by-rss-channel` checks the URL against parsed directory
  channels first. A match follows the directory channel instead, returns 200 with
  `directory_channel`, and does not count toward the Add by RSS limit. New
  `POST /account/add-by-rss/convert-to-channel` converts an existing Add by RSS follow and moves the
  account's queue, history, now playing, and owned playlist rows onto the directory episodes
  (matched by guid, then enclosure URL). Unmatched episodes keep their Add by RSS data.
  Password-protected feeds never convert. No membership is needed to convert.
- Who notices: people who add a show by RSS that Podverse already has; they get the full podcast
  page
- Operator steps: none
```
