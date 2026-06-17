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

**Clip and official-clip segment end:** Playback clearing is shared with the main app
(`NonLiveMediaOrchestrator` clears `mpClip` / `mpItemSoundbite` at `end_time + 1` or
`start_time + duration + 1`, pauses at the playhead, no rewind). Embed title and the video
segment info bar follow **live player state** only — SSR fallback clip/soundbite refs are for the
pre-load shell, not after segment end. When segment refs clear, chapter markers and time-based
chapter titles may resume on chaptered parent episodes.

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
| Episode chapters (list)      | `/embed/episode-chapters/{item.id_text}`        |

Official-clip embeds always use `/embed/official-clip/…`, not `/soundbite/…`.

The `episode-chapters` route renders a single episode/item as a **list of its chapters**. Unlike
podcast/album/playlist list rows (each a distinct enclosure), every chapter row shares the parent
episode enclosure and plays by seeking to that chapter's `start_time`. Chapters are fetched via
`reqItemParseAndGetChapters` and ordered client-side by `sort` (`asc` default, `desc` reverses).

URL generation for Share → Embed Builder and copy output lives in
`apps/web/src/lib/embed/buildEmbedUrl.ts`.

## Query parameters

Shared on single and list routes:

| Param             | Default  | Normalization                                                                                                                                                |
| ----------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `t`               | `0`      | Start time in seconds; invalid/negative → `0`                                                                                                                |
| `chapter_markers` | `true`   | `0` or `false` hides progress-bar chapter boundary markers when chapters exist                                                                               |
| `ar`              | `16x9`   | Aspect ratio for **responsive** player shell (`16x9`, `4x3`, `1x1`)                                                                                          |
| `player`          | inferred | `compact` or `responsive`; controls iframe height and player chrome. When absent, inferred from `presentation` (`audio` → `compact`, `video` → `responsive`) |
| `presentation`    | `audio`  | Media **preference** for enclosure best-fit (`audio` or `video`); locks preference when present in the URL                                                   |

List routes only:

| Param                           | Default        | Notes                                                                    |
| ------------------------------- | -------------- | ------------------------------------------------------------------------ |
| `play_id_text`                  | —              | Initial list row; must match a loaded row or falls back to the first row |
| `rows`                          | `5`            | List viewport rows, clamped `2-10`                                       |
| `type`, `sort`, `page`, `range` | route defaults | Invalid enum/page values fall back per `parseEmbedQueryParams.ts`        |

### Player size vs media preference

Embed URLs separate two concerns:

| Concept          | URL param      | Values                  | Controls                                                          |
| ---------------- | -------------- | ----------------------- | ----------------------------------------------------------------- |
| Player size      | `player`       | `compact`, `responsive` | iframe height, aspect ratio shell, compact vs responsive panel UI |
| Media preference | `presentation` | `audio`, `video`        | enclosure best-fit order (`resolveEmbedBestFitEnclosure`)         |

**Compact player:** always uses the audio-style shell (no inline `<video>` UI). When `presentation=video` selects a video enclosure, playback still runs through the hidden audio orchestrator (HTML5 audio element with a video URL).

**Responsive player:** renders the responsive video stage when the active enclosure is video (from best-fit or alternate-enclosure selection). When the active enclosure is audio (for example `presentation=audio` or an explicit audio pick in the alternate-enclosure modal), the responsive shell shows center artwork instead of a `<video>` element.

Legacy links without `player=` continue to work: player size is inferred from `presentation` only.

List embeds support infinite scrolling inside the iframe: additional pages load when the user
scrolls to the bottom (loading spinner at the list foot). After the listener starts playback on a
row, playback advances to the next list row when the current item ends. The active row is
highlighted in the list.

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

## Responsive player (video stage)

The **responsive** player is available for both single and list embeds (`player=responsive`).

