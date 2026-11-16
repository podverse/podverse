**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 42 — Run the v4 download carryover: match, adopt, or delete (mobile)

## Rows

R1, R2, R3, R4, R5, R6, R8, R10, R11, R16, R17, R18, R19, R20, R22, R25

- R1, R2, R6, R8, R16: answered in § Answers.
- R3, R4, R10: each staged file is matched to a directory episode, else kept on that directory
  show, else an Add by RSS feed, by the decisions in plan 41, and adopted.
- R5 (directory half): an adopted directory file, including one plan 41 marks `directory_kept`,
  is a `complete` download row with a playable item on that show.
- R25: signed in, a new Add by RSS show uses the account follow when the membership can accept it
  and the account is under its feed cap. A refusal keeps the file playable in Downloads and does
  not create a signed-out feed. Signed out, the phone keeps a followed feed. The pass runs either
  way and does not wait for Continue Migration.
- R11, R17, R22: unmigratable files are deleted with no screen, only for plan 41's definite reasons.
- R18: one error-log entry counts every outcome.
- R19, R20: a file whose lookup has not answered, or that a pass could not reach while offline,
  stays on disk and in `pending` or `waiting`.

## Runs after

10, 20, 21, 30, 31, 32, 40, 41

## Files

apps/mobile/src/migration/v4/legacyLookupRequest.ts
apps/mobile/src/migration/v4/legacyLookupRequest.test.ts
apps/mobile/src/migration/v4/runV4DownloadCarryover.ts
apps/mobile/src/migration/v4/runV4Carryover.ts
apps/mobile/src/downloads/downloadManager.ts
apps/mobile/src/downloads/README.md
apps/mobile/src/screens/episode/EpisodeDetailScreen.tsx
apps/mobile/src/sync/syncJobs.ts
apps/mobile/vitest.config.ts

`syncJobs.ts` and `downloadManager.ts` are large: work by the symbols named below.

## Answers

- **R1 — Does the migration account for downloaded media files?** Not before this set. The
  carryover reads four AsyncStorage keys (`V4_LOCAL_STATE_KEYS` in `readV4LocalState.ts`) and
  never reads `DOWNLOADED_PODCASTS`, `DOWNLOADING_EPISODES`, or a media file. v5 lists only rows in
  its `download` table, whose files live under `documentDirectory/downloads/`. v4's files stay
  where v4 wrote them (top level of the documents folder on iOS; the app's external files folder,
  the documents folder, or a listener-chosen folder on Android), listed nowhere and not deletable
  from the app.
- **R2 — Will they roll over gracefully?** Today no: they keep holding storage, unseen. With this
  set, best effort: each file becomes a directory download (including an episode the directory
  show does not list, kept on that show), an Add by RSS episode (a local episode when the feed
  no longer lists it), or is deleted and counted. A signed-in Add by RSS file whose account
  cannot follow the show stays a finished download in My Library → Downloads.
- **R6 — Is it properly accounted for?** It is once plans 10–42 land: the phone reads what v4
  stored (plan 21), finds each file (plan 20), asks the server which episode it is (plan 10),
  keeps Add by RSS episodes even when the feed drops them (plans 30–32), and this plan settles
  every file and logs the counts.
- **R8 — Is it possible?** Yes. The in-place update keeps the app sandbox, and v4 stored each
  file's episode id, podcast id, guid, media URL, titles, and usually the feed URL.
- **R16 — Flat out not possible?** No; it is possible. Two limits: a file in an Android folder
  this app can no longer read can be neither moved nor deleted, so it is only counted; and an
  unfinished v4 download is deleted rather than resumed.

## Reuse

- `runV4Carryover.ts` is the pattern for the pass: `inFlight` sharing, `waitingRetriedThisSession`,
  chunked public lookups with a rate-limit wait budget, `requestWithoutMobileAuth`, one
  `reconciled` error-log entry.
- `downloadManager.enqueue` is the parity source for a download row (record fields,
  `playableItemRepository.put('download', item)`, `attachChannelToDownloads`).
  `adoptCompletedFile` below reuses its private helpers instead of copying them.
- Add by RSS adoption is plan 30's `addByRssRepository.adoptDownloadedEpisode`. Signed out, a
  missing feed row comes from the existing `addByRssRepository.addSignedOutFeedStub`. Signed in,
  a missing feed row is the account follow (`reqAccountFollowAddByRSSChannel`), then
  `upsertFeed` while the session is signed in. This plan edits neither repository. The membership
  check is `evaluateFeatureAccess('add_by_rss_add', deriveMembershipState(account))` from
  `@podverse/helpers`, the same pair `addByRssLoginSettle.ts` uses. The cap read is
  `fetchAccountAddByRssFeedLimit`. A refused follow is classified with
  `classifySignupCarryFollowError` from `addByRssDevicePath.ts`.
- The Add by RSS directory match reuses `buildAddByRssMatchRefs`
  (`src/lib/addByRss/directoryMatch.ts`) and `api.reqChannelAddByRSSMatch`, the same route
  promotion uses.
