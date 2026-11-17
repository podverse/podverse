**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 41 — Decide what each staged v4 file becomes (pure, mobile)

## Rows

R3, R4, R11, R17, R19, R20, R22, R23, R28

- R3 (client side): what the phone sends to the episode lookup and the Add by RSS directory match,
  and how a directory answer becomes a directory download.
- R4: a file whose show is not a directory channel falls back to an Add by RSS feed when the phone
  can name one. A show the directory already knows does not.
- R11, R17, R22: the deletion rule. A file is deleted only for a definite reason, never because a
  request failed, the phone was offline, a feed host was down, or an episode left a feed.
- R19, R20: a row whose lookup has not answered stays as it is; the file stays on disk.
- R23: a show the directory knows stays a directory subscription. A downloaded episode that is not
  in that show's feed stays playable on that show's episode list and in Downloads until the
  listener deletes the file. This decision is not an Add by RSS follow. Plan 32 is the keep path
  for every finished download; this plan chooses it for a v4 file.
- R28: a thrown read of the download lists is not an empty list. This module deletes an unnamed
  file only when plan 21 staged it as an orphan after `AsyncStorage.multiGet` returned.

This plan is one pure module and its tests. Plan 42 calls it. Nothing here touches the disk,
SQLite, or the network.

## Runs after

10, 20, 21, 30, 32, 40

## Files

apps/mobile/src/migration/v4/planV4DownloadCarryover.ts
apps/mobile/src/migration/v4/planV4DownloadCarryover.test.ts
apps/mobile/vitest.config.ts

## Reuse

- `planV4Carryover.ts` is the pattern: pure decisions over staged rows plus lookup answers,
  `canonicalAddByRSSFeedUrl` for every feed address, a count helper, and a vitest file beside it.
- `buildDownloadFileName` and `hashEnclosureUri` (`src/downloads/downloadStorage.ts`) for file
  names, so adopted files obey the same character rules as v5 downloads.
- `v5FileExtensionForV4` (plan 20, `src/migration/v4/v4DownloadNames.ts`) for the extension.
- `AddByRssMatchFeedInput` (`src/lib/addByRss/directoryMatch.ts`) as the match input, so plan 42
  can pass it to the existing `buildAddByRssMatchRefs` chunker.
- `AddByRssCarriedEpisode` (plan 30, `src/lib/addByRss/localEpisode.ts`) as the Add by RSS
  episode shape.
- `channelItemsRepository.keepDownloadedItem` (plan 32, `channelItemsRepository.ts`) is what plan
  42 calls for a `directory_kept` decision. This module does not import that repository. The item
  shape below is the argument it stores.
- `buildItemFromEngineMeta` in `src/lib/playback/engineSourceAdoption.ts` is the shell to copy for
  a local `DTOItem` (numeric ids `0`, empty arrays, `item_values: []`, `live_item: null`). Do not
  import that file. It loads the native engine.

## Imports

Keep the module free of Expo and SQLite. Type-only imports are erased, so these are safe:

```ts
import type {
  DTOAddByRSSMatchFeed,
  DTOItem,
  DTOLegacyEpisodeLookupAnswer,
  DTOLegacyEpisodeLookupRef,
} from '@podverse/helpers/dto';
import { canonicalAddByRSSFeedUrl } from '@podverse/helpers-validation/client';

import type { SyncEventLogDetails } from '../../data/repositories/syncEventLog';
import type {
  V4DownloadCarryoverRow,
  V4DownloadCarryoverStatus,
} from '../../data/repositories/v4DownloadCarryoverRepository';
import type { DownloadSourceSelection } from '../../downloads/downloadEligibility';
import { buildDownloadFileName, hashEnclosureUri } from '../../downloads/downloadStorage';
import type { AddByRssMatchFeedInput } from '../../lib/addByRss/directoryMatch';
import type { AddByRssCarriedEpisode } from '../../lib/addByRss/localEpisode';
import { v5FileExtensionForV4 } from './v4DownloadNames';
```

## Module: `src/migration/v4/planV4DownloadCarryover.ts`

Doc comment on the module: what each staged file can become, in order (directory episode, kept
episode on that same directory show, Add by RSS episode, delete); that a delete always has a
definite reason; that a failed request or an offline phone leaves the row for a later pass with
its file on disk; that a thrown download-list read never reaches this module.

### Constants and types

