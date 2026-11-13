**Cursor model:** Opus 5.5 · **Reasoning:** high

# 42 — Artist fan-out for feeds parsed on the device

When the server parses an Add by RSS artist feed, the worker
(`apps/workers/src/lib/addByRSS/fanOutAddByRSSPublisherListedFeeds.ts`) builds the artist's
listed albums, matches them against the Podverse directory, asks Podcast Index for guid-only
albums, and queues a parse for every listed Add by RSS album. A device parse has none of that
today: the result comes back with `publisherListedFeeds` unset, and the listed-feed job refuses
to run signed out.

After this plan, a signed-out device-parsed artist gets the same listings. The device builds them
from its own mapped feed, matches them through the public remote-item lookup (plan 40) in batches
of 100, and parses each listed album on the device in the existing listed-feed job. Guid-only
channel-level albums the directory and stub tables do not know are resolved one by one through
the public resolve route in a new paced background job; it waits out a 429 and retries, and rows
fill in as answers arrive. An album the route does not know (`not_found`, or a 400) is marked
no-match until the artist feed changes; an album whose directory channel is not ready yet
(`directory_unavailable`) is asked again on a later sync run, with a growing delay. Signed in,
nothing is parsed on the device: the server path is unchanged, and listings of hidden signed-out
feeds are skipped.

## Rows

R13, R14, R44, R46, R47, R52

## Runs after

21 (creates `apps/mobile/src/lib/addByRss/deviceParse.ts`, `parseAddByRssFeedOnDevice`), 30, 31,
32, 33, 34, 40. 34 because both edit `syncJobs.ts`, `addByRssRepository.ts`, and the Maestro
registration files; 34 changes the signed-in branch of the refresh job and this plan its
signed-out tail. 31 because both edit `syncJobKinds.ts` and its test; 32 and 33
because this plan edits files they edit (`syncJobPlan.ts`, `syncQueue.test.ts`, `syncJobs.ts`,
`addByRssRepository.ts`, and the Maestro registration files).

## Files

packages/parser-mapping/src/addByRSS/publisherListedFeeds.ts
packages/parser-mapping/src/addByRSS/publisherListedFeeds.test.ts
apps/mobile/src/lib/addByRss/deviceListedFeeds.ts
apps/mobile/src/lib/addByRss/deviceListedFeeds.test.ts
apps/mobile/src/lib/rateLimit/handleRateLimitMessage.ts
apps/mobile/src/lib/rateLimit/handleRateLimitMessage.test.ts
apps/mobile/src/data/repositories/addByRssListedFeeds.ts
apps/mobile/src/data/repositories/addByRssListedFeeds.test.ts
apps/mobile/src/data/repositories/addByRssRepository.ts
apps/mobile/src/sync/syncJobKinds.ts
apps/mobile/src/sync/syncJobKinds.test.ts
apps/mobile/src/sync/syncJobs.ts
apps/mobile/src/sync/syncJobPlan.ts
apps/mobile/src/sync/syncQueue.test.ts
tools/test-assets/assets/e2e/add-by-rss/artist.xml
tools/test-assets/assets/e2e/add-by-rss/album.xml
apps/mobile/e2e/add-by-rss-anonymous-artist.yaml
scripts/mobile/e2e-test.sh
apps/mobile/e2e/HOW-TO-RUN.md
docs/testing/FULL-REPO-VERIFICATION-COMMANDS.md
release-notes/scratchpad.md

## Parity source

The worker's `fanOutAddByRSSPublisherListedFeeds` is the source of truth for which listings exist
and how they are classified. The device reuses its pure parts unchanged:
`collectAddByRSSPublisherListedFeedRefs`' grouping, `planAddByRSSPublisherListedFeeds`,
`addByRSSResourceTypeListsFeeds`, and `resolveCredentialScope`. The device side of storing,
polling, and pruning listings (`storeArtistRelations`, `replaceListedFeeds`,
`groupPendingListedAlbums`, `decideListedAlbumStore`, `storeListedAlbumResult`) is reused as is.
The worker's live index call for guid-only refs has three conditions (channel-level, no URL, a
valid reliable UUID); the device's paced resolve uses the same three.

## Decisions fixed here

- **Directory matching goes through the public lookup.** The device sends the artist's
  channel-level refs (`feed_guid`, `feed_url`, `item_guid: null`) to
  `POST /account/add-by-rss/remote-item/lookup` through `requestWithMobileAuthRefresh` (a null
  token sends no bearer), in chunks of `ADD_BY_RSS_REMOTE_ITEM_LOOKUP_MAX_REFS` (100).
  `kind: 'channel'` fills `directoryByFeedGuid`; `kind: 'provider_feed'` (a stub the server already
  holds) fills `lookedUpFeedUrlByFeedGuid` for refs that meet the three conditions.
