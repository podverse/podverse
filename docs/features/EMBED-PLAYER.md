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

| Entity context | Embed path |
| --- | --- |
| Episode (podcast/video item) | `/embed/episode/{item.id_text}` |
| Track (music item) | `/embed/track/{item.id_text}` |
| Clip | `/embed/clip/{clip.id_text}` |
| Chapter | `/embed/chapter/{item_chapter.id_text}` |
| Official clip (soundbite) | `/embed/official-clip/{item_soundbite.id_text}` |
| Podcast channel (list) | `/embed/podcast/{channel.id_text}` |
| Album channel (list) | `/embed/album/{channel.id_text}` |
| Playlist (list) | `/embed/playlist/{playlist.id_text}` |

Official-clip embeds always use `/embed/official-clip/…`, not `/soundbite/…`.

URL generation for Share → Embed Builder and copy output lives in
`apps/web/src/lib/embed/buildEmbedUrl.ts`.

## Query parameters (phase 1)

Shared on single and list routes:

| Param | Default | Normalization |
| --- | --- | --- |
| `autoplay` | `false` | Invalid values → `false`; only `true` is emitted in generated URLs |
| `t` | `0` | Start time in seconds; invalid/negative → `0` |
| `chapter_markers` | `true` | `0` or `false` hides progress-bar chapter boundary markers when chapters exist |

List routes only:

| Param | Default | Notes |
| --- | --- | --- |
| `play_id_text` | — | Hidden advanced override; must match a row on the current list page or falls back to the default row |
| `type`, `sort`, `page`, `range` | route defaults | Invalid enum/page values fall back per `parseEmbedQueryParams.ts` |

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

**In-app previews** (demo index `/embed`, share-modal embed builder) size iframes with the same SCSS shell-height variables and `embed-player-panel-custom-properties` mixin — not hardcoded pixel attributes.

**Copy-paste iframe snippets** (`buildEmbedIframeCode`) emit numeric `height="…"` for external sites; values come from `embedLayoutDimensions.ts`, which derives px from `embedLayoutTokens.ts` using the same formulas as `_embedLayout.scss`. Import `DEFAULT_SINGLE_AUDIO_IFRAME_HEIGHT` (and related exports) or call `getEmbedIframeHeightForRouteKind()` for the current defaults.

Share modal → **Create Embed** opens the builder with live preview and copyable code.

## Deterministic fixtures (local dev + E2E)

Canonical fixture ids live in:

- `tools/web/embed-fixture-constants.mjs` (seed scripts)
- `apps/web/src/lib/embed/embedFixtureIds.ts` (runtime demo links)
- `apps/web/e2e/helpers/seedConstants.ts` (Playwright)

Shared seed core: `tools/web/seed-embed-fixtures.mjs` (called from `tools/web/seed-e2e.mjs`).

| Command | Database | Notes |
| --- | --- | --- |
| `make e2e_seed_web` | E2E test DB (port 5732) | Full account truncate + fixtures |
| `make local_seed_embed` | Local dev DB (port 5432) | Media/embed fixtures only; does not truncate accounts |

Local bootstrap:

1. `make local_env_setup` (and `make local_db_init` / `make local_infra_up` as needed)
2. Start test-assets on port 2111: `npm run start -w podverse-test-assets`
3. `make local_seed_embed`
4. Open `/embed` — fixture mode is on in development (`NODE_ENV=development`) or when
   `EMBED_DEMO_USE_FIXTURES=true` (E2E sets this in `playwright.e2e-server-env.ts`)

Album list embeds use channel id **`embSmpAlbAud1`** (embed sample album, not the media-player music channel).

### Embed sample assets (test-assets port 2111)

Embed demo fixtures use **standalone** audio and artwork under `tools/test-assets/assets/embed/`
(served at `http://localhost:2111/embed/audio/…` and `http://localhost:2111/embed/images/…`).
They are separate from media-player E2E fixtures under `/e2e/`. Each image uses a distinct
background color so it is obvious which resource type is displayed.

| Resource | Display title (seed) | Image file (color) |
| --- | --- | --- |
| Podcast channel | `Embed Sample Podcast (audio)` | `embed-sample-podcast-channel-art.png` (#1D4E89) |
| Episode (audio) | `Embed Sample Episode (audio)` | `embed-sample-episode-audio-art.png` (#2E86AB) |
| Album | `Embed Sample Album (audio)` | `embed-sample-album-channel-art.png` (#6B2D5C) |
| Track (audio) | `Embed Sample Track (audio)` | `embed-sample-track-audio-art.png` (#F18F01) |
| Clip | `Embed Sample Clip (audio)` | `embed-sample-clip-art.png` (#E9C46A) |

Regenerate binaries:

```bash
npm run generate:embed-fixtures -w podverse-test-assets
```

Canonical URL constants live in `tools/web/embed-fixture-constants.mjs` (mirror:
`apps/web/src/lib/embed/embedFixtureIds.ts`, `apps/web/e2e/helpers/seedConstants.ts`).

### Artwork fallback in the embed UI

`EmbedPlayerInfo` appends `IMAGES.SRC.EMBED_PLACEHOLDER` (`/images/placeholder-image.png`) as the
final `ImageNonReact` candidate with `skipProxy`, so failed or missing remote artwork transitions to
the app placeholder instead of an indefinite loading spinner. `ImageNonReact` also shows the runtime
placeholder when all candidates are exhausted.

Default list rows (with current seed):

| Route | Default row `id_text` |
| --- | --- |
| `/embed/podcast/embSmpPodAud1` | `embSmpEpAud1` (sort `recent`) |
| `/embed/album/embSmpAlbAud1` | `embSmpTrkAud2` (sort `forward`) |
| `/embed/playlist/e2eEmbPlList01` | `embSmpEpAud1` (first resource) |
| `/embed/playlist/e2eEmbPlMix01` | `embSmpEpAud1` (mixed audio + video resources) |

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