```ts
/** A row's retryable failures before the pass gives up on it. */
export const V4_DOWNLOAD_CARRYOVER_MAX_ATTEMPTS = 5;

/** Matches the episode lookup's request validation (plan 10). */
const LEGACY_ID_MAX_LENGTH = 14;
const LOOKUP_TEXT_MAX_LENGTH = 2048;

/** Why a carried file is deleted. Counted only; never logged per file. */
export type V4DownloadDeleteReason =
  | 'blocked'
  | 'gave_up'
  | 'no_identity'
  | 'no_media_url'
  | 'not_in_directory'
  | 'orphan'
  | 'partial';

export type V4DownloadDirectoryTarget = {
  itemIdText: string;
  channelIdText: string;
  channelTitle: string | null;
  /** Used only when the fetched item carries no artwork. */
  fallbackArtworkUrl: string | null;
};

export type V4DownloadDirectoryKept = {
  channelIdText: string;
  channelTitle: string | null;
  fallbackArtworkUrl: string | null;
  /** Always set, so a missing media URL cannot come back as an ineligible delete. */
  fallbackSource: DownloadSourceSelection;
  item: DTOItem;
};

export type V4DownloadDecision =
  | { kind: 'delete'; reason: V4DownloadDeleteReason }
  | { kind: 'directory'; target: V4DownloadDirectoryTarget }
  | { kind: 'directory_kept'; kept: V4DownloadDirectoryKept }
  | { kind: 'add_by_rss'; feedUrl: string; feedTitle: string | null; episode: AddByRssCarriedEpisode }
  | { kind: 'lookup'; ref: DTOLegacyEpisodeLookupRef }
  | { kind: 'match'; feedUrl: string }
  | { kind: 'retry' };

export type V4DownloadFailure = 'adopt_failed' | 'delete_failed' | 'no_feed' | 'unreachable';

export type V4DownloadFailureOutcome =
  | { kind: 'retry' }
  | { kind: 'delete'; reason: 'gave_up' }
  | { kind: 'final'; status: 'delete_failed' | 'unreachable' };

/** Statuses a pass moves a row to and never revisits. */
export const V4_DOWNLOAD_SETTLED_STATUSES: readonly V4DownloadCarryoverStatus[] = [
  'directory', 'add_by_rss', 'duplicate', 'deleted', 'missing', 'unreachable', 'delete_failed',
];
```

`directory_kept` means: the show is a directory channel and the episode is not a directory item.
The show stays that subscription. Plan 42 stores `kept.item` with
`channelItemsRepository.keepDownloadedItem` and records a `complete` download on
`kept.item.id_text`. It does not follow an Add by RSS feed for this file. `retry` means: bump
`attempts`, set `waiting`, keep the file.

There is no `channel_feed` decision and no `decideV4DownloadAfterChannelFetch`. The lookup
already returned the channel. Fetching that channel's feed URL was only a way to open an Add by
RSS follow, and this file does not take that path.

