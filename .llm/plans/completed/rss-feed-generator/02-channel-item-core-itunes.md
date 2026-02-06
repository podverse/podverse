# Sub-Plan 2: Channel/Item Core + iTunes

## Objective

Extend the generator so every RSS 2.0 and iTunes channel and item element expected by Partytime and parser-mapping is present and valid. No podcast namespace yet; focus on core RSS + iTunes.

**Test data spec:** See [10-test-data-spec.md](10-test-data-spec.md). Nine feed types per set (5 non-season + 4 season); count = sets; channel has `--items` count (default 20); multi-value (non-item) use `--multi` (default 2). Medium: one of publisher, podcast, music, video, or no medium tag per feed type. All image/enclosure URLs point to localhost:2111; ensure file exists; reuse media, caps 100/100/100.

## Authority

- Partytime: `partytime/src/parser/feed.ts` (channel), `partytime/src/parser/item.ts` (item); types in `partytime/src/parser/types.ts` (`BasicFeed`, `Episode`).
- Parser-mapping: `packages/parser-mapping/src/compat/partytime/channel.ts` (e.g. `compatChannelDto`, `compatChannelAboutDto`, `compatChannelCategoryDtos`, `compatChannelImageDtos`), `packages/parser-mapping/src/compat/partytime/item.ts` (e.g. `compatItemDto`, `compatItemAboutDto`, `compatItemDescriptionDto`, `compatItemImageDtos`).

## Channel Elements to Emit

All elements listed below are **required** in generated test feeds except **itunes:newFeedUrl**.

### RSS 2.0 (from feed.ts / BasicFeed)

- `title` — required; use faker (e.g. sentence or company name).
- `description` — required; use faker (paragraph or summary).
- `link` — required; use base URL (e.g. `http://localhost:2111/`) or faker URL.
- `language` — required; e.g. `en` or faker locale.
- `image` — required; child `url` (and optionally `title`, `link`). Use image under flat assets (e.g. `http://localhost:2111/image-001.jpg`).
- `copyright`, `webMaster`, `managingEditor` — required; faker company/sentence.
- `ttl` — required; number (minutes).
- `lastBuildDate`, `pubDate` — required; RFC 2822 dates; can derive from faker date.
- `generator` — required; e.g. `podverse-rss-feed-generator`.

### iTunes (from feed.ts)

- `itunes:title` — required; faker or same as title.
- `itunes:summary` — required; faker paragraph (maps to summary).
- `itunes:image` — required; href attribute; same URL as channel image or item image.
- `itunes:category` — required; array; use valid Apple categories (e.g. Technology, Business); at least one.
- `itunes:explicit` — required; emit `yes` or `no`.
- `itunes:block` — required; `yes`/`no`.
- `itunes:complete` — required; `yes`/`no`.
- `itunes:type` — required; `episodic` or `serial`.
- `itunes:owner` — required; child `itunes:name`, `itunes:email`; faker name and email.
- `itunes:newFeedUrl` — **optional**; URL if needed for redirect tests.

Ensure XML uses `xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"` (or equivalent) so iTunes elements are in scope.

## Item Elements to Emit

All elements listed below are **required** in generated test feeds, except **itunes:season** and **itunes:episode**, which are required only on season feed types (see Season vs non-season feeds); on non-season feeds omit both.

### RSS 2.0 (from item.ts / Episode)

- `title` — required; faker sentence.
- `description` — required; faker paragraph.
- `link` — required; faker or item page URL.
- `guid` — required; unique per item; use faker uuid or permalink-style string; `isPermaLink="false"` if not a URL.
- `pubDate` — required; RFC 2822; faker date in past.
- `enclosure` — required; attributes `url`, `type`, `length`; url points to flat assets (e.g. `http://localhost:2111/audio-001.mp3` or `video-001.mp4`); type e.g. `audio/mpeg` or `video/mp4`; length can be 0 or faker number.

### Enclosure and medium

The **enclosure** chosen for each item (audio vs video) must **align with the feed's medium type**: podcast/music (or no medium) → audio enclosure (e.g. `audio/mpeg`); video → video enclosure (e.g. `video/mp4`). Publisher feeds follow their referenced medium. **Medium type is implemented in Sub-Plan 03.** In 02, treat feed type as unknown or use a placeholder; once 03 is in place, wire enclosure selection to the feed's medium so every generated feed uses the correct enclosure type.

