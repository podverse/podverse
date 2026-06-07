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

## Iframe integration

Generate URLs with `buildEmbedUrl()` and snippets with `buildEmbedIframeCode()`:

```html
<iframe
  src="https://example.test/embed/episode/your-item-id?autoplay=true&amp;t=30"
  width="100%"
  height="260"
  frameborder="0"
  allow="autoplay; encrypted-media"
  title="Podverse embed"
></iframe>
```

Heights: **260px** single embed, **720px** list embed.

Share modal → **Create Embed** opens the builder with live preview and copyable code.

## E2E fixtures

Seeded IDs are documented on `/embed` and in `apps/web/e2e/helpers/seedConstants.ts`
(`E2E_EMBED_*` constants). Re-seed with `make e2e_seed_web` after changing
`tools/web/seed-e2e.mjs`.

Default list rows (with current seed):

| Route | Default row `id_text` |
| --- | --- |
| `/embed/podcast/e2ePodChnl001` | `e2ePodResume01` (sort `recent`) |
| `/embed/album/e2eMusicAlbm01` | `e2eMusicTrk002` (sort `forward`) |
| `/embed/playlist/e2eEmbPlList01` | `e2ePodResume01` (first resource) |

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