- File work is plan 20's `v4DownloadFiles.ts`; nothing here joins a v4 path by hand.

## 1. Shared lookup request — `src/migration/v4/legacyLookupRequest.ts` (new)

Move the retry loop out of `requestLookupChunk` in `runV4Carryover.ts` so both passes share it:

```ts
export type LegacyLookupResult<T> = { kind: 'ok'; value: T } | { kind: 'http'; status: number };

/**
 * One public request from the v4 carryover. A rate-limit answer is waited out once when the wait
 * fits `remainingMs()`. Any other HTTP answer, or a rate limit it cannot wait for, returns `http`.
 * A network or Offline Mode error is thrown, so the caller leaves its rows for a later pass.
 */
export const requestLegacyLookup = async <T>(
  send: () => Promise<T>,
  remainingMs: () => number,
  wait: (ms: number) => Promise<void> = waitFor
): Promise<LegacyLookupResult<T>>;
```

Body: the existing loop (`getRateLimitRetryAfterMs`, one wait when `!waited && waitMs <=
remainingMs()`), returning `{ kind: 'http', status: getErrorResponseStatus(error) }` when the
status is defined, else rethrowing. `waitFor` is the module's `setTimeout` promise. No Expo or
auth import: callers pass `send`, so the module is unit-testable.

In `runV4Carryover.ts`, `requestLookupChunk` becomes a call to `requestLegacyLookup(() =>
requestWithoutMobileAuth((api) => api.reqLegacyPodcastLookup({ … })), remainingMs)` that returns
`null` for `http` and the answers array for `ok` (null when not an array). Delete its local `wait`
and any import left unused. The signed-out subscription pass behaves exactly as before.

## 2. Recording an adopted file — `downloadManager.adoptCompletedFile`

Add to the `downloadManager` object in `src/downloads/downloadManager.ts`, directly after
`enqueue:`:

```ts
  /**
   * Record a media file already inside `downloads/` as a finished download of `item` (the v4
   * download carryover). Returns `exists` and writes nothing when the episode already has a queued,
   * downloading, paused, or complete row for another file; the caller deletes its own file.
   * Returns `ineligible` when neither the item nor `fallbackSource` names a progressive source.
   */
  adoptCompletedFile: async (input: {
    item: DTOItem;
    fileName: string;
    byteSize: number | null;
    fileExtension: string | null;
    channel: { channelIdText: string | null; channelTitle: string | null };
    fallbackArtworkUrl: string | null;
    fallbackSource: DownloadSourceSelection | null;
  }): Promise<'adopted' | 'exists' | 'ineligible'>
```

1. `await ensureHydrated()`.
2. `existing = downloadStore.get(input.item.id_text)`. When its status is `queued`,
   `downloading`, `paused`, or `complete`: return `adopted` when it is `complete` with `filePath
   === input.fileName` (an earlier pass already wrote it), else `exists`.
3. `eligibility = isItemDownloadable(input.item)`; `source = eligibility.ok ? eligibility.source
   : input.fallbackSource`; null → `ineligible`.
4. `byteSize = input.byteSize ?? await readDownloadedByteSize(absoluteDownloadPath(input.fileName)
   ?? '')`.
5. `channel = mergeDownloadChannelIdentity([input.channel, channelFromItem(input.item)])`.
6. Build the record like `enqueue` does, with `status: 'complete'`, `filePath: input.fileName`,
   `byteSize` and `bytesDownloaded` = `byteSize`, `artworkUrl: artworkFromItem(item) ??
   input.fallbackArtworkUrl`, `fileExtension: input.fileExtension ?? source.fileExtension`,
   enclosure fields and `mediaType` from `source`, `enclosureUrlHash: hashEnclosureUri(source.uri)`,
   `errorReason: null`, `dismissedFromList: false`.
7. Write in this order, each awaited: `playableItemRepository.put('download', item)`,
   `downloadsRepository.upsert(record)`, then `downloadStore.put(record)`; when both channel fields
   are non-null, `downloadsRepository.attachChannelToDownloads(...)` with errors ignored; then
   `pinShowNotesForDownload(item.id_text)`. The playable row goes first so the download never
   lists without an item to play. Never call `pumpQueue`.

`DownloadSourceSelection` is a type import from `./downloadEligibility`.

## 3. The pass — `src/migration/v4/runV4DownloadCarryover.ts` (new)

```ts
export type V4DownloadCarryoverRunDeps = {
  /** The next Add by RSS refresh may ask the directory match without waiting out the hour. */
  clearDirectoryMatchPacing: () => void;
  /** Queues one more pass; called when this pass stopped at its time budget with rows left. */
  enqueueContinuation: () => void;
  /** The queue's auth context. `accessToken === null` is signed out. */
  getAuthContext: () => MobileAuthRequestContext;
  /** The job's signal; the queue aborts it at the job timeout. */
  signal: AbortSignal;
};

export const shouldScheduleV4DownloadCarryover = (): Promise<boolean>;
export const runV4DownloadCarryover = (deps: V4DownloadCarryoverRunDeps): Promise<void>;
```

