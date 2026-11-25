**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 60 — Parser admission gate for the allowlist and Music off

Every worker path that adds a Podcast Index feed (MQ add, trending, the parser commands, remote
items, the on-demand add, OPML import, merge repoint parses, the dev seeders) ends in
`parseRSSFeedAndSaveToDatabase`, and the only place that creates a feed row there is
`handleGetRSSFeed` in `packages/parser/src/lib/rss/feed/feed.ts`. This plan puts one check at
that spot: when no stored row matches, the instance's catalog settings decide whether a new row
may be created. Stored feeds never reach the check, so they keep refreshing exactly as today.

Nothing is removed, hidden, or filtered. List endpoints and their URLs do not change.

## Rows

R52, R53, R54, R55, R66

## Runs after

12

## Files

- packages/parser/src/config/types.ts
- packages/parser/src/context.ts
- packages/parser/src/factory.ts
- packages/parser/src/lib/rss/errors.ts
- packages/parser/src/lib/rss/feed/catalogAdmission.ts (new)
- packages/parser/src/lib/rss/feed/catalogAdmission.test.ts (new)
- packages/parser/src/lib/rss/feed/feed.ts
- packages/parser/src/lib/rss/feed/feed.handleGetRSSFeed.test.ts (new)
- packages/parser/src/lib/rss/parser.ts
- packages/parser/src/lib/rss/parser.parseRSSFeedAndSaveToDatabase.hash-and-failure.test.ts
- apps/workers/src/index.ts
- release-notes/scratchpad.md

## Settled decisions

Transcribe these. Do not reopen them.

- **One gate, in the parser.** No per-command filters in trending, MQ add, OPML, the dev
  seeders, or remote items. Those all reach `handleGetRSSFeed`. Plan 63 adds one early check to
  the OPML import so a refused feed does not leave a pending follow; that is the only other
  check in the set.
- **Stored feeds are never gated.** The gate runs only when `getByUrlAndPodcastIndexId`,
  `getByPodcastIndexId`, and `getByUrl` all return null. A stored off-list feed, and a stored
  music feed with Music off, keep refreshing through the recently-updated poller, catch-up, the
  live listener, on-demand refresh, and merge repoints.
- **Music off is decided before a row exists, from the Podcast Index medium.** The gate looks the
  id up with the parser context's index provider. `music` and `musicL` are refused. `publisher`
  fetches and parses the feed once (no row created) and uses `detectDuckTypedPublisherMediumId`;
  a music publisher is refused. Every other medium is admitted. After a feed is stored, its own
  parsed medium never removes it or stops it refreshing.
- **Fail closed for Music off.** With Music off, a lookup that is `not_found` or `unavailable`,
  a missing index provider, or a publisher fetch that throws refuses the feed with reason
  `medium_unknown`. A later run retries it. With Music on these lookups do not happen.
- **Merged ids.** A stored listed show that Podcast Index later merges is repointed in place by
  the existing `applyRepoint` (same row, new url and id), so it stays stored and its repoint
  parse is never gated. For a listed id that was never stored, plan 61 resolves the surviving
  show and passes `catalogAllowlistSourcePodcastIndexId`; the gate admits the survivor when that
  source id is listed.
- **Remote items follow the same rule.** A stored publisher's remote albums are new feeds, so
  with the allowlist set they are added only when listed, and with Music off music remote items
  are refused. Remote stubs (`RemoteChannelStubService`) are not feeds and are untouched.
- **A refusal is quiet.** `FeedNotInCatalogError` is logged at info level. No feed-log failure
  record, no on-demand event row (no parsing lock was taken), and the function returns normally so
  the MQ message is accepted, not retried or sent to the dead-letter queue.
- **Who passes a policy.** Only the workers pass `getCatalogAdmissionPolicy`. The API never calls
  `parseRSSFeedAndSaveToDatabase`, and test-assets mode uses its own branch, so neither is gated.
- **v4 migration tooling stays ungated.** `seedCatalogApply.ts` and `importFlaggedFeeds.ts` call
  `FeedService.getOrCreate` directly for the migration; leave them as they are.
- **No list filtering, no `podcast_index_ids` parameter (R53, R54).** Do not touch any list
  route, ORM list query, or web list call in this plan or anywhere else for these rows.

## Parser

### `packages/parser/src/config/types.ts`

Append at the end of the file:

```typescript
/** The catalog settings that decide whether the parser may store a feed it has no row for. */
export type ParserCatalogAdmissionPolicy = {
  musicEnabled: boolean;
  podcastIndexIdAllowlist: readonly number[] | null;
};
```