- **Guid-only albums nobody knows yet are resolved through paced calls.** A ref that meets the
  three conditions and that the lookup did not match is stored as `unresolved` with reason
  `no_feed_url`, exactly as the plan function leaves it. A background job then calls
  `POST /account/add-by-rss/remote-item/resolve` once per distinct guid, one call at a time,
  spaced `LISTED_FEED_RESOLVE_SPACING_MS` (500 ms) apart, so a 100-album artist stays under the
  signed-out budget of 120 per minute. Each answer is stored right away and the artist's album
  list reloads (§ 4d).
- **A 429 waits and retries.** The job reads the reset time from the 429 body
  (`timeUntilResetMs`), sleeps that long, and calls again, inside the job's budget. The budget
  (80 s) is longer than the one-minute window, so a run that starts on a 429 always gets to wait
  it out. A wait that would pass the budget ends the run with the work left in place.
- **No match versus a directory channel that is not ready (D40).** `not_found` and a 400 mark
  every listing of that guid `resolve_no_match`; the mark stays until the artist's next plan
  replaces the row (the artist feed changed). `directory_unavailable` means Podverse holds the
  feed but the directory match does not return it yet (the API answers it when the index stub
  resolves to a parsed feed), so it is temporary: the row stays `unresolved` / `no_feed_url`
  and the guid gets a retry time. The sync queue has no delayed jobs and holds its work in
  memory ("a restart re-derives them from triggers"), so the backoff follows the same model:
  - **Where it is stored:** in memory only, a module-level `Map` in `addByRssRepository.ts`
    keyed by lowercased `feedGuid` (one resolve call covers every listing of that guid). No
    column and no migration. An app restart clears it, so the first run after a launch asks
    again. It is device data about a public directory guid, not account data, so sign-out does
    not clear it (the job only runs signed out anyway).
  - **Ladder:** after the k-th `directory_unavailable` answer for a guid in this session, the
    next attempt is due `min(LISTED_FEED_RESOLVE_RETRY_BASE_MS × 2^(k−1),
    LISTED_FEED_RESOLVE_RETRY_MAX_MS)` later: base `60000` (the per-minute window the 429
    fallback in § 5 already uses), doubling like the connectivity probe ladder
    (`PROBE_BASE_DELAY_MS` doubling in `net/connectivityMachine.ts`), cap `1800000` (30 min).
    That is 1, 2, 4, 8, 16, then 30 minutes (the sixth delay, 32 min, is capped).
  - **Attempts:** `LISTED_FEED_RESOLVE_RETRY_MAX_RETRIES = 6` retries per guid per app session
    after the first `directory_unavailable` answer, so at most seven calls spread over about an
    hour. After the seventh such answer the guid is not asked again until the next app
    launch. An artist re-plan does not reset the entry: the directory's state for that guid did
    not change because the artist feed did.
  - **What retries it:** nothing schedules a timer. A guid whose retry time has not come is left
    out of the resolve work list, so `hasListedFeedResolveWork` is false for it and no empty job
    is enqueued. The next trigger after the time comes (the signed-out refresh job on app start,
    foreground, connectivity restored, or pull, plan 33; or the listed-feed job) finds it due
    and enqueues the resolve job.
  - **Inside the pacing and the budget:** a `directory_unavailable` answer is one paced call like
    any other (500 ms before the next call). A run never sleeps toward a retry time; only a 429
    waits inside a run. A guid that answered `directory_unavailable` is not called again in the
    same run. It counts as deferred, not as `left`, so it does not make the job re-enqueue
    itself.
  - A settled answer (`channel`, a usable `provider_feed`, `not_found`, a 400, or a provider feed
    with no usable URL) deletes the guid's retry entry. A 503 or another 5xx stops the run as
    before and does not touch the retry entries. That failure is the index provider or the API,
    not this guid.
- **A tap on a `directory_unavailable` answer.** No tap reads or writes a listing row or this
  retry map. The artist album list does not render `unresolved` listings
  (`addByRssArtistAlbums.ts`), so there is no row to tap. The podroll and remote-items sections
  (plan 44) resolve a tapped `reference` row directly. On `directory_unavailable` they show the
  existing notice `features.add_by_rss.remote_item_directory_unavailable` ("This feed is not
  available right now."), store nothing, and let the user tap again at any time; only the
  in-flight guard (`openingRef`) limits a second tap. Plan 44 does not change.
- **A private artist's references never leave the phone.** When the device parse sent credentials
  (`result.credentialsState === 'sent'`), skip the lookup and plan with empty maps: refs with a
  URL become device-parsed albums, refs without one stay `unresolved`. The resolve job also skips
  every listing whose artist has stored credentials
  (`addByRssCredentialStore.getForCurrentAccount(publisherFeedUrl)` not null), so none of a
  private artist's guids are sent later either (D24). This matches the worker, which skips its
  Podcast Index lookup when credentials were sent.
- **A failed lookup keeps what is stored and forces a full fetch next time.** The result goes on
  with `publisherListedFeeds: undefined` (stored listings stay), and the conditional cache is
  stored as `null` so the next refresh fetches and plans again instead of answering
  `not_modified`.
- **Device request ids.** Listings planned on the device get `pendingRequestId`
  `device:<uuid>` (`createUuid` from `apps/mobile/src/lib/createUuid.ts`). Signed out (parse path
  `'device'`), every pending album is parsed on the device, including albums with a server id left
  from a signed-in session. Signed in (parse path `'server'`), nothing is parsed on the device:
  albums with a server id are polled on the server as today, and `device:` albums stay pending
  until the artist's next server parse replaces its listings (the server has no record of a
  `device:` id).
