**Cursor model:** Opus 5.5 · **Reasoning:** high

# 31 — Device parse in the Add by RSS repository

Two repository entry points that run the device parse and store what it returns in the same
`add_by_rss_feed` rows, through the same `upsertFeed`, as the server parse: one for an
interactive parse (add, feed check, credentials check) and one for a background refresh of a
single feed. No screen or sync job calls them yet; plans 32 and 33 do.

## Rows

R5, R7

## Runs after

30, and 21 (creates `apps/mobile/src/lib/addByRss/deviceParse.ts`, `parseAddByRssFeedOnDevice`)

## Files

apps/mobile/src/data/repositories/addByRssRepository.ts
apps/mobile/src/data/repositories/addByRssDevicePath.ts
apps/mobile/src/data/repositories/addByRssDevicePath.test.ts
apps/mobile/src/lib/addByRss/addByRssErrorLog.ts
apps/mobile/src/lib/addByRss/addByRssErrorLog.test.ts
apps/mobile/src/sync/syncJobKinds.ts
apps/mobile/src/sync/syncJobKinds.test.ts

## Parity source

`parseNow` and `applyRefreshResult` in `addByRssRepository.ts` are the source of truth. The
device versions differ only in where the result comes from (`parseAddByRssFeedOnDevice` instead
of `enqueueParseRequest` + `pollAddByRssParseStatus`), in carrying the conditional cache, and in
having no request id. Everything they store — the record from `buildAddByRssFeedRecord`, the
credential status from `resolveAddByRssCredentialStatus`, the keep-the-bundle rule, and
`storeArtistRelations` — is the same code path.

## The device parse call (seam, area B)

```ts
import { parseAddByRssFeedOnDevice } from '../../lib/addByRss/deviceParse';

const result = await parseAddByRssFeedOnDevice({
  conditionalCache, // AddByRssDeviceCache | null, from plan 30
  credentials,      // AddByRssCredentials | null
  feedUrl,
  signal,           // AbortSignal | undefined
});
// result: AddByRssPollResult & { conditionalCache: AddByRssDeviceCache | null }
```