`packages/parser/src/index.ts` already re-exports `./config/index.js`, which re-exports this file;
do not edit `index.ts`. The workers' `CatalogConfig` from plan 10 is structurally assignable to
this type, so the parser does not depend on `@podverse/helpers-config`.

### `packages/parser/src/context.ts`

- Add `import type { ParserCatalogAdmissionPolicy } from './config/types.js';` to the existing
  `import type { ParserConfig } from './config/types.js';` line (one line, both names).
- Add `getCatalogAdmissionPolicy?: () => ParserCatalogAdmissionPolicy;` as the last field of both
  the `_context` type and the `setParserContext` parameter type.
- After `getOptionalIndexProvider`, add:

```typescript
/** Null when the app passed no catalog policy (API, test-assets). Read per call. */
export function getOptionalCatalogAdmissionPolicy(): ParserCatalogAdmissionPolicy | null {
  const read = getParserContext().getCatalogAdmissionPolicy;
  return read ? read() : null;
}
```

### `packages/parser/src/factory.ts`

- Import `ParserCatalogAdmissionPolicy` on the existing `import type { ParserConfig }` line.
- Add `getCatalogAdmissionPolicy?: () => ParserCatalogAdmissionPolicy;` as the last field of
  `ParserContext` and of `CreateParserContextParams`.
- Destructure it in `createParserContext` (`const { config, notificationsContext,
  firebaseContext, getCatalogAdmissionPolicy } = params;`) and add it as the last property of the
  `context` object.

### `packages/parser/src/lib/rss/errors.ts`

Append:

```typescript
export type FeedNotInCatalogReason = 'not_on_allowlist' | 'music' | 'medium_unknown';

/** The instance's catalog settings refuse a feed that has no stored row. */
export class FeedNotInCatalogError extends Error {
  readonly reason: FeedNotInCatalogReason;

  constructor(podcastIndexId: number, reason: FeedNotInCatalogReason) {
    super(`Feed not added: podcast_index_id=${podcastIndexId} reason=${reason}`);
    this.name = 'FeedNotInCatalogError';
    this.reason = reason;
  }
}
```

### `packages/parser/src/lib/rss/feed/catalogAdmission.ts` (new)

```typescript
import { getOptionalCatalogAdmissionPolicy, getOptionalIndexProvider } from '@parser/context.js';
import { loggerService } from '@parser/factories/loggerService.js';

import {
  getMediumEnumValue,
  isMusicMediumId,
  MediumEnum,
  resolveParserMaxFeedBodyBytes,
} from '@podverse/helpers';
import { detectDuckTypedPublisherMediumId } from '@podverse/parser-mapping';

import type { FeedNotInCatalogReason } from '../errors.js';
import { FeedNotInCatalogError } from '../errors.js';
import { getAndParseRSSFeed } from '../parser.js';

type AssertCatalogAdmitsNewFeedParams = {
  url: string;
  podcastIndexId: number;
  /** A listed id that Podcast Index merged into `podcastIndexId`. */
  catalogAllowlistSourcePodcastIndexId: number | undefined;
};

/**
 * Throws FeedNotInCatalogError when the catalog settings refuse a feed with no stored row.
 * Callers run this only after every stored-row lookup came back empty.
 */
export async function assertCatalogAdmitsNewFeed({
  url,
  podcastIndexId,
  catalogAllowlistSourcePodcastIndexId,
}: AssertCatalogAdmitsNewFeedParams): Promise<void> {
  const policy = getOptionalCatalogAdmissionPolicy();
  if (policy === null) {
    return;
  }

  const { podcastIndexIdAllowlist } = policy;
  if (podcastIndexIdAllowlist !== null) {
    const listed =
      podcastIndexIdAllowlist.includes(podcastIndexId) ||
      (catalogAllowlistSourcePodcastIndexId !== undefined &&
        podcastIndexIdAllowlist.includes(catalogAllowlistSourcePodcastIndexId));
    if (!listed) {
      throw new FeedNotInCatalogError(podcastIndexId, 'not_on_allowlist');
    }
  }

  if (!policy.musicEnabled) {
    const reason = await readMusicRefusal(url, podcastIndexId);
    if (reason !== null) {
      throw new FeedNotInCatalogError(podcastIndexId, reason);
    }
  }
}

async function readMusicRefusal(
  url: string,
  podcastIndexId: number
): Promise<FeedNotInCatalogReason | null> {
  const indexProvider = getOptionalIndexProvider();
  if (indexProvider === null) {
    return 'medium_unknown';
  }

  const lookup = await indexProvider.getFeedById(String(podcastIndexId));
  if (lookup.status !== 'found') {
    return 'medium_unknown';
  }

  const mediumId = getMediumEnumValue(lookup.value.medium);
  if (isMusicMediumId(mediumId)) {
    return 'music';
  }
  if (mediumId !== MediumEnum.Publisher) {
    return null;
  }

  try {
    const parsedFeed = await getAndParseRSSFeed(
      url,
      resolveParserMaxFeedBodyBytes(process.env.PARSER_MAX_FEED_BODY_BYTES)
    );
    return isMusicMediumId(detectDuckTypedPublisherMediumId(parsedFeed)) ? 'music' : null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    loggerService.warn(
      `assertCatalogAdmitsNewFeed: publisher fetch failed podcast_index_id=${podcastIndexId} url=${url} reason=${message}`
    );
    return 'medium_unknown';
  }
}
```