### iTunes (item)

- `itunes:author` — required; faker name.
- `itunes:title` — required; faker or same as title.
- `itunes:summary` — required; faker paragraph.
- `itunes:image` — required; href; image under flat assets (e.g. `http://localhost:2111/image-001.jpg`).
- `itunes:explicit` — required; `yes`/`no`.
- `itunes:duration` — required; emit seconds or HH:MM:SS string (Partytime parses both); use faker number or fixed (e.g. 3600).
- `itunes:season` — required **only on season feed types** (feed-season-*, feed-podcast-season-*, feed-video-season-*, feed-music-season-*); integer. On all other feed types omit.
- `itunes:episode` — required **only on season feed types**; integer. On all other feed types omit. If there is no season, do not emit itunes:episode.
- `itunes:episodeType` — required on season feeds; `full`, `trailer`, or `bonus`. Omit on non-season feeds.
- `itunes:keywords` — required; comma-separated; faker words.

### content:encoded

- `content:encoded` — required; Partytime uses for description fallback; faker paragraph; use `xmlns:content="http://purl.org/rss/1.0/modules/content/"` if needed.

### Season vs non-season feeds

- **Non-season feeds (5 types)** — Do **not** emit `itunes:season` or `itunes:episode`: feed-{N}.rss (no medium), feed-podcast-{N}.rss, feed-video-{N}.rss, feed-music-{N}.rss, feed-publisher-{N}.rss.
- **Season feeds (4 types)** — Emit both `itunes:season` and `itunes:episode` per item (e.g. one season per feed, 10 items per season, episode numbers 1..10): feed-season-{N}.rss (no medium), feed-podcast-season-{N}.rss, feed-video-season-{N}.rss, feed-music-season-{N}.rss.
- **Rule:** No season ⇒ no episode.

## Implementation Steps

1. **XML namespaces** — Add `itunes` and `content` namespaces to root `<rss>` where required.
2. **Channel builder** — Refactor generator to build channel from a data object; populate all fields above with faker (or fixed values for booleans/dates). Escape XML entities in text nodes.
3. **Item builder** — Same for item. Support N items per channel (N from CLI multi param: default 2, or random in range). See [10-test-data-spec.md](10-test-data-spec.md).
4. **Date formatting** — Use RFC 2822 for `pubDate`, `lastBuildDate` (e.g. `toUTCString()` or a small formatter).
5. **Validation** — Generate one feed with all fields, run Partytime parse, then parser-mapping compat; fix any missing or wrongly shaped fields.

## Acceptance Criteria

- Generated feed includes all listed RSS 2.0 and iTunes channel/item elements with valid values (faker or placeholders).
- Partytime parses the feed and produces `FeedObject` with `items`; each `Episode` has required fields (guid, enclosure, duration, explicit, etc.).
- Parser-mapping `compatChannelDto`, `compatChannelAboutDto`, `compatChannelCategoryDtos`, `compatChannelImageDtos`, `compatItemDto`, `compatItemAboutDto`, `compatItemDescriptionDto`, `compatItemImageDtos` run without throwing and produce expected shapes.

## Run after this plan

From repo root:

```bash
npm run generate -w podverse-test-assets -- 2
```

Or from the tool: `cd tools/test-assets && npm run generate -- 2`.

Confirm:

1. Nine feed types per set (5 non-season + 4 season); e.g. count=2 produces 18 feed files under `tools/test-assets/assets/`. All contain full RSS 2.0 + iTunes channel/item elements (all required except itunes:newFeedUrl).
2. Non-season feeds have no itunes:season or itunes:episode; season feeds have both per item. Each channel has `--items` count (default 20). Medium is one of publisher, podcast, music, video, or absent per feed type.
3. Image and enclosure URLs point to `http://localhost:2111/<filename>` (flat assets); those files should exist (assets created in plan 06). Open one feed and one image URL in a browser (with AssetServer running) to confirm.

## Out of Scope

- Podcast namespace tags (Sub-Plan 3).
- Actual image/audio files (Sub-Plan 06 runs first).
