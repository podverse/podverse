**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 60 — Catalog settle

Seed the shows one rehearsal stage needs, queue their first parses, and return
when those feeds are settled. One account's `v4SeedAccountCatalog` is the wrong
shape for a stage: the pilot and the sample share shows across accounts, and
the full stage is the launch queue plus shows that only appear on a clip,
playlist, or playback row.

## Rows

R31

## Runs after

none

## Files

- apps/workers/src/commands/orm/v4Catalog/seedCatalogApply.ts
- apps/workers/src/commands/orm/v4Catalog/seedAccountCatalog.ts
- apps/workers/src/commands/orm/v4Catalog/seedStageCatalogLib.ts
- apps/workers/src/commands/orm/v4Catalog/seedStageCatalogLib.test.ts
- apps/workers/src/commands/orm/v4Catalog/seedStageCatalog.ts

## Tests

Unit tests in `seedStageCatalogLib.test.ts` (Vitest, `apps/workers`, no
database and no queue). They cover source precedence, which shows are created,
duplicate-show refusal, the first-parse queue rule, and the settled /
failed-parse counts. No API integration, Playwright, or Maestro. No new test
for `v4SeedAccountCatalog`; its classify tests stay as they are.

## Release scratchpad

none

## Leave these alone

- `v4SeedAccountCatalog` still counts and seeds one account. Same flags, same
  help text, same log line, same skip when the v5 account row is missing, same
  order: refuse, ensure, schedule retries only for feeds this call created,
  queue a parse for every create. Do not add a wait to that command.
- Do not change `classifyAccountCatalogSeed` or `selectCatalogSeedCreates`.
- Do not register a worker command. Do not edit `packages/worker-commands`,
  `apps/workers/src/commands/index.ts`, `categoriesForCommand.ts`,
  `apps/workers/package.json`, or `apps/workers/ENV.md`.
- Do not edit `copyAccountLibrary.ts`, `copyAccountLibraryApply.ts`, or
  `copyAccountLibraryLib.ts`. Import the pure helpers that file already
  exports.
- Do not write the phase-status table, `.artifacts/`, or doc 16.
- Do not add `feed.added_via` or `feed_add_event`. Those columns are not in
  the schema. No linear migration.
- Do not start the RSS parser or `scheduledJobsRunDue`. Do not add a timeout
  and do not clear `feed.is_parsing`.
- Add by RSS URLs are not catalog shows. Do not read
  `addByRSSPodcastFeedUrls`.

Code in these files matches the workers files next to them: single quotes,
semicolons, no `any`, no `as`, `import type` on its own line, `===` / `!==`.
Comments describe the code as it stands and do not name a plan or a doc.

## What to export

`v4SeedStageCatalog` from `seedStageCatalog.ts`. The runner calls this. It is
not a `CommandLineArgs` handler.

```typescript
export type V4CatalogStage = 'pilot' | 'sample' | 'full';

export type V4SeedStageCatalogInput = {
  stage: V4CatalogStage;
  /** Pilot and sample: v4 users.id values. Full ignores this array. */
  v4Ids: readonly string[];
  dryRun: boolean;
  onProgress?: (progress: V4SeedStageCatalogProgress) => void;
};

export type V4SeedStageCatalogProgress = {
  created: number;
  queued: number;
  settled: number;
  failedParse: number;
  waiting: number;
  elapsedMs: number;
};

export type V4SeedStageCatalogResult = {
  stage: V4CatalogStage;
  subscribed: number;
  viewedNotSubscribed: number;
  libraryOnly: number;
  alreadyLocal: number;
  missing: number;
  nonPublic: number;
  spam: number;
  takedown: number;
  noPodcastIndexId: number;
  skippedNoAuthorityUrl: number;
  skippedInvalidId: number;
  /** Shows `classifyStageCatalog` put in `creates`. Same on a dry run and an apply. */
  toEnsure: number;
  created: number;
  queued: number;
  settled: number;
  failedParse: number;
  /** v4 podcast ids whose feed settled with no finished parse. Sorted ascending. */
  failedPodcastIds: string[];
  elapsedMs: number;
};
```

`onProgress` receives counts only. Never a v4 id, a URL, a title, or an email.

`elapsedMs` is the whole call, from the first line to the return.

## Caller checks

1. Pilot or sample with `v4Ids.length === 0` throws `Missing account ids for this stage.`
2. Any pilot or sample id that fails `isValidNanoIdV2IdText` throws
   `v4 id must be 7–15 characters.` Full does not read `v4Ids`.