Private helper: `isLastAttempt(row) = row.attempts + 1 >= V4_DOWNLOAD_CARRYOVER_MAX_ATTEMPTS`
(`attempts` is the count before this pass's bump).

### Small helpers

- `carriedEpisodeFromV4Row(row): AddByRssCarriedEpisode | null` — null when `row.mediaUrl` is
  null. Otherwise `{ description: null, durationSeconds: row.episodeDurationSeconds, guid:
  row.episodeGuid, imageUrl: row.episodeImageUrl ?? row.podcastImageUrl, mediaUrl: row.mediaUrl,
  mimeType: row.episodeMediaType, pubDate: row.episodePubDateMs === null ? null : new
  Date(row.episodePubDateMs).toISOString(), title: row.episodeTitle }`.
- `v4EpisodeLookupRef(row): DTOLegacyEpisodeLookupRef | null` — null when `isAddByRss`, or when
  the trimmed `legacyEpisodeId` or `legacyPodcastId` is null, empty, or longer than 14. `guid` and
  `media_url` are the row's values, or null when longer than 2048 characters.
- `v4AdoptedFileExtension(row): string | null` — `v5FileExtensionForV4(row.legacyExtension)`.
- `v4AdoptedFileName(row: { fileKey: string; legacyExtension: string }, fileExtension: string |
  null): string` — `stem` is `fileKey` without a trailing `legacyExtension` (the v4 episode id),
  cut to its first 100 characters; return
  `buildDownloadFileName(\`v4-${stem}-${hashEnclosureUri(fileKey)}\`, fileExtension)`. The `v4-`
  prefix and the hash of the whole key keep the name apart from every name v5's own transfers
  write (`buildDownloadFileName(itemIdText, …)`), so an adoption and a listener's tap on the same
  episode never write one file. The name stays under 120 characters for a 250-character Add by
  RSS key.
- `v4DownloadFallbackSource(row, fileExtension): DownloadSourceSelection | null` — null when
  `row.mediaUrl` is null; else `{ uri: row.mediaUrl, mime: row.episodeMediaType, mediaType:
  'video'` when the lowercased MIME starts with `video/`, else `'audio', fileExtension }`. Plan 42
  passes it to the download row when the v5 item itself is not downloadable.
- `addByRssDecision(row, feedUrl: string | null)` (private): canonical
  (`canonicalAddByRSSFeedUrl`) null → `delete no_identity`; `carriedEpisodeFromV4Row` null →
  `delete no_media_url`; else `add_by_rss` with the canonical URL, `feedTitle` = trimmed
  `podcastTitle` or null, and the episode. Call this only when the show is not a directory
  channel.
- `hasUsableFeedUrl(value: string | null)` (private): non-null and canonicalizes.
- `v4KeptItemIdText(fileKey: string): string` — `stem` is `fileKey` with every character outside
  `A-Za-z0-9` removed, cut to 24 characters (empty when nothing remains). Join `v4-download-`,
  the stem, and `hashEnclosureUri(fileKey)` with no separator. The prefix plus the 8-character
  hash is at least 20 characters, past the 7–15 character server id length, so the episode screen
  cannot load a different server item under this id. The same `fileKey` always returns the same
  id. The episode screen already paints a stored `channel_item` and leaves that row in place when
  the single-item request fails (`EpisodeDetailScreen` `loadEpisode`), so this id needs no screen
  change.
- `v4KeptDirectoryItem(row, itemIdText): DTOItem` — the `buildItemFromEngineMeta` shell, with
  `id_text` = `itemIdText`, `guid` = `row.episodeGuid`, `guid_enclosure_url` = `row.mediaUrl`,
  `title` = `row.episodeTitle`, `pub_date` = ISO from `episodePubDateMs` or null (same conversion
  as `carriedEpisodeFromV4Row`), `item_about.duration` = the duration seconds as a decimal string
  when non-null, else null. `item_values` is `[]` and `live_item` is null. One `item_images`
  entry when `row.episodeImageUrl ?? row.podcastImageUrl` is non-null, else `[]`. One enclosure
  when `row.mediaUrl` is non-null: `type` is `row.episodeMediaType` or `'audio/mpeg'`,
  `item_enclosure_default: true`, `item_enclosure_integrity: null`, one source whose `uri` is
  `row.mediaUrl`. When `row.mediaUrl` is null, `item_enclosures` is `[]`. Numeric ids are `0`.
  No type assertion. Do not set `channel` on the item; plan 42 passes the channel id beside it.
- `v4KeptFallbackSource(row, itemIdText): DownloadSourceSelection` — start with
  `v4DownloadFallbackSource(row, v4AdoptedFileExtension(row))`. When that returns non-null, use
  it. When it returns null (no media URL), the source `uri` is `file://` joined with
  `itemIdText`, `mime` is `row.episodeMediaType`, `mediaType` is `video` when the lowercased MIME
  starts with `video/`, else `audio`, and `fileExtension` is `v4AdoptedFileExtension(row)`. That
  URI is stored on the download row so the writer has a source. Plan 32 plays the local file and
  does not request it. No type assertion.
- `keptOnDirectoryShow(row, channelIdText, channelTitle, fallbackArtworkUrl)` (private): trimmed
  `channelIdText` empty → `delete no_identity`. Otherwise `directory_kept` with that channel id,
  `channelTitle` trimmed or null when empty, the artwork argument, `itemIdText` =
  `v4KeptItemIdText(row.fileKey)`, `item` = `v4KeptDirectoryItem`, and `fallbackSource` =
  `v4KeptFallbackSource`. A cached feed URL on the row is ignored. It must not become an Add by
  RSS follow.

### Before any request — `decideV4DownloadBeforeNetwork(row): V4DownloadDecision`

In order. An unfinished v4 download is deleted (D13, confirmed). Do not start a v5 download of
it. `not_here` with no usable feed URL is deleted only on the 5th try (D16, confirmed); that
branch is in `decideV4DownloadAfterLookup`. Network errors and offline never delete a file.

1. `source === 'orphan'` → `delete orphan`. Plan 21 inserts this row only after
   `AsyncStorage.multiGet` returns, and only for a file in v4's own app folders
   (`orphanRoot` `app_documents` or `app_external_files`) that the parsed list does not name.
   That includes a finished read whose list named no episode. A thrown read does not insert a
   row, does not write `read_at`, and has no attempt limit, so this branch does not run and this
   module must not invent an empty named-file list or a "third throw" path. A folder listing that
   throws after the key read also stages no orphan; delete only the orphan rows passed in. The
   listener-chosen folder and the cache are never orphan roots.
2. `source === 'downloading'` → `delete partial`. v4 had not finished the transfer, and nothing
   stored says how large the file should be. Do not start a new download.
3. `isAddByRss`: `hasUsableFeedUrl(row.addByRssFeedUrl)` → `{ kind: 'match', feedUrl:
   canonical }`; else `delete no_identity`.
4. `v4EpisodeLookupRef(row)` non-null → `{ kind: 'lookup', ref }`.
5. Otherwise `addByRssDecision(row, row.podcastFeedUrl)`. The phone never learned a directory
   channel, so R4 still applies.

### After the episode lookup — `decideV4DownloadAfterLookup(row, answer)`

`answer: DTOLegacyEpisodeLookupAnswer | undefined`. Plan 42 passes `undefined` when the chunk
holding this row failed with an HTTP error or answered without this episode id.

- `undefined` → `isLastAttempt` and `hasUsableFeedUrl(row.podcastFeedUrl)` →
  `addByRssDecision(row, row.podcastFeedUrl)`; otherwise `retry`. An HTTP failure never deletes.
- `item` → trimmed `item_id_text` or trimmed `channel.id_text` empty → treat as `undefined`.
  Else `directory` with `itemIdText`, `channelIdText`, `channelTitle` (trimmed, null when
  empty), and `fallbackArtworkUrl = answer.channel.image_url ?? row.episodeImageUrl ??
  row.podcastImageUrl`. The episode is in the directory. This is not `directory_kept`.
- `channel` → `keptOnDirectoryShow(row, answer.channel.id_text, answer.channel.title,
  answer.channel.image_url ?? row.episodeImageUrl ?? row.podcastImageUrl)`. The show resolved
  and the episode did not. A cached `podcastFeedUrl` does not change this.
- `feed_url` → `hasUsableFeedUrl(answer.feed_url)` → `addByRssDecision(row, answer.feed_url)`;
  else `addByRssDecision(row, row.podcastFeedUrl)`. This answer means the show has no directory
  channel.
- `blocked` → `delete blocked`. A dropped show never becomes an Add by RSS feed, even with a
  cached feed URL (doc 08; same rule as `planV4Carryover`).
- `not_here` → `hasUsableFeedUrl(row.podcastFeedUrl)` → `addByRssDecision(row,
  row.podcastFeedUrl)`; else `isLastAttempt` → `delete not_in_directory`; else `retry`. The
  show is not a directory channel, so R4 applies when a feed URL exists. The retries apply only
  when it does not: a directory that is still learning v4 shows gets four more launches, and the
  5th try deletes. HTTP failures and offline are the `undefined` branch, not this one.

### After the Add by RSS directory match

```ts
export const planV4AddByRssMatch = (
  rows: readonly V4DownloadCarryoverRow[]
): {
  feeds: AddByRssMatchFeedInput[];
  /** fileKey → the feed asked and the row's item position inside it. */
  positions: ReadonlyMap<string, { feedUrl: string; itemIndex: number }>;
};
```

- Takes the rows plan 42 decided `match` for. Groups by the canonical `addByRssFeedUrl`, in first
  appearance order. Each feed: `feedUrl` = canonical URL, `podcastGuid` = the first non-null
  `podcastGuid` in the group, `items` = one `{ enclosureUrl: row.mediaUrl, guid: row.episodeGuid }`
  per row in row order. `itemIndex` is the row's position in its feed's `items`.

`decideV4DownloadAfterMatch(row, result)` with `result: { kind: 'failed' } | { kind: 'answered';
match: DTOAddByRSSMatchFeed | null; itemIndex: number }`:

- `failed` → `isLastAttempt` → `addByRssDecision(row, row.addByRssFeedUrl)`; else `retry`.
- `answered`, `match.channel` non-null, and trimmed `match.items[itemIndex]?.item_id_text`
  non-empty → `directory` with that item id, `channelIdText = match.channel.id_text`,
  `channelTitle = match.channel.title`, `fallbackArtworkUrl = row.episodeImageUrl ??
  row.podcastImageUrl`.
- `answered`, `match.channel` non-null, and the item id empty or missing →
  `keptOnDirectoryShow(row, match.channel.id_text, match.channel.title, row.episodeImageUrl ??
  row.podcastImageUrl)`. The show is in the directory. Do not call `addByRssDecision`.
- Otherwise (`match` null, or `match.channel` null) → `addByRssDecision(row,
  row.addByRssFeedUrl)`. The show is not a directory channel (R4).

### After an item fetch

- `decideV4DownloadAfterItemFetch(row, target: V4DownloadDirectoryTarget, result: 'gone' |
  'failed')` — `gone` (HTTP 404 for the item) → `keptOnDirectoryShow(row, target.channelIdText,
  target.channelTitle, target.fallbackArtworkUrl)`. The show was already a directory channel.
  Do not reuse `target.itemIdText`; that id is the one the server did not return. `failed` (any
  other HTTP status, or a request that did not finish) → `retry` at every attempt count,
  including the last. The lookup already named a directory item. A later success adopts that
  item. Creating a second local episode after five failures would leave both once the request
  succeeds. A network error never deletes the file.

Do not add `decideV4DownloadAfterChannelFetch`. Nothing in this module asks for the channel's
feed URL.

### File and folder failures — `settleV4DownloadFailure(row, failure): V4DownloadFailureOutcome`

| failure | before the last attempt | at the last attempt |
| --- | --- | --- |
| `adopt_failed` (no space, copy failed, bad target name) | `retry` | `delete gave_up` |
| `no_feed` (the feed row vanished before adoption) | `retry` | `delete gave_up` |
| `unreachable` (shared folder unreadable) | `retry` | `final unreachable` |
| `delete_failed` | `retry` | `final delete_failed` |

A file that cannot be copied after five tries cannot migrate, and R11 asks that it not keep
holding storage. A file in an unreadable folder cannot be deleted either, so it is only counted.

### Log details — `v4DownloadCarryoverLogDetails(byStatus: Record<V4DownloadCarryoverStatus, number>): SyncEventLogDetails`

Every value as a decimal string:

| detail key | value |
| --- | --- |
| `directory_episodes` | `directory` |
| `add_by_rss_episodes` | `add_by_rss` |
| `already_downloaded` | `duplicate` |
| `deleted_files` | `deleted` |
| `missing_files` | `missing` |
| `unreadable_files` | `unreachable` |
| `undeletable_files` | `delete_failed` |
| `waiting_files` | `pending + waiting` |

`directory_kept` is not a status. Plan 42 settles that decision as `directory`, so those files
count under `directory_episodes`.

## `apps/mobile/vitest.config.ts`

Add `'src/migration/v4/planV4DownloadCarryover.test.ts'` to `include` directly after
`'src/migration/v4/planV4Carryover.test.ts'`. In the header comment, after the sentence about
the signed-out list parser, add one sentence: the v4 download carryover decisions
(`src/migration/v4/planV4DownloadCarryover.ts`) are covered because they are a pure function of
staged rows and server answers.

## Tests

New `apps/mobile/src/migration/v4/planV4DownloadCarryover.test.ts` (vitest, node). Build rows with
a local `row(overrides)` factory typed `V4DownloadCarryoverRow` (all staged fields null or
defaults, `status: 'pending'`, `attempts: 0`, `adoptedFileName: null`). Cases, one `it` each:

- Before network: orphan and downloading rows delete with `orphan` and `partial`; an Add by RSS row
  asks the match with the canonical URL; an Add by RSS row with an unusable URL deletes
  `no_identity`; a directory row with valid ids asks the lookup; a directory row with a 15-character
  episode id and a cached feed URL becomes `add_by_rss`; with no feed URL it deletes `no_identity`.
  There is no input for a thrown read. An orphan delete is only a row whose `source` is `orphan`.
- `v4EpisodeLookupRef`: trims ids; a guid over 2048 characters is sent as null.
- `v4KeptItemIdText`: the same `fileKey` returns the same id; two keys differ; every result starts
  with `v4-download-` and is longer than 15 characters; a key of only punctuation still does.
- After lookup: `item` → `directory` with the channel image as fallback artwork; `channel` with a
  cached feed URL → `directory_kept` (not `add_by_rss`) whose `channelIdText` is the answer's
  channel, whose `item.id_text` is `v4KeptItemIdText(row.fileKey)`, whose `item.item_values` is
  `[]`, whose `item.guid` and `item.title` come from the row, and whose enclosure `uri` is the
  media URL; `channel` with an empty `id_text` → `delete no_identity`; `channel` without a feed
  URL is still `directory_kept`; `feed_url` → `add_by_rss` with the answer's URL; `blocked` with
  a cached feed URL still deletes `blocked`; `not_here` with a feed URL → `add_by_rss`; `not_here`
  without a feed URL → `retry` at `attempts: 0` and `delete not_in_directory` at `attempts: 4`;
  `undefined` → `retry` at `attempts: 4` without a feed URL (never a delete), and `add_by_rss` at
  `attempts: 4` with one.
- `add_by_rss` decisions with `mediaUrl: null` delete `no_media_url`; the carried episode's
  `pubDate` is ISO and `imageUrl` falls back to the podcast image.
- `directory_kept` with `mediaUrl: null` stays `directory_kept`; `item.item_enclosures` is `[]`
  and `fallbackSource.uri` is `file://` plus the kept item id.
- Match: `planV4AddByRssMatch` groups two rows of one feed with positions 0 and 1 and keeps a
  second feed separate; an answered match with an item id → `directory`; an answered match with
  a channel and a null item id → `directory_kept`; an answered match with a null channel →
  `add_by_rss`; `failed` → `retry`, then `add_by_rss` at the last attempt.
- Item fetch: `gone` with a cached feed URL → `directory_kept` on `target.channelIdText`, and
  `item.id_text` is not `target.itemIdText`; `failed` at `attempts: 0` and at `attempts: 9` →
  `retry`.
- `settleV4DownloadFailure`: each row of the table above at `attempts: 0` and `attempts: 4`.
- `v4AdoptedFileName`: starts with `v4-`, drops the legacy extension from the stem, ends with the
  given extension, contains no `/`, differs for two keys that share their first 100 characters,
  and is shorter than 120 characters for a 250-character key.
- `v4DownloadFallbackSource`: `video/mp4` → `video`; missing MIME → `audio`; null media URL → null.
- `v4DownloadCarryoverLogDetails`: `waiting_files` adds pending and waiting; every key is a string.

## What plan 42 does with `directory_kept`

Plan 42 is the caller. Step 14 amends that plan and transcribes this section. This module does
not perform it.

In the file-work loop, handle `directory_kept`. Remove the `channel_feed` branch and any call to
`decideV4DownloadAfterChannelFetch`.

For one `directory_kept` row:

1. Move the file the same way as `directory` (`v4AdoptedFileName`, `setAdoptedFileName` before
   the copy).
2. `downloadManager.adoptCompletedFile` with `kept.item`, `kept.fallbackSource`,
   `channel: { channelIdText: kept.channelIdText, channelTitle: kept.channelTitle }`, and
   `fallbackArtworkUrl: kept.fallbackArtworkUrl`. `adopted` → continue. `exists` → delete the
   carried file as `duplicate` and do not call `keepDownloadedItem`. `ineligible` → `retry`. Do
   not delete. The fallback source is always set, so this return is a writer failure, not a
   missing URL.
3. `channelItemsRepository.keepDownloadedItem({ channelIdText: kept.channelIdText, item:
   kept.item })`. The complete download row from step 2 is already written, so a later window
   walk sees it. `'kept'` or `'server_listed'` → `settle(row, 'directory')`. Both use
   `kept.item.id_text` as the download's item id. `'skipped'` → `retry`. Do not delete.
4. Do not call `addSignedOutFeedStub` or any other Add by RSS follow. Do not insert
   `subscribed_channel`. A show the listener already follows stays that directory subscription.
   This pass does not add a follow they did not have.
5. A thrown error from `keepDownloadedItem` is `retry`. Leave the adopted file in place
   (`adoptedFileName` set) so the next pass resumes.

Deleting the file later is plan 32's `downloadsRepository.remove`, which drops the
`kept_for_download = 1` row. This module does not do that.

An orphan delete stays in plan 42's local-deletion step and only for rows this module marks
`delete orphan`. Do not scan folders when `hasRead()` is false, and do not treat a missing
`read_at` as an empty list of named files.

## Release scratchpad

none — a pure module with no caller until plan 42.
