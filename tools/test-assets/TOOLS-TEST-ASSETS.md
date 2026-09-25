# Test Assets Tool

This tool owns the generation and serving of local test assets (images, media files,
and RSS feeds) for Lighthouse and other tooling.

## Asset Location

All assets are served from `http://localhost:2111/<subdir>/<filename>` via a local HTTP
server started by consumers such as the Lighthouse tool. Files are organized by type:

- `tools/test-assets/assets/audio/` — audio files (e.g. audio-001.mp3)
- `tools/test-assets/assets/feeds/` — RSS feeds (e.g. feed-podcast-1.rss)
- `tools/test-assets/assets/images/` — images (e.g. image-001-300.jpg, image-001-600.jpg, image-001-1400.jpg)
- `tools/test-assets/assets/themes/` — remote custom theme fixture JSON files (e.g. custom-themes.multi.json)
- `tools/test-assets/assets/videos/` — video files (e.g. video-001.mp4)
- URLs: `http://localhost:2111/feeds/feed-podcast-1.rss`, `http://localhost:2111/images/image-001-300.jpg`,
  `http://localhost:2111/audio/audio-001.mp3`, `http://localhost:2111/videos/video-001.mp4`,
  `http://localhost:2111/themes/custom-themes.multi.json`
- `tools/test-assets/assets/basic-auth/` — one feed (`feed-basic-auth.rss`) with 10 items and its own audio, images, videos, chapters, transcripts. Paths under `http://localhost:2111/basic-auth/` require HTTP Basic Auth (see below).

## Basic-Auth test feed

A single **Basic-Auth-protected** feed is generated every time you run generate (or generate_and_parse). It is for testing add-by-RSS (private feeds) on the website.

- **Location:** `assets/basic-auth/` (feeds, audio, images, videos, chapters, transcripts). Feed URL: `http://localhost:2111/basic-auth/feeds/feed-basic-auth.rss`.
- **Count:** Exactly one feed, 10 items, regardless of `<count>` or `--items`.
- **Server:** Any request to a path under `/basic-auth/` (e.g. the feed, enclosures, images) requires HTTP Basic Auth. Use username **`username`** and password **`password`** (test-only; not secure).
- **Parsing:** generate_and_parse creates the basic-auth assets but does **not** parse this feed (it has no device-held credentials to send). Add the feed in the web or mobile app with the credentials above to test add-by-RSS; the client sends them with the parse request (see [ADD-BY-RSS.md](/docs/features/ADD-BY-RSS.md)).

### Credential fixtures

The server derives these from `feed-basic-auth.rss` on each request, so they need no extra generation. Each exercises one credential-scope rule. The feed variants are served under `/basic-auth/` and gated like the base feed.

| Fixture | URL | Without auth | With `username:password` |
| --- | --- | --- | --- |
| Feed and media gated | `http://localhost:2111/basic-auth/feeds/feed-basic-auth.rss` | 401 + `WWW-Authenticate: Basic` | 200 |
| Feed gated, media public | `http://localhost:2111/basic-auth/variants/feed-public-media.rss` | 401 | 200; resources on `/basic-auth-public-media/…` |
| Public media mirror | `http://localhost:2111/basic-auth-public-media/audio/audio-001.mp3` | 200 (`feeds/` is always 404) | 200 |
| Feed gated, media on another host | `http://localhost:2111/basic-auth/variants/feed-other-host-media.rss` | 401 | 200; resources on `http://127.0.0.1:2111/basic-auth/…` (still gated) |
| Redirect to another host | `http://localhost:2111/redirect/other-host/<path>` | 302 to `<path>` on the other loopback host | 302; a client that follows it must not resend the credentials |
| Authorization probe | `http://localhost:2111/debug/authorization` | `{"authorization":"absent"}` | `{"authorization":"present"}` (the value is never echoed) |

- **Other host:** `localhost` and `127.0.0.1` count as different hosts, because credentials for IPs and `localhost` are scoped by exact host. A client given the other-host feed must play or fetch its media **without** credentials, get 401, and log the withheld reason (`credentials_withheld_other_domain`). The server has to answer on IPv4 for these checks: start it with `BIND_ADDRESS=0.0.0.0` if `localhost` resolves to `::1` only (`npm run mobile:e2e:test-assets` already does).
- **Redirect:** `/redirect/other-host/` flips `localhost` ↔ `127.0.0.1` based on the request's `Host` header. Set `REDIRECT_OTHER_HOST` to redirect elsewhere (for example a LAN address when checking from a device). Pair it with the probe, `/redirect/other-host/debug/authorization`, to see whether a client carried `Authorization` across the redirect.
- **Mobile E2E:** the E2E build rewrites loopback `:2111` URLs to `127.0.0.1` (iOS) or `10.0.2.2` (Android), so the feed and its other-host resources land on the same host there. Check the other-host fixture on the web or a manual (non-E2E) mobile build.