This call shape (one object argument, `conditionalCache` in and out) is the one this area asks
area B to adopt (Notes for later prompts in this step's final message). If B's landed function
differs only in names, adapt these call sites to B's names; do not change B's file.

A thrown error (Offline Mode or abort) propagates to the caller. A host that answered is a
returned result with `status: 'failed'`, and an unreachable host is a returned result with
`status: 'failed'` and `failureReason: 'network'`.

## 1. Job kind for device refreshes — `apps/mobile/src/sync/syncJobKinds.ts`

Add `'add-by-rss-device-parse'` to `SYNC_JOB_KINDS` right after `'add-by-rss-parse'`, and
`'add-by-rss-device-parse': 'sync.job.rss_feeds'` to `SYNC_JOB_LABEL_KEYS` after the
`'add-by-rss-parse'` entry. No new catalog copy: the indicator already says what it says for the
server refresh. Plan 33 builds the job; this plan needs the kind for the error log.

## 2. Error log rows without a request id — `addByRssErrorLog.ts`

- `ParseFailureInput.requestId` becomes `string | null`. When null, `details` omits
  `request_id` (details values are strings; see `SyncEventLogDetails` in
  `apps/mobile/src/data/repositories/syncEventLog.ts`).
- `http_status`: use `String(result.httpStatus)` when `result.httpStatus` is a number, else the
  existing `hostStatusFromServerError(result.serverError)`. Add `'httpStatus'` to the `Pick`.
- Update the module comment so it is true for both paths: the feed is fetched and parsed by the
  Podverse server for a signed-in session or, signed out, by this device; most failures are
  still the creator's host.
- `addByRssErrorLog.test.ts`: add a case with `requestId: null` (no `request_id` key) and one
  where `httpStatus: 404` fills `http_status` with no `serverError`.

## 3. `recordRefreshFailure` takes a feed and an optional request id

In `addByRssRepository.ts`, change the first parameter of `recordRefreshFailure` from
`AddByRssRefreshTicket` to `{ feedUrl: string; requestId: string | null }`. Existing callers
pass a ticket, which still fits. The dedupe key stays feed URL + code + message.

## 4. Shared write after a parse result

Extract the body of `parseNow` after the poll into a private function above the
`addByRssRepository` object, so the server and device interactive parses share it:

```ts
const storeInteractiveParseResult = async (
  context: MobileAuthRequestContext,
  feedUrl: string,
  credentials: AddByRssCredentials | null,
  result: AddByRssPollResult,
  options?: { followed?: boolean }
): Promise<void> => { … }
```

It is exactly the current `parseNow` code from `const existingFeed = …` through
`storeArtistRelations(…)`. `parseNow` becomes enqueue → poll → `storeInteractiveParseResult` →
return `{ requestId, result }`. Behavior of `parseNow` does not change.

## 5. `parseNowOnDevice`

Add to the `addByRssRepository` object right after `parseNow`:

```ts
parseNowOnDevice: async (
  context: MobileAuthRequestContext,
  feedUrl: string,
  credentials: AddByRssCredentials | null,
  options?: { followed?: boolean; signal?: AbortSignal }
): Promise<{ requestId: null; result: AddByRssPollResult }> => { … }
```

1. `const state = await addByRssRepository.getDeviceFetchState(feedUrl);`
2. Call the device parse with `conditionalCache: state?.cache ?? null`, the credentials, the URL,
   and `options?.signal`.
3. `await storeInteractiveParseResult(context, feedUrl, credentials, result, { followed: options?.followed })`
   — pass `followed` only when set, as `parseNow` does.
4. `await addByRssRepository.setDeviceFetchState(feedUrl, { cache: deviceCacheToStore(result), checkedAtMs: Date.now() })`
   with the rule in section 7. This runs after step 3 so the row exists for a new feed.
5. Return `{ requestId: null, result }`.

Doc comment: the device counterpart of `parseNow` for a signed-out device (the only case
`resolveAddByRssParsePath` answers `'device'`). A follow it writes is stamped as the signed-out
user's by `upsertFeed` (plan 30). No Podverse API request is made for the feed itself;
credentials go only to the feed host.
`context` is still taken because `storeArtistRelations` uses it for its directory lookups.

## 6. `refreshFeedOnDevice`

Add right after `applyRefreshResult`:

```ts
refreshFeedOnDevice: async (
  context: MobileAuthRequestContext,
  feedUrl: string,
  options?: { signal?: AbortSignal }
): Promise<boolean> => { … }
```

Returns true when a new bundle was stored.

1. `state = await getDeviceFetchState(feedUrl)`. Null, or `state.followed === false` → return
   false (listed-only rows belong to the listed-feed work, not to refresh-all).
2. `credentials = await addByRssCredentialStore.getForCurrentAccount(feedUrl)`. When
   `state.requiresCredentials && credentials === null` → return false without fetching (the row
   already sits in the needs-credentials section; `requestRefreshAll` skips the same feeds).
3. Device parse with `conditionalCache: state.cache`, credentials, URL, `options?.signal`.
4. `setDeviceFetchState` per section 7.
5. From here mirror `applyRefreshResult` from `const { mappedFeed, preview } = result;`:
   - read `existingFeed` (no `ensureLocalFeedFromFollow`: the row exists);
   - `credentialStatus` from `resolveAddByRssCredentialStatus` with
     `current: existingFeed?.requiresCredentials === true`;
   - `mappedFeed === null`: write `credentialStatus` when non-null; when
     `!isExpectedMissingCredentials(result)` and `result.status !== 'not_modified'`, call
     `recordRefreshFailure({ feedUrl, requestId: null }, result, 'add-by-rss-device-parse')`;
     return false. (`buildAddByRssParseFailureLog` already returns null for `not_modified`; the
     explicit check keeps the intent readable.)
   - otherwise `previousPublisherState`, `buildAddByRssFeedRecord`, `upsertFeed({ ...record, ...credentialStatus }, mappedFeed)`
     — **without** `followed: true`. The server path writes it because every ticket is a server
     follow; here the row is already followed, and writing it would undo an unfollow that landed
     while the fetch ran.
   - `storeArtistRelations(context, feedUrl, result, previousPublisherState)`; return true.

Doc comment: same keep-the-stored-bundle rule as `applyRefreshResult`, and why `followed` is not
written (which also leaves the row's signed-out ownership as it is). Only the signed-out device
refresh job calls it (plan 33).

## 7. Which conditional cache to store

Exported pure helper in `apps/mobile/src/data/repositories/addByRssDevicePath.ts` (plan 30's
module), imported by the repository:

```ts
export const deviceCacheToStore = (result: {
  conditionalCache: AddByRssDeviceCache | null;
  mappedFeed: unknown;
  status: string;
}): AddByRssDeviceCache | null | undefined => …
```

- `status === 'parsed'` with `mappedFeed !== null` → `result.conditionalCache` (null clears).
- `status === 'not_modified'` → `result.conditionalCache ?? undefined` (keep the stored cache
  unless the host sent a new validator).
- anything else → `undefined` (a failure leaves the cache that matches the stored bundle).

## Tests

- `apps/mobile/src/sync/syncJobKinds.test.ts`: `getSyncLogLabelKey('add-by-rss-device-parse')`
  is `'sync.job.rss_feeds'`, beside the existing `add-by-rss-listed-feeds` assertion.
- `apps/mobile/src/lib/addByRss/addByRssErrorLog.test.ts`: the two cases in section 2.
- `apps/mobile/src/data/repositories/addByRssDevicePath.test.ts`: three cases for
  `deviceCacheToStore` (parsed with a bundle passes the cache through, including null;
  not_modified with no new cache returns undefined; failed returns undefined).
- No repository test: `addByRssRepository.ts` runs on `expo-sqlite` and has no Vitest suite; its
  new logic is the pure helpers above and in plan 30.
- Maestro coverage of the device parse is in plan 32 (`add-by-rss-anonymous.yaml`).

## Release scratchpad

none