3. `V4_DATABASE_URL` empty or whitespace throws `Missing V4_DATABASE_URL.`
4. Apply (`dryRun === false`) calls the existing local-database check, moved
   as specified below. Dry run does not.
5. A v4 query failure throws `Could not read the v4 catalog.` with `cause`,
   same as `readV4Sources`. Never put the connection string in the error or
   the log.

Close the v4 `pg` client before any v5 write and before the wait. The wait
can run for days. Do not hold that connection open.

## Which shows

A show id can come from more than one list. Tag each id with one or more of
`subscribed`, `viewed`, `library`. Drop blank ids. Dedupe inside each list.

Pilot and sample use the account ids. Full uses every row and also runs the
viewed query. Same podcast-key statement the account command already uses
(`PODCAST_SQL` in `seedAccountCatalog.ts`: public flag, `flag_status`,
Podcast Index id, authority URL, podcast guid). Load keys in chunks of
`STAGE_CATALOG_QUERY_CHUNK` (2000) with `id = ANY($1::varchar[])`. An id with
no podcast row stays in the list with `podcast: null`.

Subscribed, pilot and sample:

```sql
SELECT DISTINCT btrim(pid) AS id
FROM users u, unnest(u."subscribedPodcastIds") AS pid
WHERE u.id = ANY($1::varchar[])
  AND btrim(pid) <> ''
```

Subscribed, full: the same statement with no `u.id` predicate.

Viewed, full only. Any `stats_podcast` timeframe counts. Do not sum.

```sql
SELECT DISTINCT s.podcast_id AS id
FROM stats_podcast s
WHERE s.play_count > 0
  AND s.podcast_id IS NOT NULL
```

Library is nine branches UNIONed. Pilot and sample add
`AND <owner>."ownerId" = ANY($1::varchar[])` on every branch. Full omits that
predicate. This is the same hop as `readV4Sources`: a user clip skips official
chapters and official soundbites; a playlist member does not; a playback row
uses `episodeId` when set and also hops `mediaRefId` through `mediaRefs`.

| Branch | From | Owner column |
| --- | --- | --- |
| User clip | `"mediaRefs" mr` join `episodes e` on `e.id = mr."episodeId"`, `mr."isOfficialChapter" IS NOT TRUE` and `mr."isOfficialSoundBite" IS NOT TRUE` | `mr` |
| Playlist episode | `playlists p` join `playlists_episodes_episodes pe` on `pe."playlistsId" = p.id` join `episodes e` on `e.id = pe."episodesId"` | `p` |
| Playlist media ref | `playlists p` join `playlists_media_refs_media_refs pm` on `pm."playlistsId" = p.id` join `"mediaRefs" mr` on `mr.id = pm."mediaRefsId"` join `episodes e` on `e.id = mr."episodeId"` | `p` |
| History episode | `"userHistoryItems" h` join `episodes e` on `e.id = h."episodeId"` and `h."episodeId" IS NOT NULL` | `h` |
| History media ref | `"userHistoryItems" h` join `"mediaRefs" mr` on `mr.id = h."mediaRefId"` join `episodes e` on `e.id = mr."episodeId"` and `h."mediaRefId" IS NOT NULL` | `h` |
| Queue episode | `"userQueueItems" q` join `episodes e` on `e.id = q."episodeId"` and `q."episodeId" IS NOT NULL` | `q` |
| Queue media ref | `"userQueueItems" q` join `"mediaRefs" mr` on `mr.id = q."mediaRefId"` join `episodes e` on `e.id = mr."episodeId"` and `q."mediaRefId" IS NOT NULL` | `q` |
| Now playing episode | `"userNowPlayingItems" n` join `episodes e` on `e.id = n."episodeId"` and `n."episodeId" IS NOT NULL` | `n` |
| Now playing media ref | `"userNowPlayingItems" n` join `"mediaRefs" mr` on `mr.id = n."mediaRefId"` join `episodes e` on `e.id = mr."episodeId"` and `n."mediaRefId" IS NOT NULL` | `n` |

Each branch selects `e."podcastId" AS id` and drops nulls. The column names
match `seedAccountCatalog.ts`.

## Pure plan