- **Hidden rows are skipped while signed in.** Listings whose artist feed the shared signed-out
  read filter hides in this session (`signed_out_owned = 1` while signed in, § Seams for the
  second pass) are left out of the listed-feed job, the resolve job, and both "is there work"
  checks. Their rows are kept for after sign-out.
- **Album credentials.** The album's own stored credentials
  (`addByRssCredentialStore.getForCurrentAccount(album.feedUrl)`), else the first listing artist's
  credentials for which `resolveCredentialScope(publisherFeedUrl, album.feedUrl, { allowInsecure:
  isAddByRssInsecureCredentialsAllowedFromEnv() })` is `'send'`, else none. Only the album's own
  credentials count as `sentCredentials` for `storeListedAlbumResult`, as on the server path.
- **Album-to-artist directory match is unchanged.** `storeArtistRelations` already looks up an
  album's publisher pointers through the public `GET /channel/directory-match`, which works signed
  out. It keeps doing so on the device path.

## 1. Refs from a mapped feed — `packages/parser-mapping/src/addByRSS/publisherListedFeeds.ts`

Split `collectAddByRSSPublisherListedFeedRefs` into a core that takes the feed's own guid and its
channel remote-item DTOs, and two entry points:

- `collectAddByRSSPublisherListedFeedRefs(parsedFeed, publisherFeedUrl)` — unchanged signature and
  behavior; passes `parsedFeed.guid` and `compatChannelRemoteItemDtos(parsedFeed)`.
- New export `collectAddByRSSPublisherListedFeedRefsFromMappedFeed(mappedFeed: AddByRSSMappedFeed,
  publisherFeedUrl: string)` — passes `mappedFeed.channel?.channel?.podcast_guid` and
  `mappedFeed.channel?.remoteItems ?? []`. (`ParsedRSSFeedCompatBundle.channel.remoteItems` is
  `compatChannelRemoteItemDtos(parsedFeed)`, so both entry points see the same DTOs.)

The worker keeps calling the first. Same return type, same cap.

## 2. Pure device planning — `apps/mobile/src/lib/addByRss/deviceListedFeeds.ts` (new)

`isValidReliableUUID` comes from the `@podverse/helpers` barrel, which `segmentsRepository.ts` and
`syncJobs.ts` already import values from.

- `export const DEVICE_LISTED_REQUEST_ID_PREFIX = 'device:';`
- `export const isDeviceListedRequestId = (requestId: string): boolean`.
- `export const isResolvableListedRef(ref: { feedGuid: string; feedUrl: string | null; listedAtChannelLevel: boolean }): boolean`
  — the three conditions: `listedAtChannelLevel`, no feed URL, `isValidReliableUUID(feedGuid)`.
- `export const deviceListedFeedLookupRefs(refs: readonly AddByRSSPublisherListedFeedRef[]):
  AddByRSSRemoteItemLookupRef[]` — one `{ feed_guid, feed_url, item_guid: null }` per ref, in ref
  order.
- `export const deviceListedFeedMatches(refs, results: readonly DTOAddByRSSRemoteItemLookupResult[])`
  returning `{ directoryByFeedGuid, lookedUpFeedUrlByFeedGuid }` (both keyed by lowercased guid),
  results aligned with refs: `channel` → `{ channelIdText: id_text, title, mediumId: medium_id }`;
  `provider_feed` → the feed URL, only when `isResolvableListedRef(ref)`. Other kinds ignored.
- `export const planDeviceListedFeeds(input: { refs; matches: ReturnType<typeof deviceListedFeedMatches> | null; newUuid: () => string })`
  → `planAddByRSSPublisherListedFeeds({ refs, directoryByFeedGuid, lookedUpFeedUrlByFeedGuid,
  newRequestId: () => DEVICE_LISTED_REQUEST_ID_PREFIX + newUuid() }).listedFeeds`, with empty maps
  when `matches` is null.

