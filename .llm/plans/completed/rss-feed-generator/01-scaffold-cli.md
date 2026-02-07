# Sub-Plan 1: Scaffold & CLI

## Objective

Create the RSS feed generator tool skeleton: new package under `tools/`, CLI that accepts a numeric parameter, faker dependency, and writes one minimal valid RSS feed to `tools/test-assets/assets/<namespace>/`.

## Scope

- New tool package; no changes to test-assets server logic (only write into its assets directory).
- **CLI arguments:** (1) Positional = number of **sets** (each set = 6 feed types). (2) **`--items`** (e.g. `--items 20` or `--items 10-30`): number of `<item>` elements per feed; default 20; range = random per feed. (3) **`--multi`** (e.g. `--multi 2` or `--multi 2-10`): count for all **other** multi-value tags (funding, person, transcript, etc.), not item count; default 2; range = random per feed/attribute. See [10-test-data-spec.md](10-test-data-spec.md).
- **Output:** Six files per set: `feed-{N}.rss`, `feed-podcast-{N}.rss`, `feed-podcast-season-{N}.rss`, `feed-video-{N}.rss`, `feed-music-{N}.rss`, `feed-publisher-{N}.rss`. The first feed in the run must **not** include remoteItem/podroll/publisher that reference another feed.
- Minimal valid RSS: one channel, required fields; item count from `--items`.

## Implementation Steps

### 1. Create package under tools/

- Add `tools/rss-feed-generator/` with:
  - `package.json`: name (e.g. `podverse-rss-feed-generator`), `type: "module"`, script to run the CLI (e.g. `node dist/cli.js` or tsx for dev). Add to npm workspaces in repo root if applicable.
  - `tsconfig.json`: extends repo base, output `dist/`, Node resolution.
  - `.gitignore`: `dist/`, `node_modules/`.

### 2. Add dependencies

- **faker** (or `@faker-js/faker`): add as dependency in `tools/rss-feed-generator/package.json`.
- No dependency on `podverse-test-assets` for this step; only write files to the assets path. Use a configurable or fixed path to `tools/test-assets/assets/<namespace>/` (e.g. namespace `rss-generator`).

### 3. CLI entrypoint

- Create `src/cli.ts` (or `src/index.ts`):
  - Parse CLI args: (1) Positional = number of sets (positive integer). (2) Optional `--items <n>` or `--items <min-max>`; default 20. (3) Optional `--multi <n>` or `--multi <min-max>` for non-item multi-value tags; default 2. See [10-test-data-spec.md](10-test-data-spec.md).
  - Usage message: e.g. `rss-feed-generator <count> [--items 20|min-max] [--multi 2|min-max]`.

### 4. Output directory (align with Lighthouse / test-assets)

- Resolve output directory: `tools/test-assets/assets/<namespace>/` with a **distinct namespace** (e.g. `rss-generator`) so it does not overwrite Lighthouse’s `lighthouse` namespace.
  - Same convention as Lighthouse: `assets/<namespace>/`; same AssetServer serves both at `http://localhost:2111/<namespace>/...`. Do not start AssetServer from this CLI; only write files.
  - Resolve path relative to repo root or to the tool’s package location (e.g. `path.join(__dirname, '../../test-assets/assets/rss-generator')` from built output, or env var / option for override).
  - Ensure directory exists (mkdir -p style) before writing.

### 5. Minimal RSS generation

- Build one RSS 2.0 document with:
  - Root: `<rss version="2.0" xmlns:podcast="https://podcastindex.org/namespace/1.0">`.
  - Channel: `title`, `description`, `link`, `language` (required for Partytime/BasicFeed).
  - One item: `title`, `description`, `guid`, `pubDate`, `enclosure` (url, type, length). Enclosure URL can be a placeholder (e.g. `http://localhost:2111/rss-generator/item-1.mp3`) so long as structure is valid.
- Use faker only where helpful for this step (e.g. `faker.lorem.sentence()` for title/description, `faker.internet.url()` for link, fixed or faker date for pubDate).
- **Base URL for links/enclosure:** Use `http://localhost:2111/<namespace>/` (e.g. `http://localhost:2111/rss-generator/`) so that when the existing test-assets AssetServer is run, URLs resolve. Same pattern as Lighthouse feeds (see `assets/lighthouse/feed-1.rss`).
- Serialize to XML (manual string build or a small XML util); ensure encoding is UTF-8 and special characters are escaped where needed.

### 6. Write feed file(s)

- Generate **six feed types per set**: for each set index N, write `feed-{N}.rss`, `feed-podcast-{N}.rss`, `feed-podcast-season-{N}.rss`, `feed-video-{N}.rss`, `feed-music-{N}.rss`, `feed-publisher-{N}.rss`. For the first feed file in the run, do not emit remoteItem/podroll/publisher that reference another feed. See [10-test-data-spec.md](10-test-data-spec.md).
- Each channel has `--items` count (default 20). Multi-value tags (funding, person, etc.) use `--multi` (default 2).

### 7. npm script

- In `tools/rss-feed-generator/package.json`, add script (e.g. `"generate": "tsc && node dist/cli.js"` or use tsx for `src/cli.ts`). Document in a short README how to run from repo root or from the tool directory.

### 8. Documentation

- Add `tools/rss-feed-generator/README.md` (or TOOLS-RSS-FEED-GENERATOR.md): purpose, usage (e.g. `npm run generate -- 5`), output location (`tools/test-assets/assets/rss-generator/`), and that feeds are served at `http://localhost:2111/rss-generator/` when the test-assets server is running.

## Acceptance Criteria

- From repo root or tool dir: running the CLI with a number (e.g. `2`) creates 12 files under `tools/test-assets/assets/rss-generator/` (2 sets × 6 types).
- Each file is well-formed RSS 2.0 with one channel and the configured number of items; Partytime can parse without error; parser-mapping compat for channel and item does not throw for required fields.

## Run after this plan

Run to generate feeds and confirm output:

```bash
cd tools/rss-feed-generator && npm run generate -- 2 --items 20 --multi 2
```

Then:

1. **Feeds exist:** `feed-1.rss`, `feed-podcast-1.rss`, `feed-podcast-season-1.rss`, `feed-video-1.rss`, `feed-music-1.rss`, `feed-publisher-1.rss`, and the same six with `-2` for set 2 (12 files total).
2. **Content:** Each file is valid RSS 2.0 with one channel and (default) 20 items; links/enclosures use `http://localhost:2111/rss-generator/...`.
3. **No remoteItem on first feed:** The first-written feed does not reference another feed.

Optional: start the test-assets server and fetch `http://localhost:2111/rss-generator/feed-1.rss` to confirm it’s served.

## Out of Scope (this sub-plan)

- iTunes or podcast namespace tags (Sub-Plan 2 and 3).
- Real image/enclosure files (Sub-Plan 06 runs first to provide these).
- Podcast Index ID or complex tags (Sub-Plans 4 and 5).

