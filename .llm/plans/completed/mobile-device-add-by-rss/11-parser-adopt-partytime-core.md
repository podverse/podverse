**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

# 11 — Server parser adopts `podverse-partytime/core`

Point `podverse-partytime` at the sibling checkout plan 10 built, and move every monorepo import
to the `podverse-partytime/core` entry, so the server parses feeds with the same entry point
mobile uses. An ESLint rule keeps it that way.

This plan links the sibling checkout plan 10 built. It does not commit or publish partytime, and it
does not stop for a person.

## Rows

R10

## Runs after

10

## Files

- packages/parser/package.json
- package-lock.json
- eslint.config.mjs
- packages/parser/src/lib/rss/addByRSS.ts
- packages/parser/src/lib/rss/parser.ts
- packages/parser/src/lib/rss/parser.getAndParseRSSFeed.test.ts
- packages/parser/src/lib/rss/feed/feed.ts
- packages/parser/src/lib/rss/hash/parsedFeed.ts
- packages/parser/src/lib/rss/liveItem/liveItem.ts
- packages/parser/src/lib/rss/channel/channel.ts
- packages/parser/src/lib/rss/channel/channelAbout.ts
- packages/parser/src/lib/rss/channel/channelCategory.ts
- packages/parser/src/lib/rss/channel/channelChat.ts
- packages/parser/src/lib/rss/channel/channelDescription.ts
- packages/parser/src/lib/rss/channel/channelFunding.ts
- packages/parser/src/lib/rss/channel/channelImage.ts
- packages/parser/src/lib/rss/channel/channelLicense.ts
- packages/parser/src/lib/rss/channel/channelLocation.ts
- packages/parser/src/lib/rss/channel/channelPerson.ts
- packages/parser/src/lib/rss/channel/channelPodroll.ts
- packages/parser/src/lib/rss/channel/channelPublisher.ts
- packages/parser/src/lib/rss/channel/channelRemoteItem.ts
- packages/parser/src/lib/rss/channel/channelSeason.ts
- packages/parser/src/lib/rss/channel/channelSocialInteract.ts
- packages/parser/src/lib/rss/channel/channelTrailer.ts
- packages/parser/src/lib/rss/channel/channelTxt.ts
- packages/parser/src/lib/rss/channel/channelValue.ts
- packages/parser/src/lib/rss/item/item.ts
- packages/parser/src/lib/rss/item/itemAbout.ts
- packages/parser/src/lib/rss/item/itemChaptersFeed.ts
- packages/parser/src/lib/rss/item/itemChat.ts
- packages/parser/src/lib/rss/item/itemDescription.ts
- packages/parser/src/lib/rss/item/itemEnclosure.ts
- packages/parser/src/lib/rss/item/itemImage.ts
- packages/parser/src/lib/rss/item/itemLicense.ts
- packages/parser/src/lib/rss/item/itemLocation.ts
- packages/parser/src/lib/rss/item/itemPerson.ts
- packages/parser/src/lib/rss/item/itemSeason.ts
- packages/parser/src/lib/rss/item/itemSeasonEpisode.ts
- packages/parser/src/lib/rss/item/itemSocialInteract.ts
- packages/parser/src/lib/rss/item/itemSoundbite.ts
- packages/parser/src/lib/rss/item/itemTranscript.ts
- packages/parser/src/lib/rss/item/itemTxt.ts
- packages/parser/src/lib/rss/item/itemValue.ts
- apps/web/src/utils/addByRSS/actions.publisherListedFeeds.test.ts
- apps/web/src/utils/addByRSS/actions.test.ts
- apps/web/src/utils/addByRSS/albumTracks.test.ts
- apps/web/src/utils/addByRSS/listedFeeds.test.ts
- release-notes/scratchpad.md

## Step 1 — Use the sibling build

The monorepo root and `../partytime` are siblings. Do not commit, tag, or publish that checkout,
and do not run `npm link` (a global link disappears on the next install).

1. If `../partytime/dist/core.js` or `../partytime/dist/core.d.ts` is missing, run `npm run build`
   in `../partytime`.
1. Read `../partytime/package.json` and confirm `exports` has `"./core"`.
1. Continue to step 2. Do not query the npm registry and do not report BLOCKED.

## Step 2 — Point the dependency at the sibling checkout

- `packages/parser/package.json`: `"podverse-partytime": "^5.1.0"` becomes
  `"file:../../../partytime"`. From `packages/parser` that path is the sibling checkout.
- Do not run `./scripts/development/update-lockfile-linux.sh`. That script copies this repo into
  a temporary directory and installs there; the sibling path is outside that copy, so the install
  fails. Run `npm install` from the repo root so host `node_modules` links the checkout.
- Confirm `node_modules/podverse-partytime/package.json` has the `"./core"` export, and that
  `node_modules/podverse-partytime/dist/core.js` exists.
- The `file:` specifier is this machine's stand-in. Before this dependency is committed for other
  machines, publish partytime and replace `file:../../../partytime` with the published range in
  `packages/parser` and `apps/mobile`, then run `./scripts/development/update-lockfile-linux.sh`.
  Say that in the final message. Do not do it in this plan.

## Step 3 — Switch every import to `core`

Mechanical replacement; keep each import's line position and its `import type` / value split
(**type-imports-separate-line**).