`classifyStageCatalog` in `seedStageCatalogLib.ts` takes the tagged shows and
a `LocalCatalog`. Reuse `isSeedablePodcast`, `podcastChannelIdText`, and
`parsePodcastIndexId` from `copyAccountLibraryLib.ts`. Do not copy their
bodies.

Count each show once for the source totals:

- `sources` includes `subscribed` → `subscribed`
- else includes `viewed` → `viewedNotSubscribed`
- else → `libraryOnly`

Separately, the same buckets as `placeOf` in `seedAccountCatalogLib.ts`:

- `podcast === null` → `missing`
- not public → `nonPublic`
- flag `spam` / `takedown` → that bucket
- no Podcast Index id that `parsePodcastIndexId` accepts → `noPodcastIndexId`
- `podcastChannelIdText` returns a channel (including an applied absorb
  survivor) → `alreadyLocal`
- otherwise the show would be created:
  - no authority URL → `skippedNoAuthorityUrl`
  - id fails `isValidNanoIdV2IdText` → `skippedInvalidId`
  - else append `{ id, podcastIndexId, authorityUrl }` to `creates`

Sort `creates` by `id` ascending. One show is one create even when it has
several sources.

`refusalForDuplicateCreates(creates)` returns a string or null. Walk `creates`
in id order. Two rows with the same `podcastIndexId`: refuse the later id,
naming the earlier id's public page, with the sentence
`Refusing to seed https://podverse.fm/podcast/<later> because that show is already https://podverse.fm/podcast/<earlier>. Nothing was written.`
Two rows with the same `authorityUrl` and different Podcast Index ids: refuse
the later id with
`Refusing to seed https://podverse.fm/podcast/<later> because Podcast Index id <earlier id> already uses that authority URL. Nothing was written.`
Do not put the URL in the message. Return the first refusal.

`stageShowNeedsFirstParse` is true only when `isParsing`,
`lastFinishedParseTime`, and `lastFailedParseTime` are all null. A retry job
does not matter here. The first parse is queued when no parse has started.

`stageChannelTakesFirstParse` is true only when the local channel's `id_text`
equals that v4 podcast id. A survivor or any other channel id does not take
a first parse from this seed.

`countSettledParses` counts a row with `settled === true` as `settled`. A
settled row whose `lastFinishedParseTime` is null is also `failedParse`. A
row with `settled === false` is `waiting`.

## Apply

Move these functions from `seedAccountCatalog.ts` into `seedCatalogApply.ts`
without changing their bodies, and import them back:

- `assertLocalDatabase`
- `emptyCatalog`
- `readLocalChannels`
- `readExistingShows`
- `refusalForExisting`
- `ensureChannel`
- `scheduleRetries`
- `queueParses`

A helper both files need (`textOrNull`, `uniqueTexts`, and anything else the
move discovers) lives in `seedCatalogApply.ts` and is imported. Do not leave
a second copy. `readV4Sources` and the per-account SQL stay in
`seedAccountCatalog.ts`.

`v4SeedAccountCatalog` keeps calling `readLocalChannels` as it does now. The
stage call passes the same podcast list in chunks of 2000: slice the id,
Podcast Index id, URL, and guid arrays, call the moved function per slice,
and merge the sets and maps. A key written by an earlier slice stays.

Apply order, and stop on the first throw. A throw means nothing further is
written. Rows an earlier `ensureChannel` already saved stay saved.

1. `refusalForDuplicateCreates`. A string throws `new Error(that string)`.
2. `refusalForExisting` in create-chunks of 2000, same helper the account
   command uses. A string throws the same way.
3. `ensureChannel` for each create, in id order. Count `created` vs present.
   Keep `feedId` → v4 podcast id. A present channel still maps its feed.
4. Also map feeds for shows in the `alreadyLocal` bucket only. Query the
   channel id `podcastChannelIdText` returned, which is the v4 id or, for an
   absorb survivor or another match, that other `id_text`. A hidden, spam,
   or takedown show is not mapped and is not waited on. Chunked:

```sql
SELECT id_text, feed_id
FROM channel
WHERE id_text = ANY($1::varchar[])
```

The map records the v4 podcast id under that `feed_id`. Several v4 ids can
share one feed.

5. Load parse state for those feed ids, chunked:

```sql
SELECT f.id AS feed_id,
       f.is_parsing,
       fl.last_finished_parse_time,
       fl.last_failed_parse_time
FROM feed f
LEFT JOIN feed_log fl ON fl.feed_id = f.id
WHERE f.id = ANY($1::int[])
```

