# Embed player

Operator and developer reference for Podverse web embed routes (`/embed/**`).

## Overview

Embeds are chromeless player surfaces served from the web app. They reuse the global playback
context with embed-mode guardrails (no anonymous restore, no auto-queue mutations, no main-app layout
changes). All embed routes emit SSR `noindex` metadata.

### Playback end

When a single-item embed finishes playback, the player **pauses** and **rewinds** the scrub position
without clearing the loaded item:

- **Episode or track** — position returns to **0:00**.
- **Clip, official clip (soundbite), or chapter** — position returns to that segment’s **start time**.

Duration, chapter markers, artwork, and titles stay visible. Embeds do **not** run the main app’s
`clearNowPlaying()` teardown or queue-advance logic on natural track end.

Local demo index: [`/embed`](http://localhost:4032/embed) (ports vary by environment).

## Typed routes

| Entity context               | Embed path                                      |
| ---------------------------- | ----------------------------------------------- |
| Episode (podcast/video item) | `/embed/episode/{item.id_text}`                 |
| Track (music item)           | `/embed/track/{item.id_text}`                   |
| Clip                         | `/embed/clip/{clip.id_text}`                    |
| Chapter                      | `/embed/chapter/{item_chapter.id_text}`         |
| Official clip (soundbite)    | `/embed/official-clip/{item_soundbite.id_text}` |
| Podcast channel (list)       | `/embed/podcast/{channel.id_text}`              |
| Album channel (list)         | `/embed/album/{channel.id_text}`                |
| Playlist (list)              | `/embed/playlist/{playlist.id_text}`            |

Official-clip embeds always use `/embed/official-clip/…`, not `/soundbite/…`.

URL generation for Share → Embed Builder and copy output lives in
`apps/web/src/lib/embed/buildEmbedUrl.ts`.

## Query parameters (phase 1)

Shared on single and list routes:

| Param             | Default | Normalization                                                                  |
| ----------------- | ------- | ------------------------------------------------------------------------------ |
| `autoplay`        | `false` | Invalid values → `false`; only `true` is emitted in generated URLs             |
| `t`               | `0`     | Start time in seconds; invalid/negative → `0`                                  |
| `chapter_markers` | `true`  | `0` or `false` hides progress-bar chapter boundary markers when chapters exist |

List routes only:

| Param                           | Default        | Notes                                                                      |
| ------------------------------- | -------------- | -------------------------------------------------------------------------- |
| `play_id_text`                  | —              | Initial list row; must match a loaded row or falls back to the first row   |
| `presentation`                  | `audio`        | `audio` or `video`; locks list/single presentation when present in the URL |
| `type`, `sort`, `page`, `range` | route defaults | Invalid enum/page values fall back per `parseEmbedQueryParams.ts`          |

List embeds support infinite scrolling inside the iframe: additional pages load when the user
scrolls to the bottom (loading spinner at the list foot). When autoplay is enabled, playback
advances to the next list row after the current item ends. The active row is highlighted in the list.

### Chapter markers and titles (audio podcast episodes)

When an item has chapters, the embed player loads them via the same API as the main app
(`reqItemParseAndGetChapters`) and draws boundary markers on the progress bar (unless
`chapter_markers=0`). Clip, official-clip, and chapter embeds use the parent episode **item**
artwork (not per-chapter images).

For episode and chapter embeds (not clip/soundbite), the primary title line defaults to the
**active chapter title** at the current playhead. Click the title to toggle between chapter
title and episode item title when chapters are loaded.

Local demo podcast samples (`embSmpEpAud1`, `embSmpEpAud2`, `embSmpChpItm1`, …) are seeded with
three chapters (Intro / Topic A / Outro) and distinct per-chapter artwork URLs in the database.
The `/embed` demo index appends `chapter_markers=1` on podcast-audio showcase iframes.

## List visibility

- **Podcast/album channels:** must be publicly visible (`feed_policy.public_visible`).
- **Playlists:** must have public `sharable_status` only. Private or unlisted playlists render
  `embed-not-available` with no row/title leakage.

## Mixed list/playlist presentation

When a list embed contains both audio and video rows (for example playlist `e2eEmbPlMix01`), the
shell shows an **Audio / Video** presentation-style selector. The selector controls panel layout
and placeholder sizing only; audio rows still load playback resources and video remains
placeholder-only in phase 1.

## Brand mark (upper-right, optional)

When `NEXT_PUBLIC_BRAND_LOGO_SQUARE_100X100` is set to a full CDN URL, the player info row shows a
**32×32** square brand mark inside a new-tab link (`data-testid="embed-brand-logo-link"`).
Clicking the mark opens the corresponding main-site page in a new tab (for example
`/embed/episode/{id}` → `https://{NEXT_PUBLIC_BRAND_DOMAIN}/episode/{id}`). Domain comes from
`BRAND_DOMAIN` / `NEXT_PUBLIC_BRAND_DOMAIN`; protocol matches `NEXT_PUBLIC_WEB_PROTOCOL`. When the
logo URL is unset, the mark and link are not rendered. `NEXT_PUBLIC_BRAND_LOGO_SQUARE` holds a
full-size square asset for future use; nothing reads it today.

Canonical embed asset filename on the CDN: **`brand-square-100x100.png`** (**100×100** PNG). Example:

`https://<cdn>/static/images/branding/brand-square-100x100.png`

Local dev: set `BRAND_LOGO_SQUARE_100X100` in `brand.env`; `local_env_setup` maps it to
`NEXT_PUBLIC_BRAND_LOGO_SQUARE_100X100`. See [REBRANDING-CDN.md](/docs/development/REBRANDING-CDN.md).

## Iframe integration

Generate URLs with `buildEmbedUrl()` and snippets with `buildEmbedIframeCode()`:

```html
<iframe
  src="https://example.test/embed/episode/your-item-id?autoplay=true&amp;t=30"
  width="100%"
  height="172"
  frameborder="0"
  allow="autoplay"
  title="Podverse embed"
></iframe>
```

The `allow` value is defined once as `EMBED_IFRAME_ALLOW` in `buildEmbedIframeCode.ts` and reused by generated snippets and in-app preview iframes.

### Layout height tokens

Canonical **literals** (art size, video placeholders, list viewport, and so on) live in:

- `apps/web/src/styles/components/embed/_embedLayoutTokens.scss`
- `apps/web/src/lib/embed/embedLayoutTokens.ts` (must stay in sync; `embedLayoutTokens.sync.test.ts` enforces parity)

Shell **formulas** (player panel + list region) are in `_embedLayout.scss`. At **16px root**
(`--spacing-lg` = 16px, `--spacing-md` = 8px), single-audio height is:
`padding + art + gap + play button + padding`.

**In-app previews** (demo index `/embed`, embed builder page `/embed/builder`) size iframes with the
same SCSS shell-height variables and `embed-player-panel-custom-properties` mixin — not hardcoded
pixel attributes. Video single embeds use width-filling aspect-ratio layout in the builder preview.

**Copy-paste iframe snippets** (`buildEmbedIframeCode`) emit numeric `height="…"` for external sites; values come from `embedLayoutDimensions.ts`, which derives px from `embedLayoutTokens.ts` using the same formulas as `_embedLayout.scss`. Import `DEFAULT_SINGLE_AUDIO_IFRAME_HEIGHT` (and related exports) or call `getEmbedIframeHeightForRouteKind()` for the current defaults.

Share modal → entity-specific **Embed** buttons (for example **Embed Podcast**, **Embed
Playlist**, **Embed Episode**) navigate to `/embed/builder` with query params. The builder page
supports four embed types: `audio`, `video`, `audio-list`, and `video-list`, with live preview and
copyable iframe code.

Builder URL shape:

`/embed/builder?channel=<id_text>&item=<id_text>&playlist=<id_text>&type=<audio|video|audio-list|video-list>&playlist_item=<id_text>&sort=<sort>&autoplay=true`

List embeds default autoplay on in the builder (toggleable). Playlist item share includes both
`playlist` and `playlist_item`; `playlist_item` becomes `play_id_text` in the generated embed URL.

## Embed demo index (`/embed`) — operator configuration

The public demo index at `/embed` is **database-driven**. Operators configure twelve fixed
showcase slots in the `embed_demo_showcase` table (one row per slot). Unconfigured slots are
hidden on `/embed`.

| Surface              | Path                                                         | Auth                |
| -------------------- | ------------------------------------------------------------ | ------------------- |
| Public demo index    | Web `/embed`                                                 | None                |
| Public read API      | `GET /api/v2/embed-demo/showcase`                            | None                |
| Management config UI | Management-web `/web/embed-demo`                             | `embed_demo` read   |
| Management write API | `PUT` / `DELETE /api/v2/web/embed-demo/showcase/:showcaseId` | `embed_demo` update |

Showcase slot ids and route kinds are fixed in `@podverse/helpers`
(`EMBED_DEMO_SHOWCASE_SLOT_DEFS`). Each slot stores a single `resource_id_text` (episode,
track, clip, chapter, official clip, podcast channel, album channel, or playlist).

E2E and local dev seeds populate all twelve slots via `tools/web/seed-embed-fixtures.mjs`
(`embed_demo_showcase` rows plus underlying podcast/album/video fixtures).

### Production / staging showcase feeds (Podcast Index)

For real `/embed` demos (not E2E fixtures), run the worker command that parses four Podcast
Index feeds **directly** (no RSS queue), **always re-parses** existing feeds by
`podcast_index_id`, and **overwrites** eight seed-managed showcase rows every run:

| Podcast Index id                                    | Feed                              | Showcase slots                                   |
| --------------------------------------------------- | --------------------------------- | ------------------------------------------------ |
| [920666](https://podcastindex.org/podcast/920666)   | Podcasting 2.0                    | `podcast-audio`, `episode-audio` (latest item)   |
| [6642704](https://podcastindex.org/podcast/6642704) | Music From The Doerfel-Verse      | `album-audio`, `track-audio` (latest item)       |
| [162612](https://podcastindex.org/podcast/162612)   | Geek News Central Podcast (Video) | `podcast-video`, `episode-video` (latest item)   |
| [7814960](https://podcastindex.org/podcast/7814960) | Them                              | `album-video`, `track-video` (latest video item) |

Clip, official-clip, chapter, and playlist slots are **not** set by this job — configure those in
management-web (`/web/embed-demo`).

Local:

```bash
npm run build:packages
npm run build -w apps/workers
make local_seed_embed_demo_feeds
```

Kubernetes (suspended ops CronJob `seed-embed-demo-showcase-feeds`):

```bash
kubectl create job --from=cronjob/seed-embed-demo-showcase-feeds seed-embed-demo-$(date +%s) -n <ns>
```

## Deterministic fixtures (local dev + E2E)

Canonical fixture ids and port-2111 media URLs live in:

- `tools/web/embed-fixture-constants.mjs` (seed scripts)
- `apps/web/e2e/helpers/seedConstants.ts` (Playwright)

Shared seed core: `tools/web/seed-embed-fixtures.mjs` (called from `tools/web/seed-e2e.mjs`).

| Command                 | Database                 | Notes                                                 |
| ----------------------- | ------------------------ | ----------------------------------------------------- |
| `make e2e_seed_web`     | E2E test DB (port 5732)  | Full account truncate + fixtures + showcase rows      |
| `make local_seed_embed` | Local dev DB (port 5432) | Media/embed fixtures only; does not truncate accounts |

Local bootstrap:

1. `make local_env_setup` (and `make local_db_init` / `make local_infra_up` as needed)
2. `make local_seed_embed`
3. Open `/embed` — configured showcase rows appear after seed (or configure slots in management-web)

Album list embeds use channel id **`embSmpAlbAud1`** (embed sample album, not the media-player music channel).

### Embed sample assets (E2E asset server)

Embed demo enclosure and artwork URLs point at the deterministic test-asset server on port
**2111** (auto-started during Playwright E2E):

- Audio: `http://localhost:2111/e2e/audio/…`
- Images: `http://localhost:2111/e2e/images/…`

Regenerate committed binaries:

```bash
npm run generate:e2e-media -w podverse-test-assets
npm run generate:e2e-images -w podverse-test-assets
```

Seed scripts store absolute enclosure/artwork URLs from `embed-fixture-constants.mjs` (mirror:
`apps/web/e2e/helpers/seedConstants.ts`).

### Artwork fallback in the embed UI

`EmbedPlayerInfo` appends `IMAGES.SRC.EMBED_PLACEHOLDER` (`/images/placeholder-image.png`) as the
final `ImageNonReact` candidate with `skipProxy`, so failed or missing remote artwork transitions to
the app placeholder instead of an indefinite loading spinner. `ImageNonReact` also shows the runtime
placeholder when all candidates are exhausted.

Default list rows (with current seed):

| Route                            | Default row `id_text`                          |
| -------------------------------- | ---------------------------------------------- |
| `/embed/podcast/embSmpPodAud1`   | `embSmpEpAud1` (sort `recent`)                 |
| `/embed/album/embSmpAlbAud1`     | `embSmpTrkAud2` (sort `forward`)               |
| `/embed/playlist/e2eEmbPlList01` | `embSmpEpAud1` (first resource)                |
| `/embed/playlist/e2eEmbPlMix01`  | `embSmpEpAud1` (mixed audio + video resources) |

## Phase-1 limitations

- **Video:** detected video channels/items show a “coming soon” placeholder; no inline video playback.
- **Color customization:** builder advanced section is a placeholder only.
- **Private playlists:** not embeddable; no support for unlisted playlist embeds in phase 1.
- **Autoplay in browsers:** E2E asserts URL/query and shell load; real autoplay playback is not gated in
  tests.

## Related code

- Layout: `apps/web/src/app/embed/layout.tsx`
- Runtime helpers: `apps/web/src/lib/embed/`
- E2E: `apps/web/e2e/embed-routes.spec.ts`, `embed-share-builder.spec.ts`, `embed-demo-index.spec.ts`
- Management E2E: `apps/management-web/e2e/embed-demo-config.spec.ts`
- API tests: `apps/api/src/routes/embedDemo.integration.test.ts`,
  `apps/management-api/src/routes/embedDemo.integration.test.ts`