`MobileAuthRequestContext` is a type import from `../../data/repositories/types`.

Module state and constants: `PASS_BUDGET_MS = 40000` (no new file work starts after this),
`LOOKUP_WAIT_BUDGET_MS = 15000`, `waitingRetriedThisSession = false`, `androidJobsRemoved =
false`, `inFlight: Promise<void> | null`. `runV4DownloadCarryover` shares one in-flight pass like
`runV4Carryover`.

`shouldScheduleV4DownloadCarryover`: true when `listByStatus(['pending'])` is non-empty; else
false when `waitingRetriedThisSession`; else true when `listByStatus(['waiting'])` is non-empty.
It does not look at the session or at `v4CarryoverRepository.isCopyAllowed()` (§ 6).

A row's file is in one of two states during a pass:

```ts
type CarriedFile =
  | { kind: 'found'; located: Extract<V4LocateResult, { kind: 'found' }> }
  | { kind: 'adopted'; fileName: string; byteSize: number | null };
```

Helpers inside the module (all statuses go through `v4DownloadCarryoverRepository`):

- `retry(row)`: `bumpAttempts(fileKey)`, then `setStatus(fileKey, 'waiting')`.
- `settle(row, status)`: `setStatus`; when the status is in `V4_DOWNLOAD_SETTLED_STATUSES` set
  `settledAny = true`. For `missing`, `deleted`, and `duplicate`, also `setAdoptedFileName(fileKey,
  null)` when it was set.
- `deleteCarried(row, file, status: 'deleted' | 'duplicate')`: `found` →
  `deleteV4DownloadFile(file.located, roots)`; `adopted` →
  `downloadsRepository.deleteStoredFile(file.fileName)` (best effort, counts as deleted). Success →
  `settle(row, status)`. A `failed` delete → `settleV4DownloadFailure(row, 'delete_failed')`:
  `retry` or `settle(row, 'delete_failed')`.
- `failure(row, file, kind)`: `settleV4DownloadFailure` → `retry(row)`, `settle(row,
  outcome.status)`, or `deleteCarried(row, file, 'deleted')`.
- `budgetLeft()`: false when `deps.signal.aborted` or `Date.now() - startedAt >= PASS_BUDGET_MS`
  (set `budgetReached = true` in the second case). Checked before every row of steps D and G.

### Steps

**A. Load.** `includeWaiting = !waitingRetriedThisSession`; `rows = listByStatus(includeWaiting ?
['pending', 'waiting'] : ['pending'])`; none → return. `pendingAtStart` = count with status
`pending`. When a row has `source === 'downloading'` and `!androidJobsRemoved`, `await
removeUnfinishedAndroidDownloadJobs()` and set the flag, before any locate, so a v4 transfer
cannot finish into a folder after its row is settled. `roots = await
resolveV4DownloadRoots(await v4DownloadCarryoverRepository.getSharedFolder())`; null → return.
`await downloadManager.hydrate()`. This pass does not list folders. Orphan rows exist only after
plan 21's `saveRead`, which runs only when `hasRead()` is true. A missing `read_at` means there
are no rows, so this pass does not scan to invent them.

**B. Locate**, each row in order (`locateV4DownloadFile({ adoptedFileName, fileKey, orphanRoot },
roots)`):

- `not_found` → `settle(row, 'missing')`.
- `unreachable` → `failure(row, null, 'unreachable')` (no file to delete; `settleV4DownloadFailure`
  never returns a delete for `unreachable`).
- `already_adopted` → locate again with `adoptedFileName: null`. When that finds the source, the
  earlier copy did not finish: `downloadsRepository.deleteStoredFile(row.adoptedFileName)` and use
  `{ kind: 'found' }` with the new result. Otherwise use `{ kind: 'adopted', fileName, byteSize }`
  from the first result.
- `found` → `{ kind: 'found', located }`.

**C. Decide locally.** `decideV4DownloadBeforeNetwork(row)` for every located row: `delete` rows
go to step D; `lookup` and `match` rows wait for step E; `add_by_rss` rows join the adoption list
for step G.

**D. Local deletions.** `deleteCarried(row, file, 'deleted')` for each. These need no network, so
an offline phone still frees space held by orphans and unfinished downloads.

**E. Requests.** Skip when there are no `lookup` or `match` rows.

- Episode lookup: one ref per distinct `episode_id` (first row wins), chunks of
  `LEGACY_EPISODE_LOOKUP_MAX_EPISODES`, `install_id` from `getOrCreateInstallationId()`, each
  through `requestLegacyLookup(() => requestWithoutMobileAuth((api) =>
  api.reqLegacyEpisodeLookup({ episodes, install_id })), remainingMs)` with one
  `LOOKUP_WAIT_BUDGET_MS` budget for the whole step. Index answers by `episode_id`. After an
  `http` result, send no further lookup chunk; every row not yet answered gets `undefined`.