Notes for the implementer:

- `getMediumEnumValue(null)` returns the podcast medium, so a feed with no medium is admitted.
- `getAndParseRSSFeed` throws instead of returning null; there is no null branch.
- `feed.ts` already imports `getAndParseRSSFeed` from `../parser.js`; this module has the same
  import cycle and it is safe because both are used only inside functions.
- `MediumEnum` is a value enum exported from `@podverse/helpers` (`lib/medium.ts`).

### `packages/parser/src/lib/rss/feed/feed.ts`

- Import `assertCatalogAdmitsNewFeed` from `./catalogAdmission.js` (after the
  `./classifyFeedParseFailure.js` import).
- Change the signature and the non-test-assets branch:

```typescript
export type HandleGetRSSFeedOptions = {
  catalogAllowlistSourcePodcastIndexId?: number;
};

export const handleGetRSSFeed = async (
  url: string,
  podcast_index_id: number,
  options: HandleGetRSSFeedOptions = {}
): Promise<Feed> => {
```

and in the `else` branch, replace the final `if (!feed) { feed = await feedService.getOrCreate(...) }`
with:

```typescript
    if (!feed) {
      feed = await feedService.getByUrl({ url });
    }

    if (!feed) {
      await assertCatalogAdmitsNewFeed({
        url,
        podcastIndexId: podcast_index_id,
        catalogAllowlistSourcePodcastIndexId: options.catalogAllowlistSourcePodcastIndexId,
      });
      feed = await feedService.getOrCreate({ url, podcast_index_id });
    }
```

The `getByUrl` lookup is new: `getOrCreate` would return a row stored under this URL with another
Podcast Index id, so the gate must see that row as stored. Leave the test-assets branch as it is.
The started `handleGetRSSFeed` timer is closed by `timerManager.endAll()` in the parser's
`finally` when the gate throws.

### `packages/parser/src/lib/rss/parser.ts`

- `ParseRSSFeedAndSaveToDatabaseOptions`: add after `suppressNewItemSideEffectsPublishedBeforeMs`:

```typescript
  /**
   * A listed Podcast Index id that was merged into this feed's id. Lets the catalog allowlist
   * admit the surviving show.
   */
  catalogAllowlistSourcePodcastIndexId?: number;
```

- At the top of `parseRSSFeedAndSaveToDatabase`, change
  `const { onDemandParserEvent } = options;` to
  `const { onDemandParserEvent, catalogAllowlistSourcePodcastIndexId } = options;` and change the
  `handleGetRSSFeed` call to:

```typescript
    feed = await handleGetRSSFeed(url, podcast_index_id, {
      catalogAllowlistSourcePodcastIndexId,
    });
```

  `exactOptionalPropertyTypes` is off in this repo, so passing `undefined` is fine.
- Add `FeedNotInCatalogError` to the `./errors.js` import.
- In the `catch (error)` block, add a branch directly after the `FeedIsParsingError` branch,
  before `FeedNoChangesSinceLastParsedError`:

```typescript
    } else if (error instanceof FeedNotInCatalogError) {
      loggerService.info(error.message);
      return { remoteItemsToParse: [], imageHints };
```

  `feed` is null on this path, so the `finally` block writes nothing and no on-demand event row is
  created. Do not change remote-item options: remote items never inherit
  `catalogAllowlistSourcePodcastIndexId`.

## Workers

### `apps/workers/src/index.ts`

- Add `getCatalogConfig` to the destructured names from the dynamic
  `await import('@workers/config/index.js')` (the block that lists `getBaseConfig`,
  `getMQConfig`, `getPodcastIndexConfig`, …). Plan 12 adds `getCatalogConfig` to that module.