## 3. `apps/mobile/src/data/repositories/addByRssListedFeeds.ts`

- Add `{ kind: 'unchanged' }` to `ListedAlbumStoreAction`. In `decideListedAlbumStore`, right after
  the `pending` check: `status === 'not_modified'` with `mappedFeed === null` → `unchanged` (the
  device sent its stored validators and the host answered 304).
- Resolve helpers, pure:
  - `export const LISTED_FEED_RESOLVE_NO_MATCH_REASON = 'resolve_no_match';` — a mobile-only
    `unresolvedReason` meaning resolve was asked and the route does not know the guid
    (`not_found`, a 400, or a provider feed with no usable URL). Doc comment: the column is free
    text; the shared reasons come from `AddByRSSPublisherListedFeedUnresolvedReason`, and the
    artist's next plan replaces the row, so the guid is asked again only after the artist
    changes. A directory channel that is not ready yet never gets this reason.
  - `export const listedFeedNeedsResolve(listing: AddByRssListedFeedRecord): boolean` —
    `kind === 'unresolved'`, `unresolvedReason === 'no_feed_url'`, and
    `isResolvableListedRef(listing)`.
  - `export const groupListedFeedResolveWork(listings)` → one entry per lowercased `feedGuid`,
    first-seen order, each with the `{ publisherFeedUrl, feedGuid }` keys of every listing that
    names it (two artists listing the same album cost one call).
  - `export const decideListedFeedResolve(result: DTOAddByRSSRemoteItemResolveResult, newUuid: () => string): ListedFeedResolveAction`
    with `ListedFeedResolveAction` =
    `{ kind: 'directory'; channelIdText; channelTitle; mediumId }` for `channel`;
    `{ kind: 'add_by_rss'; feedUrl; requestId }` for `provider_feed` whose `feed_url` passes
    `canonicalAddByRSSFeedUrl` (`requestId` = `DEVICE_LISTED_REQUEST_ID_PREFIX + newUuid()`);
    `{ kind: 'no_match' }` for `not_found` or a provider feed with no usable URL;
    `{ kind: 'retry_later' }` for `directory_unavailable`. Exhaustive `switch` on `result.kind`
    with a `never` default, as the tap path does.
- Retry backoff, pure (the clock is a parameter so node tests need no timers):
  - `export const LISTED_FEED_RESOLVE_RETRY_BASE_MS = 60000;`,
    `export const LISTED_FEED_RESOLVE_RETRY_MAX_MS = 1800000;`,
    `export const LISTED_FEED_RESOLVE_RETRY_MAX_RETRIES = 6;`.
  - `export type ListedFeedResolveRetry = { attempts: number; nextAttemptAtMs: number | null };`
    — `attempts` counts `directory_unavailable` answers this session; `nextAttemptAtMs: null`
    means no more attempts this session.
  - `export const nextListedFeedResolveRetry(previous: ListedFeedResolveRetry | undefined, nowMs: number): ListedFeedResolveRetry`
    — `attempts = (previous?.attempts ?? 0) + 1`; when `attempts > LISTED_FEED_RESOLVE_RETRY_MAX_RETRIES`,
    `nextAttemptAtMs: null`; otherwise `nowMs + Math.min(BASE × 2 ** (attempts − 1), MAX)`.
  - `export const isListedFeedResolveDue(retry: ListedFeedResolveRetry | undefined, nowMs: number): boolean`
    — true when `retry` is undefined, false when `nextAttemptAtMs` is null, else
    `nowMs >= nextAttemptAtMs`.
  - Doc comment on the constants: the entry lives in memory for the app session, a later sync
    trigger picks the guid up once it is due, and nothing sleeps toward it.
- `toListedFeedInserts` already stores each entry's `requestId` as the pending id; no change.

## 4. Repository — `apps/mobile/src/data/repositories/addByRssRepository.ts`

Large file: find anchors with Grep (`storeArtistRelations`, `withOwnAlbumParseRequest`,
`storeListedAlbumResult`, `settleListedAlbum`, `runListedFeedWork`, `hasListedFeedWork`,
`parseNowOnDevice`, `refreshFeedOnDevice`, `afterArtistRelationsChanged`) and read windows around
them.

### 4a. Listings for a device parse

Private `withDeviceListedFeeds(context, feedUrl, result)` →
`Promise<{ result: AddByRssPollResult & { conditionalCache: … }; listingsResolved: boolean }>`:

1. Unless `result.status === 'parsed'`, `result.mappedFeed !== null`, and
   `addByRSSResourceTypeListsFeeds(getAddByRSSResourceTypeFromMappedFeed(result.mappedFeed))`,
   return the result unchanged with `listingsResolved: true`.
