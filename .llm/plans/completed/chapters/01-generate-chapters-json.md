# Sub-plan 01: Generate and write chapters JSON (test-assets)

## Goal

When RSS feeds are generated, emit corresponding fake chapters JSON files under `assets/feeds/` so each item’s `<podcast:chapters url="..." type="application/json+chapters"/>` URL resolves. Constrain chapter timestamps to the item’s media duration; enforce at least 3 chapters per file and at least 10 seconds per chapter; support toc:false overlay chapters.

## References

- [Podcast namespace: chapters tag](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/chapters.md)
- [JSON Chapters format (1.2)](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/examples/chapters/jsonChapters.md)

## File to change

- [tools/test-assets/src/generate-feed-cli.ts](tools/test-assets/src/generate-feed-cli.ts)

## Requirements

- Chapters file timestamps must **not exceed** the media duration of the item’s enclosure (use existing `durationSec` per item).
- **Minimum 3 chapters** per media file (toc:true chapters that count toward “content”).
- **Minimum 10 seconds** per chapter (duration between startTime and next startTime or endTime).
- **toc: false** chapters are overlay segments (e.g. ads); they may overlap other chapters in time. Include 0–2 per file optionally.
- Write chapters JSON files under the same `feedsDir` as the RSS so the asset server serves them at `/feeds/<filename>`.

## Implementation

1. **Chapters JSON shape**
   - Root: `version: "1.2.0"`, `chapters: array`.
   - Each chapter: `startTime` (number, seconds), optional `endTime`, `title`, `img`, `url`, `toc` (boolean; default true). Optionally `location: { name, geo, osm? }` for a few entries.
   - Optionally add top-level `author`, `title`, `podcastName`, `description`, `fileName`, `waypoints` for realism (no need to persist these in this sub-plan).

2. **Per-item generation algorithm**
   - Input: `durationSec` (already computed in the item loop, 60–7200).
   - Build 3–6 toc:true chapters: non-overlapping segments, each segment length ≥ 10s, all within [0, durationSec]. E.g. divide timeline into 3+ segments of at least 10s each; assign startTime/endTime; add fake title, optional img/url.
   - Optionally append 0–2 toc:false chapters with random start/end within [0, durationSec] (may overlap toc:true).
   - Sort final array by startTime.

3. **URL and file naming**
   - Use a deterministic filename per (feed, item): e.g. `chapters-${feedBasename}-item-${i}.json` where `feedBasename = filename.replace(/\.rss$/i, '')`.
   - Chapters URL in the item: `${baseUrl}/feeds/chapters-${feedBasename}-item-${i}.json`.

4. **buildFeed return value**
   - Extend `BuildFeedResult` to include `chaptersToWrite: { filename: string; content: string }[]`.
   - In the item loop: (1) build chapters array (min 3, min 10s each, optional toc:false), (2) build full JSON object, (3) push `{ filename, content: JSON.stringify(...) }` to an array, (4) use the same filename in the item’s `<podcast:chapters url="..." type="application/json+chapters"/>`.

5. **Caller (runGenerateFeedAndAssets)**
   - After `fs.writeFileSync(filePath, xml)`, loop over `chaptersToWrite` and write each to `path.join(feedsDir, entry.filename)`.

## Optional: Content-Type when serving

The JSON chapters spec says the file "should be served with Content-type of 'application/json+chapters'".
Ensure the test-assets asset server sets this when serving chapters JSON under `/feeds/` (e.g. for
requests that match `*.json` and are under the chapters path, or all `.json` in feeds). Implement in
the serve path used by test-assets (e.g. [tools/test-assets/src/serve.ts](tools/test-assets/src/serve.ts) or
equivalent).

## Out of scope

- Schema or parser changes.
- Partytime (it does not parse chapters JSON).
