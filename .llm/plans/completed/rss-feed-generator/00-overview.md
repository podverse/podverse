# RSS Feed Generator — Sub-Plans Overview

Parent plan: **RSS Feed Generator Tool** (high-level plan in Cursor plan file or repo docs). Detailed execution: [EXECUTION.md](EXECUTION.md).

## Purpose

Detailed sub-plans for implementing a CLI that generates valid, tag-rich RSS feeds (RSS 2.0 + iTunes + Podcast Namespace 2.0) using faker. The generator is **consolidated in `tools/test-assets`** (no separate `tools/rss-feed-generator` package). Output is written under `tools/test-assets/assets/` (flat; feeds and media are siblings) for serving by the existing test-assets HTTP server at `http://localhost:2111/<filename>`.

## Execution Order

**All sub-plans 01–06 completed** (see `../completed/rss-feed-generator/`). Sub-plans 04 and 05 were skipped and moved to completed.

| Step | File | Summary |
| ---- | ---- | ------- |
| ✓ | [06-jpeg-mp3-mp4-assets.md](../completed/rss-feed-generator/06-jpeg-mp3-mp4-assets.md) | **Completed.** Assets first: JPEG/MP3/MP4 (max 100 each); skip if exists |
| ✓ | [01-scaffold-cli.md](../completed/rss-feed-generator/01-scaffold-cli.md) | **Completed.** Scaffold/CLI consolidated in test-assets |
| ✓ | [02-channel-item-core-itunes.md](../completed/rss-feed-generator/02-channel-item-core-itunes.md) | **Completed.** RSS 2.0 + iTunes channel/item elements |
| ✓ | [03-podcast-namespace-simple.md](../completed/rss-feed-generator/03-podcast-namespace-simple.md) | **Completed.** Podcast namespace simple tags |
| ✓ | [04-complex-tags-placeholders.md](../completed/rss-feed-generator/04-complex-tags-placeholders.md) | **Completed (skipped).** Placeholder docs for value, alternateEnclosure, liveItem, etc. |
| ✓ | [05-podcast-index-id-placeholder.md](../completed/rss-feed-generator/05-podcast-index-id-placeholder.md) | **Completed (skipped).** Placeholder for podcast_index_id / podcast:id |
| — | [10-test-data-spec.md](10-test-data-spec.md) | **Test data rules** (media, multi count, medium, remoteItem, live items) |

After **each** plan, run the test commands in that plan’s “Run after this plan” section to confirm feeds and assets are built as expected.

## Deferred work (future plans)

Implementation work that was in “later sub-plan” / “future” sections has been moved to separate plan files under `future/`. Execute when the feature is needed:

| File | Purpose |
| ---- | ------- |
| [future/07-complex-tags-implementation.md](future/07-complex-tags-implementation.md) | Full XML for value, alternateEnclosure, liveItem, remoteItem/podroll, publisher |

[08-podcast-index-id-implementation.md](../completed/rss-feed-generator/08-podcast-index-id-implementation.md) is in completed; handled by Podcast Index service mock.

## Test data specifications

All generated feeds and media must follow the rules in **[10-test-data-spec.md](10-test-data-spec.md)**. Summary: nine feed types per set (5 non-season: feed-{N}, feed-podcast-{N}, feed-video-{N}, feed-music-{N}, feed-publisher-{N}; 4 season: feed-season-{N}, feed-podcast-season-{N}, feed-video-season-{N}, feed-music-season-{N}); count = number of sets (9 feeds per set); default 20 items per feed (`--items`); multi-value tags (funding, person, etc.) default 2 (`--multi`, non-item only); media at localhost:2111, cap 100 per type; publisher remote items same medium; remoteItem/podroll point to already-written feeds. See the spec file for full detail.

## Validation Between Steps

After each sub-plan: (1) Run the commands in that plan’s **“Run after this plan”** section to generate feeds/assets and confirm output. (2) Optionally parse a generated feed with Partytime and run parser-mapping compat. Fix any errors before proceeding.

## Alignment with Lighthouse / test-assets

**Current structure (consolidated):**

- **Single package:** Feed generation lives in `tools/test-assets` (`generate-feed-cli.ts`, `run-generate-feed-cli.ts`). There is no separate `tools/rss-feed-generator` package.
- **Directory layout:** Flat `tools/test-assets/assets/`. Feeds and media (image-NNN.jpg, audio-NNN.mp3, video-NNN.mp4, feed-*.rss) are siblings. No namespace subdirectories.
- **Base URL:** Feeds and asset URLs use `http://localhost:2111/<filename>` (e.g. `http://localhost:2111/feed-1.rss`, `http://localhost:2111/image-001.jpg`). The same AssetServer serves the whole `assets/` directory.
- **AssetGenerator:** From `podverse-test-assets`. The generate CLI calls it with `namespace: ''` (flat assets), runs `ensureMediaAssets()` before writing feeds (cap 100 per type; skip if file exists), then writes RSS that references those filenames.
- **AssetServer:** Single server (started by the consumer, e.g. Lighthouse or `npm run start -w podverse-test-assets`). The generator does not start the server; it only writes files under `assets/`.

**Run command:** From repo root: `npm run generate -w podverse-test-assets -- <count> [--items N] [--multi N]`. Or from `tools/test-assets`: `npm run generate -- <count> ...`.


## Key References

- Partytime: `partytime/src/parser/types.ts`, `feed.ts`, `item.ts`, `phase/phase-*.ts`
- Parser-mapping: `packages/parser-mapping/src/compat/partytime/channel.ts`, `item.ts`, `value.ts`
- Test assets: `tools/test-assets/TOOLS-TEST-ASSETS.md`, `tools/test-assets/assets/` (flat; e.g. `feed-1.rss`, `image-001.jpg`)
- Lighthouse usage: `tools/web-perf/lighthouse/src/index.ts` (AssetGenerator + AssetServer), `tools/test-assets/src/asset-server.ts` (serves `assets/` at http://localhost:2111)