2. `refs` from `collectAddByRSSPublisherListedFeedRefsFromMappedFeed(result.mappedFeed, feedUrl)`.
3. `result.credentialsState === 'sent'` → `matches = null`. Otherwise call the lookup in chunks of
   `ADD_BY_RSS_REMOTE_ITEM_LOOKUP_MAX_REFS` (one chunk today; both caps are 100), concatenate the
   results in order, and build `matches` with `deviceListedFeedMatches`. On any thrown error
   return `{ result: { ...result, publisherListedFeeds: undefined }, listingsResolved: false }`.
4. Return `{ result: { ...result, publisherListedFeeds: planDeviceListedFeeds(…) }, listingsResolved: true }`.

Whatever area B's parse put in `publisherListedFeeds` is replaced in step 4 (the device parse
cannot match the directory).

Call it in `parseNowOnDevice` and `refreshFeedOnDevice` right after the device parse returns and
before anything is stored. When `listingsResolved` is false, the `setDeviceFetchState` call passes
`cache: null` instead of `deviceCacheToStore(result)`.

In `storeArtistRelations`, the check after `replaceListedFeeds` requests the listed-feed sync when
any listing needs work or `listedFeedNeedsResolve`.

### 4b. Which listings count as work

Private `readWorkListings(context, parsePath)`: `listAllListedFeeds()` minus listings whose
`publisherFeedUrl` the shared signed-out read filter hides in this session. Area C names that
filter in `addByRssDevicePath.ts` or the repository; if it is only a query condition, select the
hidden feed URLs with it and drop listings by `publisherFeedUrl`. When `parsePath === 'server'`,
also drop pending listings with a `device:` id.

- `hasListedFeedWork(context)` gains the auth context, computes the parse path, and answers from
  `readWorkListings` with `listedFeedNeedsWork`. Update its callers in `syncJobs.ts`.
- New `hasListedFeedResolveWork(context)`: `'device'` path only (false when signed in), and any
  listing from `listListedFeedResolveWork` (§ 4d), which already leaves out guids that are not
  due, so a guid waiting on its retry time does not enqueue a job.

### 4c. Listed albums parsed on the device

- `runListedFeedWork(context, parsePath: AddByRssParsePath, sleep, signal?)` replaces the
  `accountIdText` parameter, reads pending albums from `readWorkListings`, and returns
  `Promise<{ deviceAlbumsLeft: number; deviceAlbumsStored: number }>`.
- `'device'`: every pending album is a device album; skip the server rounds. `'server'`: today's
  server rounds, unchanged (`device:` albums are already out of the list).
- `withOwnAlbumParseRequest` reads credentials with `getForCurrentAccount(album.feedUrl)` and drops
  its `accountIdText` parameter.
- Device albums run once each, in listing order, inside the existing work budget
  (`LISTED_FEED_WORK_BUDGET_MS`): stop starting new albums once the budget or the signal says
  stop; the albums not started keep their pending ids and count toward `deviceAlbumsLeft`.
- Per device album: credentials per the decision above; `state = getDeviceFetchState(album.feedUrl)`;
  `parseAddByRssFeedOnDevice({ feedUrl: album.feedUrl, credentials, conditionalCache: state?.cache ?? null, signal })`.
  A throw (offline, Offline Mode, abort) stops the device part of this run with the album still
  pending. A returned result goes through `storeListedAlbumResult` (which now takes
  `sentCredentials` as a parameter; the server path passes
  `ownAlbumParseRequestIds.has(album.requestId)`), then `setDeviceFetchState` with
  `deviceCacheToStore(result)` when a row for the album exists after storing, then
  `moveListingsPending(album.listings, null)`.
- `storeListedAlbumResult` handles `unchanged` like `skip-duplicate` (no write).
- Directory artwork fill keeps running last for every path; it reads through the public channel
  route already, and it fills the artwork of listings the resolve job turned into directory rows.

### 4d. Paced resolve of guid-only listings

- Module-level `const listedFeedResolveRetries = new Map<string, ListedFeedResolveRetry>();`
  keyed by lowercased `feedGuid`, beside the repository's other module state. Doc comment: held
  for the app session only, like the sync queue's work; device data, so sign-out leaves it.
- `listListedFeedResolveWork(context)`: `readWorkListings(context, 'device')` filtered by
  `listedFeedNeedsResolve`, minus listings whose `publisherFeedUrl` has stored credentials
  (`addByRssCredentialStore.getForCurrentAccount`, read once per distinct publisher; a read
  error counts as "has credentials"), minus listings whose guid is not due
  (`isListedFeedResolveDue(listedFeedResolveRetries.get(feedGuid.toLowerCase()), Date.now())`
  is false).