- Add by RSS match: `planV4AddByRssMatch(matchRows)`, then `buildAddByRssMatchRefs(feeds)`; each
  chunk through `requestLegacyLookup(() => requestWithoutMobileAuth((api) =>
  api.reqChannelAddByRSSMatch({ feeds: chunk })), remainingMs)`. Index `response.matches` by
  `feed_url`. After an `http` result, every `feed_url` in that chunk and in every later chunk is
  failed. A feed the chunker left out (credentials or an unmatchable URL) counts as answered with
  no match.
- A thrown error (offline, Offline Mode, connection refused) ends step E: keep it as
  `networkError` and skip step F. The `lookup` and `match` rows stay as they are; step G still
  adopts step C's `add_by_rss` rows. Signed out, those rows need no request. Signed in, a new
  feed still asks the account follow inside step G; a throw there is the same `networkError`.
- When step E finished or was skipped, and any loaded row had status `waiting`, set
  `waitingRetriedThisSession = true`. `waiting` rows then get one try per app process, so five
  failed tries take five launches, not five syncs.

**F. Decide after requests.** `decideV4DownloadAfterLookup(row, answers.get(ref.episode_id))` for
lookup rows; `decideV4DownloadAfterMatch(row, failed ? { kind: 'failed' } : { kind: 'answered',
match: matches.get(feedUrl) ?? null, itemIndex })` for match rows, using the row's entry in
`positions`. `retry` → `retry(row)`. `delete` rows run first in step G. Adoption rows then run
`directory`, then `directory_kept`, then `add_by_rss` (step C's rows and step F's rows together,
in staged order). There is no `channel_feed` decision.

**G. File work.** Deletions: `deleteCarried(row, file, 'deleted')`. Then each adoption row, by its
current decision. A `directory` row whose item fetch is HTTP 404 continues in the same iteration
as `directory_kept`. Any other item-fetch HTTP result continues as `retry`. Do not call
`decideV4DownloadAfterChannelFetch`. There is no `channel_feed` branch. A row does not fall
through from `directory` to `add_by_rss`.