- In every `packages/parser/src/**` file in `## Files`, change `from 'podverse-partytime'` to
  `from 'podverse-partytime/core'`. That covers the `import type { FeedObject }` and
  `import type { Episode }` lines and the two value imports of `parseFeed` (`addByRSS.ts`,
  `parser.ts`).
- `packages/parser/src/lib/rss/liveItem/liveItem.ts`: replace the two lines

  ```typescript
  import type { Episode } from 'podverse-partytime';
  import type { Phase4PodcastLiveItem } from 'podverse-partytime/dist/parser/phase/phase-4.js';
  ```

  with one line:

  ```typescript
  import type { Episode, Phase4PodcastLiveItem } from 'podverse-partytime/core';
  ```

- `packages/parser/src/lib/rss/parser.getAndParseRSSFeed.test.ts`: change both
  `vi.mock('podverse-partytime', …)` and `import { parseFeed } from 'podverse-partytime'` to
  `'podverse-partytime/core'`.
- `apps/web/src/utils/addByRSS/actions.test.ts`, `actions.publisherListedFeeds.test.ts`,
  `listedFeeds.test.ts`: merge the two imports into one, for example
  `import { FeedType, Phase4LiveStatus, Phase5Blocked } from 'podverse-partytime/core';`, and
  delete the `podverse-partytime/dist/parser/phase/phase-4.js` import.
- `apps/web/src/utils/addByRSS/albumTracks.test.ts`: change the import path to
  `'podverse-partytime/core'`.
- Do not touch `packages/parser-mapping`; it keeps its own `types/partytime.ts` and imports no
  partytime module.

Self-check, both must print nothing:

```bash
rg -n "from 'podverse-partytime'" apps packages --glob '!**/node_modules/**' --glob '!**/dist/**'
rg -n "podverse-partytime/dist" apps packages --glob '!**/node_modules/**' --glob '!**/dist/**'
```

The server keeps passing `maxFeedBodyBytes` on both `parseFeed` calls (`parser.ts`
`getAndParseRSSFeed`, `addByRSS.ts` `parseRSSFeedForAddByRSS`), so `PARSER_MAX_FEED_BODY_BYTES`
still applies through `@podverse/helpers`. The API and workers load `.env` themselves with
`@dotenvx/dotenvx` before importing the parser, so dropping partytime's own `dotenv.config()`
changes nothing they read. Do not call `setPartytimeLogger` or `setPartytimeLogLevel` on the
server: core's default sink writes `warn` and above to the console, the same levels pino wrote.

## Step 4 — ESLint guard

`eslint.config.mjs` has two `no-restricted-imports` blocks. A later flat-config block replaces an
earlier one for the files both match, so add the same two entries to both:

- the block with `files: ['apps/**/*.{ts,tsx,mts}', 'packages/**/*.{ts,tsx,mts}']` (covers
  `packages/parser`, `apps/mobile`, and non-test web files);
- the block with `files: ['apps/web/src/**/*.{ts,tsx}', 'apps/management-web/src/**/*.{ts,tsx}']`.

In each `paths` array:

```javascript
{
  name: 'podverse-partytime',
  message:
    'Import podverse-partytime/core. The package root loads Node-only modules (dotenv, pino, node-fetch, fs) and does not bundle for mobile.',
},
```

In each `patterns` array:

```javascript
{
  group: ['podverse-partytime/dist/*'],
  message:
    'Import podverse-partytime/core; it exports the Phase types, including Phase4LiveStatus and Phase4PodcastLiveItem.',
},
```

Keep the existing entries and their order; append these after them.

## Tests

- Update `packages/parser/src/lib/rss/parser.getAndParseRSSFeed.test.ts` (mock path only; its
  assertions stay).
- Update the four `apps/web/src/utils/addByRSS/*.test.ts` imports (no assertion changes).
- No new test: the ESLint rule enforces the entry point, and plan 10's portability test in
  partytime proves `core` loads no Node module. Existing `packages/parser` and
  `packages/parser-mapping` unit tests and the Add by RSS API integration tests cover parse
  behavior.

## Release scratchpad

Append to `release-notes/scratchpad.md` (or put it under "Release notes entry" in the final
message if this prompt shares its phase with other prompts):

```markdown
## Server feed parsing uses the portable partytime entry

- Surfaces: workers, api (through `@podverse/parser`)
- Change: `@podverse/parser` imports `podverse-partytime/core`, the same parser code mobile runs
  on the device. This checkout resolves the package through a `file:` link to the sibling
  `partytime` repo, not through a published version. On the server, partytime no longer loads
  `dotenv` or reads `PARTYTIME_LOG`; its warnings print as plain console lines instead of pino
  JSON lines. The feed size limit still comes from `PARSER_MAX_FEED_BODY_BYTES`.
- Who notices: operators reading worker and API logs
- Operator steps: before committing this dependency for other machines, publish partytime and
  replace `file:../../../partytime` with the published range, then run
  `./scripts/development/update-lockfile-linux.sh`
```

If `../partytime/release-notes/` describes `descriptionRaw` for this same unreleased work, add one
sentence: parsed items and feeds now carry `descriptionRaw`, which `@podverse/parser-mapping`
already reads.