6. Queue a feed only when `stageShowNeedsFirstParse` and
   `stageChannelTakesFirstParse` are both true. A survivor or other existing
   channel is waited on and not queued, and it does not get a migration
   retry. Before the queue, schedule a retry
   only when `scheduled_job` has no row for
   `buildV4MigrationFeedRetryDedupeKey(feedId)`. Look up those keys with
   `dedupe_key = ANY($1::varchar[])` in chunks of 2000. Do not call
   `scheduleV4MigrationFeedRetry` when the row exists: `upsertByDedupeKey`
   resets `status`, `attempts`, and `run_after`. New jobs use the same
   `V4_MIGRATION_FEED_RETRY_FIRST_DELAY_MS` delay the account command uses.
   Then `queueParses` once, with `MQ_QUEUES['rss-slow']` and the same message
   the account command sends (`forceParse: false`, null on-demand account).
   `queued` is how many feeds were sent this call. `queueParses` closes MQ
   before it returns, so the wait does not hold the broker.

The wait set is every mapped feed id, including feeds that were already
settled and feeds this call did not queue.

During ensure, call `onProgress` after every
`STAGE_CATALOG_PROGRESS_EVERY` (100) creates and whenever 60 seconds have
passed since the last call. `settled` and `failedParse` stay 0 until the
wait. `waiting` is the mapped feed count so far.

## Wait

Poll until `waiting === 0`. No deadline.

Each pass, chunked by 2000, calls `getV4MigrationFeedSettledByFeedId` from
`@podverse/orm` and re-reads `last_finished_parse_time` with the feed query
above. `countSettledParses` is the pass result. A feed id the settled map
omits counts as not settled.

Sleep `STAGE_CATALOG_POLL_MS` (60000) only when `waiting > 0`. Check once
before the first sleep, so a stage whose feeds are already settled returns
without sleeping.

Call `onProgress` on that first check, after a pass that is at least 60
seconds since the previous call, and always on the pass that finds
`waiting === 0`.

When the wait ends, `failedPodcastIds` is every v4 podcast id mapped to a
feed that counted as `failedParse`, sorted ascending with a normal string
compare. One failed feed with two v4 ids lists both. `toEnsure` and the
source and bucket totals on the result are the `classifyStageCatalog` values.
`created` and `queued` are what this call did.

A failed parse does not throw. The call returns. The finish log is one
`getLogger().info` line, `v4 stage catalog seed finished`, with `stage`,
`dryRun`, and the numeric result fields. No ids.

## Dry run

Read v4 and v5, run `classifyStageCatalog`, and return. `toEnsure` is
`creates.length`. `created`, `queued`, `settled`, and `failedParse` are 0.
`failedPodcastIds` is empty. Do not call MQ, `ensureChannel`, or the wait.
Still call `onProgress` once with those zeros so the runner can print a line.

## Tests

`seedStageCatalogLib.test.ts`. Build the local catalog with the same shape
`seedAccountCatalogLib.test.ts` uses. Podcast fixtures go through
`V4PodcastKey`.

- A subscribed show that was also viewed and also on a clip counts once, as
  `subscribed`, and is one create.
- A viewed show with no subscription counts as `viewedNotSubscribed` and is
  created. A library show with neither tag counts as `libraryOnly`. A hidden
  viewed show counts as `viewedNotSubscribed` and as `nonPublic`, and is not
  created.
- Hidden, spam, takedown, missing podcast, non-numeric Podcast Index id, and
  an id `podcastChannelIdText` already resolves (plain id and an absorb
  survivor) are not created, in the matching bucket.
- A seedable show with no authority URL increments `skippedNoAuthorityUrl`.
  A seedable show with a URL whose id is 6 characters increments
  `skippedInvalidId` and is not created.
- Two creates with one Podcast Index id refuse before any write, and the
  message names both public pages and says nothing was written. Two creates
  with one authority URL and different Podcast Index ids refuse with the
  Podcast Index sentence and do not include the URL.
- `stageShowNeedsFirstParse` is true only when parsing, finished, and failed
  are all null. A finished time, a failed time, or a parsing time makes it
  false.
- `stageChannelTakesFirstParse` is true when the channel id equals the v4
  podcast id, and false when the channel id is a survivor.
- `countSettledParses`: a settled row with a finished time counts as settled
  only; a settled row with a null finished time counts as settled and
  failed; an unsettled row counts as waiting.