- `directory`: item = `playbackContentRepository.getStoredItemByIdText(itemIdText)`, else
  `requestLegacyLookup(() => requestWithoutMobileAuth((api) => api.reqItemGetByIdOrIdText(id)),
  () => 0)`. `http` 404 → `decideV4DownloadAfterItemFetch(row, target, 'gone')`; other `http` →
  `'failed'` (that decision is `retry` at every attempt count, including the last); continue with
  that decision. With an item:
  1. When `downloadStore.get(item.id_text)` is `queued`, `downloading`, `paused`, or `complete`
     and its `filePath` is not this row's `adoptedFileName` → `deleteCarried(row, file,
     'duplicate')`. Done.
  2. `fileExtension = v4AdoptedFileExtension(row)`, else the item's
     `isItemDownloadable(item).source.fileExtension` when eligible, else null. Move the file
     (below).
  3. `downloadManager.adoptCompletedFile({ item, fileName, byteSize, fileExtension, channel: {
     channelIdText, channelTitle } from the target, fallbackArtworkUrl, fallbackSource:
     v4DownloadFallbackSource(row, fileExtension) })`: `adopted` → `settle(row, 'directory')`;
     `exists` → `deleteCarried(row, adoptedFile, 'duplicate')`; `ineligible` →
     `deleteCarried(row, adoptedFile, 'deleted')`.
- `directory_kept`: the show stays a directory subscription. Do not call `addSignedOutFeedStub`
  or any other Add by RSS follow, and do not insert `subscribed_channel`.
  1. Move the file the same way as `directory` (`v4AdoptedFileExtension(row)`).
  2. `downloadManager.adoptCompletedFile` with `kept.item`, `kept.fallbackSource`,
     `channel: { channelIdText: kept.channelIdText, channelTitle: kept.channelTitle }`, and
     `fallbackArtworkUrl: kept.fallbackArtworkUrl`. `adopted` → continue. `exists` →
     `deleteCarried` as `duplicate` and do not call `keepDownloadedItem`. `ineligible` →
     `retry(row)`. Do not delete. The fallback source is always set, so this return is a writer
     failure.
  3. `channelItemsRepository.keepDownloadedItem({ channelIdText: kept.channelIdText, item:
     kept.item })`. The complete download row from step 2 is already written. `'kept'` or
     `'server_listed'` → `settle(row, 'directory')`. Both keep `kept.item.id_text` as the
     download's item id. `'skipped'` → `retry(row)`. Do not delete.
  4. A throw from `keepDownloadedItem` is `retry(row)`. Leave `adoptedFileName` set so the next
     pass resumes from `already_adopted`.
- `add_by_rss`: move the file with `fileExtension = v4AdoptedFileExtension(row)`, then place the
  show (§ G feed), then adopt:
  - Onto a feed: `addByRssRepository.adoptDownloadedEpisode({ episode, feedUrl, fileName,
    fileSizeBytes: byteSize })`. `feed_episode` / `local_episode` → `settle(row, 'add_by_rss')`
    and remember `downloadIdText`. `already_downloaded` → when
    `downloadsRepository.getByItemIdText(downloadIdText)?.filePath === fileName`, an earlier pass
    wrote it: `settle(row, 'add_by_rss')`. Otherwise `deleteCarried(row, adoptedFile,
    'duplicate')`. `no_feed` → `failure(row, adoptedFile, 'no_feed')`. On `retry` the file stays
    in `downloads/` under `adoptedFileName`, and the next pass resumes from `already_adopted`.
  - Downloads only (§ G feed, refusal): build `item` with the same fields as plan 41's private
    `v4KeptDirectoryItem`, `id_text` = the exported `v4KeptItemIdText(row.fileKey)`. Do not import
    that private helper. `fallbackSource` = `v4DownloadFallbackSource(row,
    v4AdoptedFileExtension(row))`. Null → `retry(row)` (an `add_by_rss` decision already has a
    media URL, so this is a writer failure). `adoptCompletedFile` with that item and source,
    `channel: { channelIdText: null, channelTitle: trimmed feed title or null }`, and
    `fallbackArtworkUrl` from `episode.imageUrl`. `adopted` → `settle(row, 'add_by_rss')`.
    `exists` when the stored `filePath` is this file name → `settle(row, 'add_by_rss')` (an
    earlier pass wrote it). Any other `exists` → `deleteCarried` as `duplicate`. `ineligible` →
    `retry(row)`. Do not call `keepDownloadedItem`. Do not create a feed row. The episode screen
    paints this playable item (§ 9).
  - Account follow returned a directory channel (§ G feed): run the `directory_kept` steps with
    `channelIdText` and `channelTitle` from that channel, `fallbackArtworkUrl` from
    `episode.imageUrl`, and `item` / `fallbackSource` built as in the Downloads-only branch.
    `settle(row, 'directory')` on `'kept'` or `'server_listed'`. Do not also write an Add by RSS
    feed.
- `delete` → `deleteCarried(row, file, 'deleted')`. `retry` → `retry(row)`.

**G feed.** One outcome per canonical feed URL for this pass, cached after the first row of that
URL. `getFeedByUrl` on the canonical URL (plan 30's adopt also falls back to the canonical URL).

- A stored feed row, whoever owns it: adopt onto that row. Do not call the account follow. Do
  not call `addSignedOutFeedStub` (the row exists; a second call would return false anyway). A
  signed-out-owned row that is hidden while signed in stays that row. Login settle is what claims
  it for an account. This pass does not create a feed, and it does not remove one.
- No stored row, and `deps.getAuthContext().accessToken === null`: `addSignedOutFeedStub({
  feedUrl, title: feedTitle })`, then adopt onto the feed. The stub is followed and seeds the
  auto-download rule (D12). This is the signed-out path only. False (the URL is not usable, or a
  row appeared between the lookup and the write) → `failure(row, adoptedFile, 'no_feed')`.
- No stored row, signed in (`accessToken !== null`):
  1. `accountRepository.getSnapshot()`. Null → cache `retry` for this URL. The account has not
     loaded. Do not treat that as a refusal, and do not write a signed-out feed.
  2. `evaluateFeatureAccess('add_by_rss_add', deriveMembershipState(account)).allowed` false →
     cache `refused`. Do not call the server.
  3. Otherwise read the cap once per pass with `fetchAccountAddByRssFeedLimit(getAuthContext())`.
     `null` → cache `retry`. That is not a refusal. Count account follows as
     `listFollowedOwnership()` rows whose `signedOutOwned` is false, plus each new account feed
     this pass has already written. `count >= limit` (including limit 0) → cache `refused`
     without a request.
  4. Otherwise `requestWithMobileAuthRefresh(getAuthContext(), (api) =>
     api.reqAccountFollowAddByRSSChannel({ feed_url: feedUrl, image_url: null, title: feedTitle
     ?? feedUrl }))`. No `requires_credentials`. The v4 row has no feed password.
     - `directory_channel` non-null → `addByRssPromotion.subscribeDirectoryChannel(channel.id_text)`.
       Null return, or a throw, → cache `retry` and do not end the pass. Otherwise cache that
       channel and run the directory-kept branch above. Do not write an Add by RSS row. Do not
       increment the cap count.
     - `directory_channel` null → write the local row with `upsertFeed`, copying the record
       `addSignedOutFeedStub` builds (same id helpers, `followed: true`, title or the URL). Do
       not call `addSignedOutFeedStub`, and do not run the update that sets `signedOutOwned` to
       1. The session is signed in, so `upsertFeed` records the account as the owner and seeds
       the auto-download rule. Cache `feed`. Increment the in-pass cap count by one.
     - A throw: `classifySignupCarryFollowError`. `'stop'` or `'skip'` → cache `refused`.
       `'rethrow'` is a network error: set `networkError`, end step G, leave this row unsettled,
       and do not write a feed. The moved file stays under `adoptedFileName`.
- A cached `refused` → the Downloads-only branch. No feed row. This pass does not open a
  membership dialog. A refusal is settled, not left `waiting`: the file is playable, and a
  `pending` row would keep the job from finishing. A later renewal does not go back and follow
  this show. A `refused` outcome does not also write a feed.
- A cached `retry` → `retry(row)` after the file move. Do not adopt and do not write a feed.

Moving the file (`directory`, `directory_kept`, and `add_by_rss`):

- An `adopted` file is already in place; use its name and size.
- When an earlier row hit `insufficient_space` this pass, leave this row untouched (`pending`, no
  attempt) and go on.
- `targetName = v4AdoptedFileName(row, fileExtension)`. `setAdoptedFileName(fileKey, targetName)`
  **before** `adoptV4DownloadFile(file.located, targetName, roots)`, so an interrupted copy is
  found and checked by step B on the next pass.
- `adopted` → use `fileName` and `byteSize`. `target_exists` → `deleteStoredFile(targetName)` and
  adopt once more; a second non-`adopted` result counts as `copy_failed`. `source_missing` →
  `settle(row, 'missing')`. `insufficient_space` → stop moving files this pass, then
  `failure(row, file, 'adopt_failed')`. `copy_failed` / `invalid_target` → `failure(row, file,
  'adopt_failed')`.
- After a good move the row's file is `{ kind: 'adopted', fileName, byteSize }`, called
  `adoptedFile` above; later deletes go through `downloadsRepository.deleteStoredFile`.

A thrown network error inside step G (item fetch, or an account follow whose classifier returns
`rethrow`) ends step G the same way as in step E; rows not reached stay as they are. Do not scan
folders on that path.

**H. Finish.**

1. For each remembered Add by RSS `downloadIdText`, `downloadsRepository.getByItemIdText` and
   `downloadStore.put` the row (plan 30's entry point does not touch the store). A Downloads-only
   adoption and a `directory_kept` adoption already called `downloadStore.put` inside
   `adoptCompletedFile`. Do not `downloadStore.hydrate` the whole list; that would drop a
   listener's tap that has not reached SQLite yet.
2. Anything adopted (`directory` or `add_by_rss`) → `homeFeedRefresh.notify()`.
3. `remaining = (await listByStatus(['pending'])).length`.
4. `remaining === 0 && settledAny` → `counts = await v4DownloadCarryoverRepository.counts()` and
   `syncEventLogRepository.append({ details: v4DownloadCarryoverLogDetails(counts.byStatus),
   errorCode: V4_DOWNLOAD_CARRYOVER_DONE_CODE, jobKind: 'v4-download-carryover', message: null,
   occurredAt: Date.now(), outcome: 'reconciled' })`. The entry is a snapshot of every row, so a
   later pass that settles `waiting` rows writes an up-to-date one.
5. `remaining === 0 && pendingAtStart > 0` → `deps.clearDirectoryMatchPacing()` and
   `requestAddByRssRefresh()`. This parses new feeds (plan 30 absorbs local episodes the feed
   still lists) and delivers the refresh § 5 defers.
6. `budgetReached && !deps.signal.aborted && networkError === null && remaining > 0` →
   `deps.enqueueContinuation()`.
7. `networkError !== null` → throw it, so the queue parks offline as it does for other jobs.

No `console` logging. Unexpected errors (SQLite) propagate to the queue's failure log; every row
they interrupt is resumable from its status and `adoptedFileName`.

## 4. Job and order — `src/sync/syncJobs.ts`

Below `createV4CarryoverJob`:

```ts
/** One Android copy of a long video may outlast the pass budget; the job waits for it. */
const V4_DOWNLOAD_CARRYOVER_TIMEOUT_MS = 120000;

