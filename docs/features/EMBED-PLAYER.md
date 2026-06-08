# Embed player

Operator and developer reference for Podverse web embed routes (`/embed/**`).

## Overview

Embeds are chromeless player surfaces served from the web app. They reuse the global playback
context with embed-mode guardrails (no anonymous restore, no auto-queue mutations, no main-app layout
changes). All embed routes emit SSR `noindex` metadata.

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

List routes only:

| Param | Default | Notes |
| --- | --- | --- |
| `play_id_text` | — | Hidden advanced override; must match a row on the current list page or falls back to the default row |
| `type`, `sort`, `page`, `range` | route defaults | Invalid enum/page values fall back per `parseEmbedQueryParams.ts` |

## List visibility

- **Podcast/album channels:** must be publicly visible (`feed_policy.public_visible`).
- **Playlists:** must have public `sharable_status` only. Private or unlisted playlists render
  `embed-not-available` with no row/title leakage.

## Mixed list/playlist presentation

When a list embed contains both audio and video rows (for example playlist `e2eEmbPlMix01`), the
shell shows an **Audio / Video** presentation-style selector. The selector controls panel layout
and placeholder sizing only; audio rows still load playback resources and video remains
placeholder-only in phase 1.

## Iframe integration

Generate URLs with `buildEmbedUrl()` and snippets with `buildEmbedIframeCode()`:

```html
<iframe
  src="https://example.test/embed/episode/your-item-id?autoplay=true&amp;t=30"
  width="100%"
  height="284"
  frameborder="0"
  allow="autoplay"
  title="Podverse embed"
></iframe>
```

The `allow` value is defined once as `EMBED_IFRAME_ALLOW` in `buildEmbedIframeCode.ts` and reused by generated snippets and in-app preview iframes.

Heights (from `buildEmbedIframeCode.ts`):

| Layout | Audio style | Video style |
| --- | --- | --- |
| Single | 284px | 444px |
| List | 744px | 884px |

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

Album list embeds use channel id **`e2eMusicAlbm01`** (not the music channel id).

### Fixture images (test-assets port 2111)

Embed seed scripts store channel and item artwork URLs that resolve to committed PNGs under
`tools/test-assets/assets/e2e/images/` (served at `http://localhost:2111/e2e/images/…`).

| Constant (seed) | File | Use |
| --- | --- | --- |
| `EMBED_FIXTURE_CHANNEL_IMAGE_URL` | `e2e-embed-channel-art-1400.png` | `channel_image` rows for embed fixtures |
| `EMBED_FIXTURE_ITEM_IMAGE_URL` | `e2e-embed-item-art-1400.png` | `item_image` rows for embed fixtures |
| `EMBED_FIXTURE_PLACEHOLDER_IMAGE_URL` | `e2e-embed-placeholder.png` | Test-assets mirror of app placeholder |

Regenerate binaries:

```bash
npm run generate:e2e-images -w podverse-test-assets
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
| `/embed/podcast/e2ePodChnl001` | `e2ePodResume01` (sort `recent`) |
| `/embed/album/e2eMusicAlbm01` | `e2eMusicTrk002` (sort `forward`) |
| `/embed/playlist/e2eEmbPlList01` | `e2ePodResume01` (first resource) |
| `/embed/playlist/e2eEmbPlMix01` | `e2ePodResume01` (mixed audio + video resources) |

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