- In the `if (categories.has(CATEGORY_PARSER))` block, pass the policy reader to
  `createParserContext`:

```typescript
        createParserContext({
          config: parserConfig,
          notificationsContext,
          firebaseContext,
          getCatalogAdmissionPolicy: getCatalogConfig,
        });
```

Every command with `CATEGORY_PARSER` has `CATEGORY_CATALOG` (plan 12), so the keys are validated
before this runs. Every parser command that saves directory feeds also has
`CATEGORY_PODCAST_INDEX`, so the index provider exists for the Music check.

Do not change `apps/api/src/index.ts`, `tools/**`, or any test-assets setup.

## Tests

- `packages/parser/src/lib/rss/feed/catalogAdmission.test.ts` (new). Mock `@parser/context.js`
  (`getOptionalCatalogAdmissionPolicy`, `getOptionalIndexProvider`),
  `@parser/factories/loggerService.js`, and `../parser.js` (`getAndParseRSSFeed`), following the
  `vi.hoisted` pattern in `feed.handleRequestRSSFeed.test.ts`. One `describe`, cases:
  - No policy: resolves; the provider is not called.
  - Open policy (`musicEnabled: true`, allowlist null): resolves; the provider is not called.
  - Allowlist `[1, 2]`, id 3: rejects with `FeedNotInCatalogError` reason `not_on_allowlist`;
    the provider is not called.
  - Allowlist `[1]`, id 9 with `catalogAllowlistSourcePodcastIndexId: 1`: resolves.
  - Music off, provider `found` with medium `music`, then `musicL`: rejects with `music`.
  - Music off, medium `podcast`, then medium null: resolves.
  - Music off, medium `publisher`, parsed feed with remote items mostly `music`: rejects with
    `music`; mostly `podcast`: resolves; `getAndParseRSSFeed` throws: rejects with
    `medium_unknown`.
  - Music off, provider `not_found`, `unavailable`, and provider null: each rejects with
    `medium_unknown`.
  - Allowlist `[5]`, id 5, Music off, medium `music`: rejects with `music` (both checks apply).
- `packages/parser/src/lib/rss/feed/feed.handleGetRSSFeed.test.ts` (new). Mock
  `@parser/factories/timerManager.js`, `../../../context.js` (`getParserConfig` returning
  `{ testAssetsMode: false }`), `./catalogAdmission.js`, and `@podverse/orm` (`FeedService` with
  `getByUrlAndPodcastIndexId`, `getByPodcastIndexId`, `getByUrl`, `getOrCreate`; `FeedLogService`
  as an empty class). Cases:
  - A row found by URL and id is returned; the gate and `getOrCreate` are not called.
  - A row found only by URL is returned; the gate and `getOrCreate` are not called.
  - No row: the gate is called with the url, id, and the source id from options, then
    `getOrCreate`.
  - No row and the gate rejects: `getOrCreate` is not called and the error propagates.
- `parser.parseRSSFeedAndSaveToDatabase.hash-and-failure.test.ts`: add one case to the existing
  `describe`: `handleGetRSSFeedMock` rejects with `new FeedNotInCatalogError(77, 'music')`. The
  call resolves with `remoteItemsToParse: []`; `handleRequestRSSFeedMock`, `feedServiceUpdateMock`,
  `onDemandCreateMock`, and `logErrorMock` are not called. Also assert `handleGetRSSFeedMock` was
  called with a third argument `{ catalogAllowlistSourcePodcastIndexId: 12 }` when the options
  passed `catalogAllowlistSourcePodcastIndexId: 12`.

## Release scratchpad

```markdown
## Workers add only allowlisted feeds, and no music while Music is off

- Surfaces: workers
- Change: before the parser creates a feed row it has never stored, it checks the instance
  catalog settings. With `CATALOG_PODCAST_INDEX_ID_ALLOWLIST` set, only listed Podcast Index ids
  (or the surviving show of a listed id that Podcast Index merged) are added. With
  `CATALOG_MUSIC_DISABLED=true`, feeds whose Podcast Index medium is music, or publisher feeds
  that list mostly music, are not added; when the medium cannot be read the feed is skipped and
  retried on a later run. Feeds already stored are never checked: they keep refreshing, and no
  stored row is removed or hidden. A skipped feed is logged at info level and its queue message is
  accepted. Applies to every worker add path: MQ add, trending, the parser commands, remote
  items, the on-demand add, OPML import, and the dev seeders. v4 migration commands are not
  affected.
- Who notices: operators of narrowed instances; blank settings keep today's behavior
- Operator steps: none beyond the catalog keys
```
