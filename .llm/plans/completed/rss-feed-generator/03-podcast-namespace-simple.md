# Sub-Plan 3: Podcast Namespace — Simple Tags

## Objective

Add all "simple" Podcast Namespace 2.0 tags (channel and item) so that Partytime parses them and parser-mapping compat functions receive the expected data. Use Partytime phase modules to confirm exact XML structure (element names, attributes, text content).

**Test data spec:** See [10-test-data-spec.md](10-test-data-spec.md). Multi-value tags (funding, person, transcript, etc.) use `--multi` (default 2; number or range). Item count uses `--items` (default 20). One feed type is **feed-podcast-season-{N}.rss**: medium podcast plus season/episode tags with 10 items per season. Medium per feed type: none, podcast, podcast-season, video, music, publisher.

## Authority

- Partytime phase modules: `partytime/src/parser/phase/phase-1.ts` through `phase-7.ts` (and `phase-pending.ts` for reference only; pending tags can be stubbed or skipped).
- Parser-mapping: same compat files as Sub-Plan 2; plus channel/item handlers for funding, person, location, trailer, license, images, chapters, transcript, soundbite, season, episode, socialInteract, txt, chat.

## Channel Tags (Simple)

**All tags listed in this section (and in Item Tags below) are required in generated feeds.** The generator must emit every tag with valid values.

Implement in generator with correct XML; use faker for text/URLs where appropriate.

- **podcast:medium** — Text content: one of `podcast`, `music`, `video`, etc. (Phase4Medium). Partytime phase-4.
- **podcast:guid** — Channel-level GUID; faker uuid or stable string. Partytime phase-3.
- **podcast:locked** — `yes`/`no`; optional attribute `owner` (email). Partytime phase-1.
- **podcast:funding** — Multiple allowed. Each: text = message; attribute `url` required. Partytime phase-1 (`getAttribute(x, "url")`, `getText(n)`).
- **podcast:person** — Multiple. Text = name; attributes `role`, `group`, `img`, `href`. Partytime phase-2; use PersonRole/PersonGroup values (e.g. host, guest; cast, hosts).
- **podcast:location** — Text = name; attributes `geo`, `osm`. Partytime phase-2.
- **podcast:trailer** — Multiple. Attributes: `url`, `pubdate` (required); `length`, `type`, `season`. Optional text = title. Partytime phase-3.
- **podcast:license** — Text = identifier (e.g. CC-BY-4.0); attribute `url` optional but recommended. Partytime phase-3; compat expects `identifier` and optional `url`.
- **podcast:images** — Phase 4. Single element with **srcset** attribute (HTML5 srcset syntax): comma-separated `"url widthw"` (e.g. `https://example.com/img-300.jpg 300w, https://example.com/img-600.jpg 600w`). Partytime: `getKnownAttribute(node, "srcset")`; parses width from the `Nw` suffix. Generator: emit **multiple image sizes** per channel/item image (see "Multiple image sizes and podcast:images" below).
- **podcast:txt** — Phase 6; multiple. Attributes `purpose`, `value` (value required). Partytime phase-6.
- **podcast:chat** — Phase 7. Attributes: `server`, `protocol` (required); `accountId`, `space`, `embedUrl`. Partytime phase-7; compat expects server, protocol, accountId, space.

Do not implement in this sub-plan: `podcast:value`, `podcast:liveItem`, `podcast:remoteItem`, `podcast:podroll`, `podcast:publisher` (Sub-Plan 4 placeholders), or `podcast:id` / `podcast:social` / `podcast:recommendations` (Sub-Plan 5 / pending).

## Item Tags (Simple)

- **podcast:transcript** — Multiple. Attributes `url`, `type` (required); `language`, `rel` (e.g. captions). Partytime phase-1.
- **podcast:chapters** — Single. Attributes `url` (required), `type` (e.g. application/json+chapters). Partytime phase-1.
- **podcast:soundbite** — Multiple. Attributes `startTime`, `duration` (required); text = title. Partytime phase-1; compat expects startTime, duration, title.
- **podcast:person** — Same structure as channel; multiple. Partytime phase-2.
- **podcast:location** — Same as channel; single. Partytime phase-2.
- **podcast:season** — Attributes `number`, `name` (number required for compat). Partytime phase-2 (season) and phase-2 (episode).
- **podcast:episode** — Attributes `number`, `display`. Partytime phase-2.
- **podcast:license** — Same as channel; identifier + url. Partytime phase-3.
- **podcast:images** — Same as channel; single element with **srcset** listing multiple sizes (url + widthw per entry). Partytime phase-4.
- **podcast:socialInteract** — Multiple. Attributes: `platform`, `url` (required); `id`, `profileUrl`, `priority`. Partytime phase-5; compat uses platform, url, id, profileUrl, priority.
- **podcast:txt** — Same as channel; purpose + value. Partytime phase-6.
- **podcast:chat** — Same as channel; server, protocol, accountId, space. Partytime phase-7.

