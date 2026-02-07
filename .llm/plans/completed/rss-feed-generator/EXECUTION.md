# RSS Feed Generator — Execution Guide

## Alignment with Lighthouse / test-assets

- **Layout:** Flat `tools/test-assets/assets/` (feeds and media as siblings). URLs: `http://localhost:2111/<filename>` (e.g. `http://localhost:2111/feed-1.rss`, `http://localhost:2111/image-001.jpg`). Same `AssetGenerator` and `AssetServer` from `podverse-test-assets`.
- **Run:** From repo root: `npm run generate -w podverse-test-assets -- <count> [--items N] [--multi N]`. Or: `cd tools/test-assets && npm run generate -- <count> ...`. Consumer starts AssetServer. See [00-overview.md](00-overview.md) “Alignment with Lighthouse / test-assets.”

## Order

**06, 01, 02, 03, 04, and 05 are completed** (see [../completed/rss-feed-generator/](../completed/rss-feed-generator/)). Sub-plans 04 and 05 were skipped and moved to completed. No remaining active sub-plans. Media files must exist before RSS feeds are generated.

- **Done:** [06-jpeg-mp3-mp4-assets.md](../completed/rss-feed-generator/06-jpeg-mp3-mp4-assets.md), [01-scaffold-cli.md](../completed/rss-feed-generator/01-scaffold-cli.md), [02-channel-item-core-itunes.md](../completed/rss-feed-generator/02-channel-item-core-itunes.md), [03-podcast-namespace-simple.md](../completed/rss-feed-generator/03-podcast-namespace-simple.md), [04-complex-tags-placeholders.md](../completed/rss-feed-generator/04-complex-tags-placeholders.md), [05-podcast-index-id-placeholder.md](../completed/rss-feed-generator/05-podcast-index-id-placeholder.md), [08-podcast-index-id-implementation.md](../completed/rss-feed-generator/08-podcast-index-id-implementation.md) (handled by Podcast Index mock).
- **Next:** None; see [future/07-complex-tags-implementation.md](future/07-complex-tags-implementation.md) when complex tags are needed.

## Run a test after each plan

After each implementation sub-plan:

- Run the generator (e.g. from repo root: `npm run generate -w podverse-test-assets -- 1 --items 20 --multi 2`, or from `tools/test-assets`: `npm run generate -- 1 --items 20 --multi 2`). Count = number of sets; each set produces nine feed types (5 non-season + 4 season; see [10-test-data-spec.md](10-test-data-spec.md)).
- Parse the generated feed with Partytime (from partytime repo or via dependency).
- Run parser-mapping compat on the parsed result (or run full parser pipeline if available).
- Fix any parse or compat errors before proceeding.

Each plan also has a **Run after this plan** section with concrete commands. **CLI:** `<count>` = sets (9 feeds per set); `--items` = items per feed (default 20); `--multi` = multi-value tag count for funding, person, etc. (default 2, non-item only).

## Prompting for Each Sub-Plan

All sub-plans 01–05 are completed (04 and 05 skipped and moved to completed). Next work: [future/07-complex-tags-implementation.md](future/07-complex-tags-implementation.md) (overview); execute 07a → 07b → 07c → 07d from future/07a-value.md, 07b-alternate-enclosure.md, 07c-live-item.md, 07d-remote-item-podroll-publisher.md. Run each plan’s “Run after this plan” commands before the next.

## File Index


| File                                                                                         | Purpose                                                    |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [00-overview.md](00-overview.md)                                                             | Index and execution order                                  |
| [01-scaffold-cli.md](../completed/rss-feed-generator/01-scaffold-cli.md)                     | **Completed.** Scaffold & CLI                              |
| [02-channel-item-core-itunes.md](../completed/rss-feed-generator/02-channel-item-core-itunes.md) | **Completed.** RSS 2.0 + iTunes                             |
| [03-podcast-namespace-simple.md](../completed/rss-feed-generator/03-podcast-namespace-simple.md) | **Completed.** Podcast simple tags                          |
| [04-complex-tags-placeholders.md](../completed/rss-feed-generator/04-complex-tags-placeholders.md) | **Completed (skipped).** Complex tags placeholder          |
| [05-podcast-index-id-placeholder.md](../completed/rss-feed-generator/05-podcast-index-id-placeholder.md) | **Completed (skipped).** Podcast Index ID placeholder   |
| [06-jpeg-mp3-mp4-assets.md](../completed/rss-feed-generator/06-jpeg-mp3-mp4-assets.md)       | **Completed.** JPEG/MP3/MP4 (max 100 each; skip if exists)  |
| [10-test-data-spec.md](10-test-data-spec.md)                                                 | Test data rules (media, multi, medium, remoteItem, live)   |
| [future/07-complex-tags-implementation.md](future/07-complex-tags-implementation.md)         | Deferred: complex tags (overview); sub-plans 07a–07d       |
| [08-podcast-index-id-implementation.md](../completed/rss-feed-generator/08-podcast-index-id-implementation.md) | **Completed (Podcast Index mock).** podcast:id emit/parser |