**Verifying Basic Auth:** With the asset server running on port 2111:

- Without auth, expect **401** and `WWW-Authenticate: Basic realm="test-assets"`:
  ```bash
  curl -i http://localhost:2111/basic-auth/feeds/feed-basic-auth.rss
  ```
- With auth, expect **200** and the feed body:
  ```bash
  curl -i -u username:password http://localhost:2111/basic-auth/feeds/feed-basic-auth.rss
  ```

Optional: run the verification script (server must be running): `bash tools/test-assets/scripts/verify-basic-auth.sh`. It checks every row of the credential fixtures table above. Use `BASE_URL` to override the base URL (default `http://localhost:2111`).

**Operational notes:**

- The HTTP server on port **2111** must be the one from **tools/test-assets** (e.g. `npm run start -w podverse-test-assets`). If another process is bound to 2111, Basic Auth will not be applied.
- After pulling or changing Basic Auth code, **restart** the test-assets server so the running process has the latest logic.
- Add-by-RSS “success” (redirect to feed detail) means the **worker** successfully fetched and parsed the feed. If the feed URL is under `/basic-auth/` and no credentials are provided, the worker’s request gets 401 and the parse fails with `credentials_required`; the add-feed UI asks for a username and password and does not redirect.

## Docker

When test-assets runs in Docker (e.g. `make local_infra_up`), it is on `podverse_local_network` as `podverse_local_test_assets`. The local **workers** (`infra/docker/local/workers/`), **API** (`infra/docker/local/api/`), **management-api** (`infra/docker/local/management-api/`), **web** (`infra/docker/local/web/`), and **management-web** (`infra/docker/local/management-web/`) images use an entrypoint that runs a socat proxy: requests to `localhost:2111` inside those containers are forwarded to `podverse_local_test_assets:2111`, so feeds, images, video, chapters, and transcripts at `http://localhost:2111/...` work with no app-level URL rewriting. Use cases: workers (parser, image shrink); API (item transcript, add-by-RSS chapters/transcript); management-api (parity with API for future use); web and management-web (SSR, e.g. `/api/proxy` and Next.js image optimization for test-asset images). The test-assets image is built by `make local_build_test_assets` (or `make local_build_all` / `make local_nuke_rebuild_run`).

## Image naming

Images use **multi-size** naming: `image-{index}-{width}.jpg` (e.g. `image-001-300.jpg`, `image-001-600.jpg`, `image-001-1400.jpg`). Each logical index has one file per width (300, 600, 1400 px). Total JPEGs are capped at 100 (index count × 3 ≤ 100). Feeds reference them via `<podcast:images srcset="..."/>`. When changing image naming or widths, update: `asset-generator.ts`, `generate-feed-cli.ts`, this doc, `asset-server.ts` (MIME/behavior), and `tools/web-perf/lighthouse/TOOLS-WEB-PERF-LIGHTHOUSE.md` if it references image paths.

## Required Files

The following files are automatically generated by the **generate** script under
`assets/images/`, `assets/audio/`, `assets/videos/`, and `assets/feeds/`:

### Images (Generated, in `assets/images/`)

- `image-{index}-{width}.jpg` — multiple sizes per index (e.g. image-001-300.jpg, image-001-600.jpg, image-001-1400.jpg). Index runs from 1 to imagePoolSize (≤ 33 when using 3 sizes to stay under 100 JPEGs). Each file has the width drawn on it for identification.

### Audio / Video (Generated)

- `assets/audio/`: `audio-001.mp3`, … — one per pool index (pool size from feed count).
- `assets/videos/`: `video-001.mp4`, … — one per pool index.

### RSS Feed Files (in `assets/feeds/`)

- Nine feed types per set: `feed-1.rss`, `feed-podcast-1.rss`, `feed-video-1.rss`, `feed-music-1.rss`, `feed-publisher-1.rss`, `feed-season-1.rss`, `feed-podcast-season-1.rss`, `feed-video-season-1.rss`, `feed-music-season-1.rss`. Each includes full Podcast Namespace 2.0 simple tags and `<podcast:images srcset="..."/>`.