- `applyListedFeedResolve(keys, action)`: in one transaction, update each listed row by
  `(publisherFeedUrl, feedGuid)` and only while it is still `kind = 'unresolved'` with
  `unresolvedReason = 'no_feed_url'` (a re-plan that replaced the row in between wins):
  `directory` → `kind 'directory'`, channel fields set, `artworkChecked 0`, reason null;
  `add_by_rss` → `kind 'add_by_rss'`, `feedUrl`, `pendingRequestId`, reason null; `no_match` →
  reason `LISTED_FEED_RESOLVE_NO_MATCH_REASON`. Then `afterArtistRelationsChanged()`, so an open
  artist screen reloads (`useAddByRssArtistIndexVersion`). Its `action` parameter type excludes
  `retry_later` (`Exclude<ListedFeedResolveAction, { kind: 'retry_later' }>`): that answer
  writes no row.
- `runListedFeedResolveWork(context, sleep, signal?)` →
  `Promise<{ applied: number; deferred: number; left: number }>`, with
  `LISTED_FEED_RESOLVE_BUDGET_MS = 80000` and `LISTED_FEED_RESOLVE_SPACING_MS = 500`:
  - groups from `groupListedFeedResolveWork(await listListedFeedResolveWork(context))`;
  - per group, in order, stop when the signal is aborted or the budget is spent; sleep the spacing
    before every call after the first;
  - call `api.reqAccountAddByRSSRemoteItemResolve({ feed_guid, feed_url: null })` (an
    `AddByRSSRemoteItemRef`) through `requestWithMobileAuthRefresh(context, …)`;
  - an answer → `decideListedFeedResolve(answer, createUuid)`:
    - `retry_later` → `listedFeedResolveRetries.set(guid, nextListedFeedResolveRetry(listedFeedResolveRetries.get(guid), Date.now()))`,
      `deferred += 1`; no row write and no `afterArtistRelationsChanged()` (nothing on screen
      changed);
    - any other action → `listedFeedResolveRetries.delete(guid)`,
      `applyListedFeedResolve(group.keys, action)`, `applied += 1`;
  - a 429 (`getRateLimitRetryAfterMs(error)` not null) → when the wait fits the remaining budget,
    sleep it and call the same group again; otherwise stop;
  - a 400 → `listedFeedResolveRetries.delete(guid)` and `no_match` for the group (a ref the route
    refuses will not change); `applied += 1`;
  - any other answer with an HTTP status (503 index provider unavailable, 5xx) → stop and leave
    the rest for a later run; retry entries are not touched;
  - an error with no HTTP status (offline, unreachable) → rethrow, so the sync queue parks or
    logs it like every other job.
  - `left` = groups neither settled nor deferred when the run ends.

### 4e. Errors

Failures go through the existing `recordRefreshFailure` with `{ feedUrl: album.feedUrl, requestId:
null }` for device albums (plan 31 made the request id nullable) and `LISTED_FEEDS_JOB_KIND`.
The resolve job records nothing per guid in the error log: its stops and its `retry_later`
answers leave rows in place, and its rethrown errors reach the sync queue's error log.

## 5. 429 reset time — `apps/mobile/src/lib/rateLimit/handleRateLimitMessage.ts`

Add `export const getRateLimitRetryAfterMs = (error: unknown): number | null`: null unless
`getErrorResponseStatus(error) === 429`; then `timeUntilResetMs` from the body, else
`retry_after_seconds * 1000`, else `minutesRemaining * 60000`, else 60000 (the window of every
per-minute limit). Never below 1000. Reuse the guards the file already imports.

## 6. Sync — `syncJobKinds.ts`, `syncJobs.ts`, `syncJobPlan.ts`, `syncQueue.test.ts`

- `syncJobKinds.ts`: add `'add-by-rss-listed-resolve'` after `'add-by-rss-listed-feeds'` in
  `SYNC_JOB_KINDS`, with label `'sync.job.rss_feeds'` in `SYNC_JOB_LABEL_KEYS`. No new copy.
- `createAddByRssListedFeedsJob`: no account or membership check. Compute
  `resolveAddByRssParsePath(account, { isAuthenticated: authContext.accessToken !== null })` from
  `accountRepository.getSnapshot()`, call `runListedFeedWork(authContext, parsePath, sleep, signal)`.
  - When `deviceAlbumsLeft > 0` and `deviceAlbumsStored > 0`, enqueue another listed-feed job with
    the same key. `syncQueue.insert` dedupes only against pending jobs and leaves the running one
    alone, so the same key is accepted. A run that stored nothing does not re-enqueue, so a host
    that keeps failing cannot loop.
  - Then, when `await addByRssRepository.hasListedFeedResolveWork(authContext)`, enqueue the
    resolve job.
