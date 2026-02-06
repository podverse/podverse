# Test Assets Tool

This tool owns the generation and serving of local test assets (images, media files,
and RSS feeds) for Lighthouse and other tooling.

## Asset Location

All assets are served from `http://localhost:2111/<subdir>/<filename>` via a local HTTP
server started by consumers such as the Lighthouse tool. Files are organized by type:

- `tools/test-assets/assets/audio/` — audio files (e.g. audio-001.mp3)
- `tools/test-assets/assets/feeds/` — RSS feeds (e.g. feed-podcast-1.rss)
- `tools/test-assets/assets/images/` — images (e.g. image-001.jpg)
- `tools/test-assets/assets/videos/` — video files (e.g. video-001.mp4)
- URLs: `http://localhost:2111/feeds/feed-podcast-1.rss`, `http://localhost:2111/images/image-001.jpg`,
  `http://localhost:2111/audio/audio-001.mp3`, `http://localhost:2111/videos/video-001.mp4`

## Required Files

The following files are automatically generated or provided for the Lighthouse tool under
`assets/images/`, `assets/audio/`, `assets/videos/`, and `assets/feeds/`:

### Channel Images (Generated, in `assets/images/`)

- `chan-1-image.jpg` - Image for Podcast channel
- `chan-2-image.jpg` - Image for Video channel
- `chan-3-image.jpg` - Image for Music channel

### Item Images (Generated, in `assets/images/`)

- `item-1-image.jpg` - Image for Podcast episode
- `item-2-image.jpg` - Image for Video episode
- `item-3-image.jpg` - Image for Music track

### Media Files (Generated - 5 minutes each)

- `assets/audio/`: `item-1-podcast.mp3`, `item-3-music.mp3` - Audio for Podcast/Music
- `assets/videos/`: `item-2-video.mp4` - Video for Video episode

### RSS Feed Files (in `assets/feeds/`)

- `feed-1.rss` - RSS feed for Podcast channel
- `feed-2.rss` - RSS feed for Video channel
- `feed-3.rss` - RSS feed for Music channel

## Notes

- Generated files (images and media) are created automatically by the consumer tool
  if they don't exist.
- Media files are 5 minutes long to prevent playback from ending during tests.
- RSS feed files are source controlled and contain references to assets served from
  `localhost:2111/<subdir>/` (e.g. `audio/`, `images/`, `videos/`).
- Lighthouse (and other tools) populate the test database via the parser in test-assets
  mode using the feed at `http://localhost:2111/feeds/feed-podcast-1.rss`.
- The assets server sends RSS/XML with `Content-Disposition: inline` so opening
  e.g. `http://localhost:2111/feeds/feed-podcast-1.rss` in a browser displays the feed
  content in the tab instead of triggering a download.

## Scripts

Run from the monorepo root unless noted.

| Script                                               | Description                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run generate -w podverse-test-assets`           | **Generate assets only (no parse).** Writes to `assets/audio/`, `assets/feeds/`, `assets/images/`, `assets/videos/`. Does not touch the database. Optional args: `<count> [--items N] [--multi N]`. Alias: `generate:only`.                                                                             |
| `npm run generate_and_parse -w podverse-test-assets` | **Generate assets then parse.** Runs generate with same `<count> [--items N]` as the generate script, then populates the database from **all** generated feeds (one parser run per feed). Requires DB, `.env.api` with `DB_*` set, and assets server running (`npm run start -w podverse-test-assets`). |

Use `generate` (or `generate:only`) when you only need to refresh feeds/media. Use `generate_and_parse` when you need the database populated for the API or Lighthouse; it accepts the same count and `--items` as the generate script and parses every generated feed (e.g. 9 feeds for count=1).

**`.env.api` and database for generate_and_parse:**

- The script looks for `.env.api` in this order: (1) monorepo root, (2) `tools/web-perf/lighthouse/.env.api`. You do not need to run from a specific directory.
- **Standalone (populate dev DB):** If only Lighthouse's `.env.api` exists, the script defaults to **dev database** (`DB_HOST=127.0.0.1`, `DB_PORT=5432`). To use the Lighthouse test DB (e.g. port 5111) when running the CLI, set `TEST_ASSETS_USE_TEST_DB=1`.
- **Lighthouse:** When Lighthouse runs, it loads its own `.env.api` (test DB on 5111) and calls the parser in-process, so the CLI defaults do not apply.
- For the Lighthouse flow, copy the example and edit: `cp tools/web-perf/lighthouse/.env.api.example tools/web-perf/lighthouse/.env.api`.

## Generation

Feeds and media are generated by the **generate** script (assets only) or programmatically via `generateFeedAndAssets()` from `podverse-test-assets`. Example with options:

```bash
npm run generate -w podverse-test-assets -- 1 --items 3
```

The Lighthouse tool runs generate automatically before tests. Generated files are written
to `assets/audio/`, `assets/feeds/`, `assets/images/`, and `assets/videos/`.

## Namespacing

`AssetGenerator` accepts an optional `namespace`; use `namespace: ''` (or omit) to write
under `assets/audio/`, `assets/images/`, `assets/videos/` (and `assets/feeds/` when writing
feeds). Use a non-empty namespace to group assets in a subdirectory (e.g. `assets/<ns>/images/`)
if needed.