### Remote theme fixtures (source-controlled, in `assets/themes/`)

**E2E only** — not for production. For operator copy/paste and CDN smoke testing, use [`docs/operations/branding/custom-themes.operator-sample.json`](/docs/operations/branding/custom-themes.operator-sample.json) and [REMOTE-CUSTOM-THEMES.md](/docs/operations/branding/REMOTE-CUSTOM-THEMES.md).

- `custom-themes.multi.json` — valid multi-theme fixture with locale labels.
- `custom-themes.minimal.json` — valid single-theme minimal fixture.
- `custom-themes.invalid.json` — intentionally invalid fixture for fallback-path testing.

These are served by the same asset server at `http://localhost:2111/themes/<file>.json`.

**CSS variable names:** Remote packs must override the same custom properties Podverse SCSS uses in `packages/ui/src/styles/_themes.scss` (for example `--background-color-primary`, `--text-color-primary`). Do not use alternate names such as `--pv-color-bg-primary`; the UI reads `var(--background-color-primary)` on `body` and components, not `pv-color` tokens.

**Web E2E (custom themes):** From repo root run `make test_deps` and `make e2e_seed` first (`apps/web/e2e/custom-themes-global-setup.mjs` checks Postgres/Valkey and exits with instructions if missing). Playwright then starts test-assets on port **2111** before sidecar/web (`testAssetsFirst`). Theme JSON is loaded at **runtime** (`start:standalone`), not during `next build`. These specs use dedicated Playwright configs (not the default `playwright.config.ts`). They run in `make e2e_test_web_custom_themes_report` and as separate report dirs in `make e2e_test_report`.

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

| Script                                               | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run generate -w podverse-test-assets`           | **Generate assets only (no parse).** Writes to `assets/audio/`, `assets/feeds/`, `assets/images/`, `assets/videos/`. Does not touch the database. Optional args: `<count> [--items N] [--multi N] [--force-rss] [--add-fake-value-tags]`. Alias: `generate:only`. Use `--force-rss` to overwrite existing RSS feed files only (media is never overwritten). Use `--add-fake-value-tags` to include channel and item value tags (podcast:value, valueRecipient, valueTimeSplit) with fake data; a confirmation prompt is shown and generation continues only if the user types `y`. |
| `npm run generate_and_parse -w podverse-test-assets` | **Generate assets then parse.** Runs generate with same `<count> [--items N] [--force-rss]` as the generate script, then populates the database from **all** generated feeds (one parser run per feed). Requires DB, `.env.api` with `DB_*` set, and assets server running (`npm run start -w podverse-test-assets`).                                                                                                                                                                                                                                                              |

Use `generate` (or `generate:only`) when you only need to refresh feeds/media. Use `generate_and_parse` when you need the database populated for the API or Lighthouse; it accepts the same count, `--items`, and `--force-rss` as the generate script and parses every generated feed (e.g. 9 feeds for count=1).

### Value tags (fake)

By default, generated feeds **do not** contain value blocks (podcast:value, valueRecipient, valueTimeSplit). To include them for parser or UI testing, pass `--add-fake-value-tags`. The CLI will show a warning and ask you to type `y` to continue. The value data is **fake** and must **not** be used for real payments; sending money to these addresses will result in loss of funds.

### Local LN recipient overrides

If you need deterministic recipients for end-to-end tests, provide a local config file that
replaces the built-in fake recipients when `--add-fake-value-tags` is used.

- Copy the example file to create your local config:

```bash
cp tools/test-assets/config/ln-recipients.local.json.example \
  tools/test-assets/config/ln-recipients.local.json
```

- Update the file with real values from your local Lightning setup:

```json
{
  "keysend": [
    { "address": "02...", "name": "Keysend Recipient 1", "split": 60 },
    { "address": "02...", "name": "Keysend Recipient 2", "split": 40 },
    { "address": "02...", "name": "Keysend Fee Recipient", "split": 1, "fee": true }
  ],
  "lnaddress": [
    { "address": "user@domain", "name": "LNAddress Recipient 1", "split": 60 },
    { "address": "user@domain", "name": "LNAddress Recipient 2", "split": 40 },
    { "address": "user@domain", "name": "LNAddress Fee Recipient", "split": 1, "fee": true }
  ]
}
```

If the file is missing or invalid, the generator falls back to the built-in fake recipients.
The local file is gitignored and should not be committed.

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