const createV4DownloadCarryoverJob = (
  deps: SyncJobDeps,
  priority: SyncJobPriority
): SyncJob => {
  return buildJob(
    'v4-download-carryover',
    priority,
    'v4-download-carryover',
    async (context) => {
      await runV4DownloadCarryover({
        clearDirectoryMatchPacing: clearAddByRssDirectoryMatchPacing,
        enqueueContinuation: () => {
          context.enqueue(createV4DownloadCarryoverJob(deps, 'background'));
        },
        getAuthContext: () => deps.getAuthContext(),
        signal: context.abortController.signal,
      });
    },
    V4_DOWNLOAD_CARRYOVER_TIMEOUT_MS
  );
};
```

The queue dedupes only against jobs that have not started, so a running pass can queue its own
continuation. The continuation runs after work already queued, which keeps other sync moving.

In `buildSyncJobs`, replace the final `shouldScheduleV4Carryover` block so the subscription pass
runs first and the download pass second, both ahead of the planned roots:

```ts
  const priority = planned[0]?.priority ?? 'background';
  if (await shouldScheduleV4DownloadCarryover()) {
    jobs.unshift(createV4DownloadCarryoverJob(deps, priority));
  }
  if (await shouldScheduleV4Carryover(deps.getAuthContext().accessToken === null)) {
    jobs.unshift(createV4CarryoverJob(deps, priority));
  }