- New `createAddByRssListedResolveJob(deps, priority)`: kind and key `'add-by-rss-listed-resolve'`,
  timeout `ADD_BY_RSS_LISTED_RESOLVE_TIMEOUT_MS = 90000` (above the 80 s work budget). Returns
  unless the parse path is `'device'`; runs `runListedFeedResolveWork(authContext, sleep, signal)`.
  When `applied > 0`: enqueue the listed-feed job if `hasListedFeedWork(authContext)` (new
  `add_by_rss` albums to parse, directory artwork to fill), and enqueue the resolve job again if
  `left > 0`. A run that applied nothing does not re-enqueue. Deferred guids are not in `left`;
  they come back through the refresh or listed-feed job once due (§ Decisions fixed here).
- Refresh job (`createAddByRssRefreshJob`, as plan 33 leaves it): after the device parse jobs are
  enqueued, when the parse path is `'device'` and `hasListedFeedWork(authContext)` or
  `hasListedFeedResolveWork(authContext)`, enqueue the listed-feed job. It runs after the parse
  jobs, and it picks up work left when the app closed mid-run.
- Doc comments: the listed-feed job runs for every parse path and parses albums on this device
  only signed out; the resolve job paces public resolve calls for guid-only albums, waits out a
  429, and leaves an album whose directory channel is not ready for a later run once its retry
  time comes.
- Keep the `evaluateFeatureAccess` / `deriveMembershipState` imports; `createAutoDownloadEvaluateJob`
  still uses them.
- `syncJobPlan.ts`: the `'add-by-rss-listed-feeds'` trigger returns the background job whether or
  not signed in (delete its signed-out early return and update its comment).
- `syncQueue.test.ts`: the test `'plans the one album-sync job for the listed-feeds trigger, and
  nothing signed out'` becomes `'plans the one album-sync job for the listed-feeds trigger, signed
  in or out'`, with the signed-out call expecting the same single job. The test `'plans only
  roots, leaving discovered work to the job that finds it'` also asserts
  `not.toContain('add-by-rss-listed-resolve')`, signed in and signed out: the resolve job, and
  the retry of an album whose directory channel was not ready, are discovered work that the
  refresh and listed-feed jobs enqueue, never a planned root.

## 7. Fixtures and Maestro

Static fixtures served by the test-assets server at `http://localhost:2111/e2e/add-by-rss/…`
(everything under `tools/test-assets/assets/e2e/` is committed and served from `/e2e/`):

- `album.xml`: an RSS 2.0 feed with the podcast namespace, `<podcast:medium>music</podcast:medium>`,
  `<podcast:guid>e2e0de71-0000-4000-8000-0000000000b3</podcast:guid>`, title
  `E2E Device Album`, one item `E2E Device Track` with enclosure
  `http://localhost:2111/e2e/audio/e2e-addbyrss-fresh-60s-440hz.mp3` (audio/mpeg), a fixed guid
  and pubDate.
- `artist.xml`: `<podcast:medium>publisher</podcast:medium>`, guid
  `e2e0de71-0000-4000-8000-0000000000a3`, title `E2E Device Artist`, no items, and three
  channel-level `<podcast:remoteItem>` elements (the same shape the API's E2E artist fixture
  models in `accountAddByRSSParse.ts`): `feedGuid="e2e0de71-0000-4000-8000-0000000000b3"
  feedUrl="http://localhost:2111/e2e/add-by-rss/album.xml" medium="music"`, then the seeded
  directory album `feedGuid="11111111-2222-4333-8444-555555555501"
  feedUrl="https://e2e-seed-music.example/album.xml" medium="music"` (sync with
  `E2E_MUSIC_ALBUM_PODCAST_GUID` / `E2E_MUSIC_FEED_URL` in `tools/web/seed-e2e.mjs`), then a
  guid-only `feedGuid="e2e0a5f0-0000-4000-8000-0000000000f1" medium="music"` (the API's
  `E2E_ADD_BY_RSS_REMOTE_ITEM_NOT_FOUND_FEED_GUID`, which resolve answers `not_found` offline),
  so the flow runs the resolve job end to end without a live index provider.

Check how the device parse handles a feed with no items before relying on it; if it rejects an
empty publisher feed, give the artist one item with the same enclosure.

New `apps/mobile/e2e/add-by-rss-anonymous-artist.yaml`, modeled on `add-by-rss-artist.yaml` up to
its `add-by-rss-artist-albums` screenshot, and on plan 32's `add-by-rss-anonymous.yaml` for the
signed-out start (no `shared/login-seeded-user.yaml`). Header comment: signed out, the device
parses the artist, matches the directory album through the public lookup, resolves the guid-only
album through the public resolve route, and parses the listed album itself. Steps: add
`http://localhost:2111/e2e/add-by-rss/artist.xml`; select the artists media type; open
`E2E Device Artist`; wait (`TIMEOUT_SLOWER`) for `add-by-rss-artist-album-row-0` with text
`E2E Device Album`; assert `add-by-rss-artist-album-row-1` with text `E2E Music Album`; screenshot
`add-by-rss-anonymous-artist-albums`. Do not assert the unresolved guid-only row; whether the
screen shows unresolved listings is not this plan's change.