Do not implement: `podcast:alternateEnclosure`, `podcast:value` (Sub-Plan 4 placeholders).

## Multiple image sizes and podcast:images

- **Multiple sizes:** For each logical image index used in feeds, the generator must produce **several image files at different widths** (e.g. 300, 600, 1400 px) so that `<podcast:images srcset="...">` can list multiple entries. Use a naming scheme such as `image-{index}-{width}.jpg` in `assets/images/` and ensure the media pool creates these files (skip if exists; respect the 100-JPEG cap in [10-test-data-spec.md](10-test-data-spec.md), e.g. poolSize × numSizes ≤ 100).
- **Size label on image:** When generating each size variant, **draw the size in large characters on the image** (e.g. "300" or "600×600") so the file is visually identifiable. Prefer FFmpeg `drawtext` in `tools/test-assets/src/asset-generator.ts`; if not viable everywhere, make the label optional.

## Implementation Steps

1. **Reference Partytime phase files** — For each tag above, open the corresponding phase file and copy the exact attribute names and requirements (supportCheck / getAttribute / getText). For podcast:images use **phase-4.ts**: single element with **srcset** attribute (not multiple podcast:image children). Ensure generator output matches.
2. **Channel XML builder** — Add functions (or a small DSL) to emit each channel-level podcast tag with correct structure; wire faker for text and URLs; use valid enums for role/group (see partytime person-enum if available).
3. **Item XML builder** — Same for item-level tags; ensure multiple elements (transcript, soundbite, person) are emitted as multiple XML elements.
4. **Dates and numbers** — Trailer `pubdate` must be parseable by `new Date(...)`. Soundbite `startTime`/`duration` are numbers (seconds). Season/episode numbers are integers.
5. **Multi-size images and podcast:images** — (a) Extend the media pool (or AssetGenerator) to generate multiple widths per image index (e.g. 300, 600, 1400) with naming `image-{index}-{width}.jpg`. (b) When building channel/item podcast:images, emit one `<podcast:images srcset="url1 W1w, url2 W2w, ..." />` from those URLs. (c) Where feasible, add a size label overlay (e.g. FFmpeg drawtext) so each file shows its size in large text.
6. **Tools directory: image asset touch points** — When image naming changes, update every file under tools/ that references image filenames or URLs so generation, serving, and docs stay consistent: `tools/test-assets/src/asset-generator.ts`, `tools/test-assets/src/generate-feed-cli.ts`, `tools/test-assets/TOOLS-TEST-ASSETS.md`, `tools/test-assets/src/asset-server.ts` (confirm MIME/behavior only), `tools/web-perf/lighthouse/TOOLS-WEB-PERF-LIGHTHOUSE.md`.
7. **Validation** — Generate feed with all simple podcast tags; Partytime parse; run all relevant compat functions (channel: funding, person, location, trailer, license, images, txt, chat; item: transcript, chapters, soundbite, person, location, season, episode, license, images, socialInteract, txt, chat). Fix any mismatches.

## Acceptance Criteria

- All listed "simple" podcast namespace tags are required and present in every generated feed with correct element and attribute names.
- Partytime reports no parse errors and populates the corresponding fields on `FeedObject` and `Episode`.
- Parser-mapping compat for those sub-entities runs and persists (or would persist) without errors.

## Run after this plan

From repo root:

```bash
npm run generate -w podverse-test-assets -- 2 --items 20 --multi 2
```

Or: `cd tools/test-assets && npm run generate -- 2 --items 20 --multi 2`.

Confirm:

1. Feeds include **all** simple podcast namespace tags (podcast:medium, podcast:guid, podcast:funding, podcast:person, podcast:transcript, podcast:chapters, podcast:soundbite, podcast:images, etc.) with 2 entries where the tag allows multiples (per `--multi`). All listed channel and item tags are present (required).
2. `<podcast:images srcset="...">` appears at channel and item level with multiple entries (e.g. 3–4 widths); referenced image files exist under `assets/images/` and, if implemented, display the size in large characters.
3. Partytime can parse the feed; parser-mapping compat runs without error for those tags.
4. Six feed types per set (feed-{N}, feed-podcast-{N}, feed-podcast-season-{N}, feed-video-{N}, feed-music-{N}, feed-publisher-{N}); feed-podcast-season-* has season/episode tags (10 items per season). Channel has 20 items (or `--items`); multi-value tags have 2 values (or `--multi`). Optionally run with `--multi 2-4` and confirm counts vary per feed/attribute.

## Out of Scope

- Value, valueTimeSplit, alternateEnclosure, liveItem, remoteItem, podroll, publisher (Sub-Plan 4).
- Podcast Index ID / podcast:id (Sub-Plan 5).