- Single responsive embeds render a width-responsive video stage (`ar` controls aspect ratio).
- Responsive overlays show info + controls while paused, on hover, or on focus; when playing, overlays fade out after idle.
- Responsive controls include a mute toggle (`embed-responsive-mute-toggle`) for user-controlled volume.
- **Responsive + video enclosure** (from best-fit or alternate-enclosure pick): inline video stage (`embed-responsive-video-element`).
- **Responsive + audio enclosure** (from `presentation=audio` or explicit audio pick): center artwork (`embed-responsive-center-art`) instead of a `<video>` element. Center art uses the same fallback chain as the overlay info art: chapter image (when applicable), then item image, then channel image, then the embed placeholder.
- **Compact player:** always audio shell regardless of enclosure type (see [Compact player + prefer video](#compact-player--prefer-video)).
- Chapter UX differs intentionally from compact presentation:
  - Chapter title shows in a dedicated line above controls.
  - Progress-bar chapter hover tooltip is enabled in responsive presentation and remains disabled in compact embed controls.

## Compact player + prefer video

When `player=compact` and `presentation=video`, the shell stays compact (audio UI) but enclosure selection prefers video sources. Video enclosures play as audio-only (no responsive stage mount). Alternate-enclosure switches to video while compact follow the same path.

## Mixed list/playlist presentation

When a list embed contains both audio and video rows (for example playlist `e2eEmbPlMix01`), the
shell shows a **Prefer audio / Prefer video** selector. The selector controls media preference
for enclosure best-fit on the active row while preserving list-row selection and playback behavior.
When `player=compact` is locked in the URL, the shell stays compact regardless of prefer value.

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
  src="https://example.test/embed/episode/your-item-id?t=30"
  width="100%"
  height="172"
  frameborder="0"
  allow="autoplay"
  title="Podverse embed"
></iframe>
```

The `allow` value is defined once as `EMBED_IFRAME_ALLOW` in `buildEmbedIframeCode.ts` and reused by generated snippets and in-app preview iframes.

Single-video snippets use a responsive wrapper (`padding-bottom` ratio box) instead of fixed `height`.

### Layout height tokens

Canonical **literals** (art size, video placeholders, list viewport, and so on) live in:

- `apps/web/src/styles/components/embed/_embedLayoutTokens.scss`
- `apps/web/src/lib/embed/embedLayoutTokens.ts` (must stay in sync; `embedLayoutTokens.sync.test.ts` enforces parity)

Shell **formulas** (player panel + list region) and `embed-player-panel-custom-properties` are in
`_embedLayoutTokens.scss`. Import that file from embed `*.module.scss` (e.g.
`@use './embedLayoutTokens' as embed`). At **16px root**
(`--spacing-lg` = 16px, `--spacing-md` = 8px), single-compact height is:
`padding + art + gap + play button + padding`.

**In-app previews** (demo index `/embed`, embed builder page `/embed/builder`) size iframes with the
same SCSS shell-height variables and `embed-player-panel-custom-properties` mixin — not hardcoded
pixel attributes. Video single embeds use width-filling aspect-ratio layout in the builder preview.
Both `/embed` and `/embed/builder` use full app chrome (navbar and sidebar); iframe embed routes under `/embed/<resource>` remain chromeless.

**Copy-paste iframe snippets** (`buildEmbedIframeCode`) emit numeric `height="…"` for fixed-size layouts and a responsive wrapper for single-video layouts. Numeric heights come from `embedLayoutDimensions.ts`, which derives px from `embedLayoutTokens.ts` using the same formulas as `_embedLayoutTokens.scss`. Import `DEFAULT_SINGLE_COMPACT_IFRAME_HEIGHT` (and related exports) or call `getEmbedIframeHeightForRouteKind()` for current defaults.

### List sizing and breaking default

List embeds now default to **5 visible rows** (`rows=5`) instead of the previous ~12-row viewport.

- Audio list shell height: player panel + `rows x 48px` (+ presentation selector height when shown).
- Video list shell height: fixed video panel + `rows x 48px` (+ selector height when shown).

Share modal → a single **Embed Builder** outline button navigates to `/embed/builder` with query
params preloaded for the share context (podcast, episode, playlist, playlist item, clip,
chapter, etc.). The builder always shows **Embed type** (`compact` or `responsive`) and a **List** on/off control. Channel and playlist sources show List **On** with **Off** disabled; clip/chapter/official-clip sources show List **Off** with **On** disabled; episode and track sources allow toggling.

Builder URL shape:

`/embed/builder?channel=<id_text>&item=<id_text>&playlist=<id_text>&type=<compact|responsive>&list=1&playlist_item=<id_text>&sort=<sort>&t=30`

Legacy builder URLs may still use combined `type=compact-list|responsive-list` or `audio-list`/`video-list`; those map to `type` + `list=1`.

### List content types and sort (list=1)

For list embeds the builder offers a **List content** selector and a per-content **Sort** selector
(plus a **Time range** selector when sort is popularity). Available content types are resolved from
the source entity (see `resolveEmbedBuilderListContentOptions` in
`apps/web/src/lib/embed/embedBuilderTypes.ts`):

| Source                         | Content types        | Resulting list route                                |
| ------------------------------ | -------------------- | --------------------------------------------------- |
| Podcast channel / episode item | `episodes`, `clips`  | `/embed/podcast/{channel}` (`type=clips` for clips) |
| Episode item (podcast)         | `chapters`           | `/embed/episode-chapters/{item}`                    |
| Album channel / track item     | `tracks`             | `/embed/album/{channel}`                            |
| Playlist                       | (playlist resources) | `/embed/playlist/{playlist}`                        |

Sort options and their emitted `sort` query value by content type (the default sort is omitted from
generated URLs):

| Content type | Sort options (default first)           | Emitted `sort`             |
| ------------ | -------------------------------------- | -------------------------- |
| `episodes`   | Recent (default), Oldest, Popularity   | `oldest`, `top` (+`range`) |
| `clips`      | Recent (default), Popularity           | `top` (+`range`)           |
| `tracks`     | First to last (default), Last to first | `backward`                 |
| `chapters`   | First to last (default), Last to first | `desc`                     |

`chapters` is item-based: switching an episode-source list to **Chapters** keeps the item context
and targets `/embed/episode-chapters/{item}` rather than the channel list route.

## Embed demo index (`/embed`) — operator configuration

The public demo index at `/embed` is **database-driven**. Operators configure eighteen fixed
showcase slots in the `embed_demo_showcase` table (one row per slot), including the
`episode-chapters-audio`/`-video` and `podcast-clips-audio`/`-video` list slots. Unconfigured slots
are hidden on `/embed`.

| Surface              | Path                                                         | Auth                |
| -------------------- | ------------------------------------------------------------ | ------------------- |
| Public demo index    | Web `/embed`                                                 | None                |
| Public read API      | `GET /api/v2/embed-demo/showcase`                            | None                |
| Management config UI | Management-web `/web/embed-demo`                             | `embed_demo` read   |
| Management write API | `PUT` / `DELETE /api/v2/web/embed-demo/showcase/:showcaseId` | `embed_demo` update |

Showcase slot ids and route kinds are fixed in `@podverse/helpers`
(`EMBED_DEMO_SHOWCASE_SLOT_DEFS`). Each slot stores a single `resource_id_text` (episode,
track, clip, chapter, official clip, podcast channel, album channel, playlist, or — for the
`episode-chapters` list slots — the parent episode item).

E2E and local dev seeds populate all eighteen slots via `tools/web/seed-embed-fixtures.mjs`
(`embed_demo_showcase` rows plus underlying podcast/album/video fixtures). The `podcast-clips`
list slots reuse a podcast channel id with `?type=clips`; the `episode-chapters` slots use an
episode item id.

### Production / staging showcase feeds (Podcast Index)

For real `/embed` demos (not E2E fixtures), run the worker command that parses four Podcast
Index feeds **directly** (no RSS queue), **always re-parses** existing feeds by
`podcast_index_id`, and **overwrites** twelve seed-managed showcase rows every run:

| Podcast Index id                                    | Feed                              | Showcase slots                                                                 |
| --------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------ |
| [920666](https://podcastindex.org/podcast/920666)   | Podcasting 2.0                    | `podcast-audio`, `episode-audio`, `clip-audio`, `chapter-audio`                |
| [6642704](https://podcastindex.org/podcast/6642704) | Music From The Doerfel-Verse      | `album-audio`, `track-audio` (pinned guid)                                     |
| [162612](https://podcastindex.org/podcast/162612)   | Geek News Central Podcast (Video) | `podcast-video`, `episode-video`, `clip-video`, `chapter-video` (pinned guids) |
| [7814960](https://podcastindex.org/podcast/7814960) | Them                              | `album-video`, `track-video` (pinned guids)                                    |

Podcast audio/video feeds also create a public **Sample Clip** (90 seconds) and upsert the
middle parsed chapter for the clip/chapter showcase slots. Clips are owned by the backend
**`demo`** system account (username-only; auto-created by this job and by
`infra/development/seeds/local-dev-accounts.sql` on `make local_db_init`). Official-clip and
playlist slots are **not** set by this job — configure those in management-web
(`/web/embed-demo`).

Local:

```bash
npm run build:packages
npm run build -w apps/workers
make local_seed_embed_demo_feeds
```

Kubernetes (suspended ops CronJob `seed-embed-demo-showcase-feeds`; same worker command as local):

```bash
make local_seed_embed_demo_feeds_k8s
# or: K8S_NAMESPACE=podverse-alpha npm run seed:embed-demo-showcase-feeds:k8s
```

Follow logs with the job name printed by the script, e.g.:

```bash
kubectl -n podverse-alpha logs -f job/seed-embed-demo-showcase-feeds-manual-<timestamp>
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
2. `make local_seed_embed_demo_feeds` (Podcast Index showcase feeds + Sample Clip)
3. Optional: `make local_seed_embed` for deterministic fixture rows on `/embed`
4. Open `/embed` — configured showcase rows appear after seed (or configure slots in management-web)

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

## Current limitations

- **Private playlists:** not embeddable; no support for unlisted playlist embeds in phase 1.

## Related code

- Layout: `apps/web/src/app/embed/layout.tsx`
- Runtime helpers: `apps/web/src/lib/embed/`
- E2E: `apps/web/e2e/embed-routes.spec.ts`, `embed-share-builder.spec.ts`, `embed-responsive-player.spec.ts`, `embed-demo-index.spec.ts`
- Management E2E: `apps/management-web/e2e/embed-demo-config.spec.ts`
- API tests: `apps/api/src/routes/embedDemo.integration.test.ts`,
  `apps/management-api/src/routes/embedDemo.integration.test.ts`