Registration, the same three places plan 32 registers `add-by-rss-anonymous`:
`scripts/mobile/e2e-test.sh` (`flow_needs_e2e_api` and `flow_needs_test_assets`, after
`add-by-rss-anonymous`), `apps/mobile/e2e/HOW-TO-RUN.md` § Complete area list (iOS, Android, and
both-platforms lines after `add-by-rss-anonymous`), and
`docs/testing/FULL-REPO-VERIFICATION-COMMANDS.md` (after `add-by-rss-anonymous`).

## Tests

- `packages/parser-mapping/src/addByRSS/publisherListedFeeds.test.ts`: the mapped-feed entry point
  returns the same refs as the FeedObject entry point for a feed whose bundle carries the same
  remote items and guid; it skips the feed's own guid.
- `apps/mobile/src/lib/addByRss/deviceListedFeeds.test.ts`: lookup refs keep order and send
  `item_guid: null`; `channel` results fill the directory map by lowercased guid; a
  `provider_feed` result fills the URL map only for a channel-level, URL-less, valid-UUID ref;
  `planDeviceListedFeeds` with `matches: null` makes URL refs `add_by_rss` with `device:` ids and
  URL-less refs `unresolved`; `isDeviceListedRequestId`; `isResolvableListedRef` refuses an
  item-level ref, a ref with a URL, and a guid that is not a reliable UUID.
- `apps/mobile/src/data/repositories/addByRssListedFeeds.test.ts`: `decideListedAlbumStore`
  returns `unchanged` for `not_modified` with no mapped feed, and still `update-existing` for
  `not_modified` with a mapped feed and a stored row; `listedFeedNeedsResolve` is true only for
  `no_feed_url` rows that pass `isResolvableListedRef`, and false after `resolve_no_match`;
  `groupListedFeedResolveWork` makes one group for a guid two artists list (case-insensitive);
  `decideListedFeedResolve` maps `channel` to `directory`, `provider_feed` to `add_by_rss` (with
  a `device:` id and the canonical URL), `not_found` to `no_match`, a provider feed without a
  usable URL to `no_match`, and `directory_unavailable` to `retry_later` (not `no_match`).
  Backoff: chaining `nextListedFeedResolveRetry` from `undefined` gives delays of 60000, 120000,
  240000, 480000, 960000, then 1800000 (the cap, not 1920000) for attempts 1–6, and the seventh
  answer gives `nextAttemptAtMs: null`.
  `isListedFeedResolveDue` is true for no entry, false before the due time, true at it, and
  false for `nextAttemptAtMs: null`.
- `apps/mobile/src/lib/rateLimit/handleRateLimitMessage.test.ts` (new): `getRateLimitRetryAfterMs`
  is null for a non-429 error; reads `timeUntilResetMs`; falls back to `retry_after_seconds`, then
  `minutesRemaining`, then 60000; never answers below 1000.
- `apps/mobile/src/sync/syncJobKinds.test.ts`: `getSyncLogLabelKey('add-by-rss-listed-resolve')`
  is `'sync.job.rss_feeds'`.
- `apps/mobile/src/sync/syncQueue.test.ts`: the renamed listed-feeds trigger test.
- Maestro: `apps/mobile/e2e/add-by-rss-anonymous-artist.yaml` (new). `add-by-rss-artist.yaml`
  (signed-in member, server path) is the server-path regression check and does not change.
- No repository unit test: `addByRssRepository.ts` runs on `expo-sqlite`; its new branches are
  covered by the pure helpers and the Maestro flow.

## Release scratchpad

## Add by RSS artists list their albums when parsed on the phone

- Surfaces: mobile
- Change: signed out, an Add by RSS artist feed parsed on the device now lists its albums. The device builds the listings from the feed, matches directory albums through the public remote-item lookup (100 references per request), and fetches each listed Add by RSS album itself, using the album's own stored credentials, or the artist's when the album is on the same host. Albums the artist names only by feed guid are looked up one at a time through the public resolve route in background sync, at most two per second; on a rate-limit answer the phone waits for the reset and tries again, and each album appears as its answer arrives. An album Podverse does not know is not asked again until the artist feed changes. An album whose Podverse page is not ready yet is asked again on a later sync, waiting 1, 2, 4, 8, 16, then 30 minutes between tries, up to seven tries per app launch. A private artist feed's listed albums are never sent to Podverse; they are fetched from the feed host only. The background album job now runs signed out, and a large artist finishes over several runs. Signed in, artists are still listed by the server, and feeds kept by the signed-out user are skipped while hidden.
- Who notices: signed-out mobile users who add an artist feed
- Operator steps: none