```

Update the `buildSyncJobs` doc comment: a phone with staged files from the previous app resolves
them right after the subscription pass, signed in or out. Plan 21's `notifyV4CarryoverRowsSaved`
already calls `buildSyncJobs([], …)` from `SyncProvider`, so the first pass runs after the read
with no `SyncProvider` change.

## 5. Subscription pass defers its refresh — `runV4Carryover.ts`

In `applyPlan`, change the `if (wroteStub)` block to:

```ts
  if (wroteStub) {
    deps.clearDirectoryMatchPacing();
    if ((await v4DownloadCarryoverRepository.listByStatus(['pending'])).length === 0) {
      requestAddByRssRefresh();
    }
  }
```

Import `v4DownloadCarryoverRepository` by path from
`../../data/repositories/v4DownloadCarryoverRepository` (plan 21 keeps it out of the barrel).
`requestAddByRssRefresh` queues a user-priority refresh, which runs before the background download
pass. Promotion is not held (plan 31). The refresh still waits until this pass has no `pending`
row, so a file is adopted before that refresh can move its feed. Plan 31 then keeps an unmatched
file on the directory show. It does not open a second Add by RSS follow for that file. Step H.5
requests the refresh once no row is pending.

## 6. Sessions

D12, D14, and D15. D12 and D15 stay as confirmed. D14 is the signed-in account follow below.

- The download pass runs signed in and signed out. It does not read `isCopyAllowed` and does not
  wait on the continue-migration screen. That choice is which library the listener keeps. A
  file's outcome does not change with it (D15).
- Downloads are device data (plan 21 keeps the rows through `clearSession`). A file left
  unsettled while a listener stays signed in would hold storage with no listing.
- Each Add by RSS row reads the session at the moment that row is placed (§ G feed). A row
  already settled is not redone when the listener signs in or out mid-pass. Directory and
  `directory_kept` adoptions do not read the session.
- A stored feed row is used as it is, including a signed-out feed that stays hidden while someone
  is signed in. This pass does not create that hidden feed, and it does not claim it for the
  account.
- No stored row, signed out: `addSignedOutFeedStub` writes a followed feed and seeds
  auto-download (D12). The phone keeps that feed.
- No stored row, signed in: the account follow when
  `evaluateFeatureAccess('add_by_rss_add', …).allowed` and the account-owned follow count is
  under `fetchAccountAddByRssFeedLimit`. The local row is account-owned (`signedOutOwned` 0) and
  followed, and `upsertFeed` seeds auto-download. A follow answer with a directory channel
  subscribes to that channel and keeps the file on the show (`directory`). It does not also
  write an Add by RSS feed.
- Membership cannot accept the follow, the account is at its cap, or the server refuses
  (`classifySignupCarryFollowError` is `'stop'` or `'skip'`): the file is a finished download in
  My Library → Downloads, played from the episode screen (§ 9). No signed-out feed is created.
  The row is settled `add_by_rss`. It is not left `waiting` for a later renewal.
- A null account snapshot, a cap read that returns null, or a follow whose classifier returns
  `'rethrow'` is not a refusal. The row stays `pending` or `waiting`, and no feed is written.

## 7. What stays true

- A file is deleted only for a reason plan 41 names (orphan, unfinished, blocked show, nothing
  that names a show, no media URL for an Add by RSS episode, `not_here` with no feed URL after
  five passes, a copy or feed row that failed five times), when v5 already has that episode
  downloaded (`duplicate`), or when neither v5 nor v4 has a media URL for a directory episode
  (`ineligible`). Never for an HTTP failure, offline, a feed host that is down, an episode that
  left its feed, a `directory_kept` writer failure, or an account follow the server refuses.
  An orphan delete runs only for a row plan 41 marks `delete orphan`. This pass does not scan
  folders, and it does not treat a missing `read_at` as an empty list of named files.
- A file whose lookup or match has not answered, or whose account snapshot or feed cap has not
  been read, stays on disk, in `pending` or `waiting`.
- Adopted files live under `documentDirectory/downloads/` as `v4-<episode id>-<hash>.<ext>`, and
  rows store only that name. A refused account follow is settled `add_by_rss`, so it counts in
  `add_by_rss_episodes`. There is no separate status for it.
- The pass never asks for a permission or opens a picker.
- The error log and any thrown error carry counts only: no file keys, URLs, titles, or folders.

## 8. `src/downloads/README.md`

One short paragraph after plan 30's local-episode paragraph: files the previous app (v4)
downloaded are moved into `downloads/` by the v4 download carryover
(`src/migration/v4/runV4DownloadCarryover.ts`) under `v4-…` names. Directory episodes, including
one kept on a directory show the feed does not list, go through `downloadManager.adoptCompletedFile`.
Add by RSS episodes go through `addByRssRepository.adoptDownloadedEpisode` when the phone has
that feed. A signed-in file whose account cannot follow the show is only the
`adoptCompletedFile` row. Names do not follow `buildDownloadFileName(itemIdText)`; readers rely
on the stored `filePath`, as for every row.

## Where an adopted directory file shows (R5)

From the `complete` row and its stored item: My Library → Downloads (Completed; a tap opens the
episode screen, which plays the local file), the episode screen's download state, the show's
Downloaded section (`listCompleteByChannel`), and Home's downloaded-only shows when the listener
does not follow the show. A `directory_kept` file uses the same places. Plan 32 puts it on that
show's episode list until the listener deletes the file. Deleting the file removes the kept
`channel_item`. It is deleted from Library → Downloads, the episode screen, or Settings "delete
all downloads".

An Add by RSS file with a feed shows where plan 30 says. A refused account follow has
`channelIdText` null and no `channel_item`, so it is not a Home downloaded-only show and not a
row on a feed. It is the Downloads row, and the episode screen opened from that row (§ 9).

## 9. Episode screen paints a stored download — `EpisodeDetailScreen.tsx`

`loadEpisode` today reads `channelItemsRepository.getByIdText` and, when that is null and the
item request fails, clears the episode. A refused follow has no `channel_item`. The screen is
large: edit only `loadEpisode`.

- When the channel item is null, `playableItemRepository.getByIdText(episodeId)`. Import it from
  `../../data/repositories/playableItemRepository`, next to the channel-items import.
- When that returns an item, it is the stored item for the rest of this load. `applyEpisode` with
  that item, a null channel, and
  `(await downloadsRepository.getByItemIdText(episodeId))?.channelTitle ?? null`, then
  `setIsLoading(false)` before the network, the same as a channel-item hit.
- Offline Mode with neither a channel item nor a playable item stays the current empty path.
  Offline Mode with a playable item paints it and returns.
- When the item request throws and a playable item was painted, leave it. Do not `setEpisode(null)`.
  A channel item still wins when one exists. Play already prefers the local file
  (`resolvePlaybackUrl`). No other play function changes.

## Tests

- New `apps/mobile/src/migration/v4/legacyLookupRequest.test.ts` (vitest, node; add it to
  `include` after `planV4DownloadCarryover.test.ts` in `apps/mobile/vitest.config.ts`). Errors are
  plain objects `{ response: { status, data } }`; a rate limit uses `data.timeUntilResetMs` above
  the helper's minimum. Cases: `ok` returns the value; a 429 inside the budget waits once (spy on
  `wait`) and returns the second result; a second 429 returns `http` 429 without a second wait; a
  429 longer than `remainingMs()` returns `http` 429 at once; a 404 returns `http` 404; an `Error`
  with no response is thrown.
- The pass, `adoptCompletedFile`, the account follow, and the job use Expo FileSystem, SQLite,
  and the network, so they have no unit tests (**mobile-test-economics**). Area E's Maestro flow
  (plans 50–59) stays signed out and proves the three outcomes on a device: a directory episode
  in Library → Downloads, an Add by RSS episode on its followed feed, a deleted file, and the
  error-log entry's counts. It does not sign in, so it does not cover the account follow or a
  refused follow. The episode-screen branch is the same `loadEpisode` path that flow already
  opens for a directory file.
- `planV4Carryover.test.ts` is unchanged; the subscription pass's lookup behavior does not change.

## Release scratchpad

```markdown
## Phone carries v4 downloads into v5

- Surfaces: mobile
- Change: after updating from v4, a background sync job ("Moving Your Downloads", kind
  `v4-download-carryover`) settles every media file v4 downloaded. A file whose episode the v5
  directory knows becomes a finished download of that episode. A show the directory has without
  that episode keeps the file on that show's episode list. A file from an Add by RSS feed becomes
  an episode on that feed, kept as a local episode when the feed no longer lists it. Signed out,
  the phone follows the feed when it did not already. Signed in, the account follows it when the
  membership can accept another feed within the account's cap. If the server refuses, the file
  stays in My Library → Downloads and the phone does not add a signed-out feed. Files that cannot
  migrate are deleted with no screen: unfinished
  v4 downloads, files no v4 list named, shows dropped as spam or takedown, and files with no show
  the phone can name. A file waiting on a lookup stays on disk, and being offline is never a
  failed match. One error-log entry ("Downloads Moved from the Previous App") counts each outcome.
  Runs signed in or out.
- Who notices: listeners updating from v4 with downloaded episodes; their downloads appear in My
  Library → Downloads, and space held by files that cannot migrate is freed
- Operator steps: deploy the API with `POST /legacy/episode/lookup` before shipping this mobile
  build
```
