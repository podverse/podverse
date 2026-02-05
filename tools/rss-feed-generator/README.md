# RSS Feed Generator

CLI to generate tag-rich RSS feeds for parser and integration testing. Feeds are compatible with the Podverse parser (via Partytime) and use a shared pool of media assets.

## Media assets (JPEG, MP3, MP4)

Generated feeds use the same base URL pattern as the Lighthouse tool: `http://localhost:2111/<namespace>/` (e.g. `rss-generator`). The same test-assets server (`tools/test-assets`) serves both Lighthouse and RSS generator namespaces.

Asset file generation **reuses** `AssetGenerator` from `podverse-test-assets` (no duplicate logic). This package uses the namespace `rss-generator` so assets do not overwrite Lighthouse’s.

- **Ensure assets before generating feeds:** Run `npm run ensure-assets` (optionally `npm run ensure-assets -- --max 10` for a smaller subset). This creates up to 100 of each type under `tools/test-assets/assets/rss-generator/` (image-001.jpg … image-100.jpg, audio-001.mp3 … audio-100.mp3, video-001.mp4 … video-100.mp4). Existing files are never overwritten.
- **Caps:** The generator never creates more than 100 JPEG, 100 MP3, or 100 MP4 files.
- **Plan:** See [.llm/plans/active/rss-feed-generator/06-jpeg-mp3-mp4-assets.md](../../.llm/plans/active/rss-feed-generator/06-jpeg-mp3-mp4-assets.md). Full integration (dynamic filenames per feed) is in [future/09-asset-integration-full.md](../../.llm/plans/active/rss-feed-generator/future/09-asset-integration-full.md).

## Scripts

- `npm run ensure-assets` — Ensure media assets exist (skips existing). Optional: `--max N` (1–100) to limit how many of each type are ensured.
