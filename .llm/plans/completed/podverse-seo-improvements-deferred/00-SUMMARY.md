# Podverse SEO Improvements — Audit Summary

Created: 2026-06-03  
Worktree: `podverse-seo-improvements`  
Plan set: deferred implementation (metadata, crawl policy, SSR hardening, regression tests)

## Executive summary

The worktree has **no Next.js Metadata API usage** today. Both `apps/web` and
`apps/management-web` emit a **single static brand `<title>`** from root layout.
Public RSS-backed pages already **SSR entity data** (channel/item DTOs) into client
children, but **feed descriptions never reach `<head>`**. Crawl controls (`robots.txt`,
`sitemap.xml`, route-level `noindex`) are absent. E2E coverage is limited to a smoke
title check on `/`.

The deferred plan set adds route-aware metadata, explicit index/noindex policy, SSR
hardening where async loading hurts bots, and Playwright/unit regression tests.

## Core product rule (must not regress)

| Page class | SEO description source | Example routes |
| --- | --- | --- |
| **RSS public content** | Feed-derived fields (`channel_description`, `item_description`, PI feed description, chapter text) | `/podcast/…`, `/episode/…`, `/artist/…`, `/album/…`, `/track/…`, livestreams, `/chapter/…` |
| **Podverse product/listing** | Curated Podverse copy (i18n or static marketing strings) | `/`, `/podcasts`, `/episodes`, `/about`, `/contact` |
| **Private / utility / admin** | `noindex` (description optional) | `/settings`, `/search`, auth flows, `management-web` |

Note: Podverse web has **no `/dashboard` route** today. Home (`/`) is the primary
logged-in discovery surface and is treated as a **product/listing** page for SEO copy.

## Current state

### Global head (`apps/web`)

| Mechanism | Status | Path |
| --- | --- | --- |
| Document `<title>` | Brand only, every URL | `apps/web/src/app/layout.tsx` |
| `generateMetadata` / `export const metadata` | **Absent** | — |
| Meta description, OG, Twitter, canonical | **Absent** | — |
| `robots.ts` / `sitemap.ts` | **Absent** | — |
| `metadataBase` | **Absent** | — |

`getWebOrigin()` exists at `apps/web/src/config/index.ts` and should back
`metadataBase` and canonical URLs.

### management-web

Same static brand title pattern in `apps/management-web/src/app/layout.tsx`.
Entire admin surface should be **`noindex,nofollow`**.

### Infrastructure

Stage nginx can emit `X-Robots-Tag` via `infra/proxy/proxy.conf` (commented out).
No app-level staging guard exists.

## Route inventory and classification

### A — RSS public content (index; feed-derived metadata)

Server `page.tsx` already fetches DTOs. Add `generateMetadata` using existing fetches
(with `React.cache` dedupe where the same entity is fetched twice).

| Route | SSR fetch | Description field |
| --- | --- | --- |
| `podcast/[channel_id]/page.tsx` | `reqChannelGetByIdOrIdText` | `channel_description.value` |
| `episode/[item_id]/page.tsx` | item + channel | `item_description.value` |
| `artist/[channel_id]/page.tsx` | channel | `channel_description.value` |
| `album/[channel_id]/page.tsx` | channel | `channel_description.value` |
| `track/[item_id]/page.tsx` | item + channel | `item_description.value` |
| `podcast/livestream/[item_id]/page.tsx` | item + channel | `item_description.value` |
| `music/livestream/[item_id]/page.tsx` | item + channel | `item_description.value` |
| `podcast-index/feed/[podcast_index_id]/page.tsx` | PI feed | PI feed description |
| `clip/[clip_id]/page.tsx` | clip + item + channel | clip notes or item description |
| `chapter/[item_chapter_id_text]/page.tsx` | chapter + item + channel | chapter title + item context |
| `official-clip/[item_soundbite_id]/page.tsx` | soundbite + item | item/soundbite context |

### B — Podverse product / listing / marketing (index; curated metadata)

| Route | Notes |
| --- | --- |
| `/` (`page.tsx`) | Home discovery; curated site tagline |
| `/podcasts`, `/episodes`, `/artists`, `/albums`, `/tracks` | Listing pages |
| `/podcasts/livestreams`, `/music/livestreams` | Livestream listings |
| `/playlists`, `/clips`, `/videos`, `/profiles` | Discovery listings |
| `/about`, `/contact`, `/terms`, `/donate`, `/mobile-app`, `/updates` | Marketing/legal |
| `/v4v/metaboost` | Product feature page |

Use i18n keys under `apps/web/i18n/originals/` where page copy already exists.

### C — Conditional public user content

| Route | Policy |
| --- | --- |
| `profile/[id_text]/page.tsx` | Index only when account is **public**; `noindex` for private/unlisted |
| `playlist/[playlist_id]/page.tsx` | Index when playlist is public/sharable; else `noindex` |

Tie robots to `sharable_status` (public / unlisted / private) from account/playlist DTOs.

### D — Noindex (do not scan)

| Route group | Examples |
| --- | --- |
| Account / settings | `/settings`, `/my-profile`, `/my-clips`, `/history`, `/queues` |
| Auth / checkout | `/sign-up`, `/reset-password`, `/verify-email`, `/set-password`, `/forgot-password`, `/email-change`, `/checkout`, `/membership` |
| Utility | `/search` (client-only shell), `/embed`, `/add-by-rss/**` |
| Editor / create flows | `/playlist/create`, `/playlist/edit/…`, `/clip/edit/…` |
| Dev / test | `/e2e/**`, `/test-error-boundaries` |
| management-web | **All routes** |

### E — Special cases

| Route | Notes |
| --- | --- |
| `takedown-notice/[podcast_index_id]` | Likely `noindex`; legal/operational |
| `podcast-index/feed/…` | Index when channel redirect does not apply; PI description |

## Async / SSR assessment

| Pattern | Bot impact | Action |
| --- | --- | --- |
| Detail pages: server `page.tsx` + client children | Body content generally in first HTML | Add **head metadata on server** (primary fix) |
| `/search` | No SSR data | **`noindex`**; do not rely on client results for SEO |
| `/settings` | Client-only shell | **`noindex`** |
| Profile tabs/lists | Partial client fetch after header SSR | Metadata on server from `ssrAccount`; lists optional |
| Transcript tab (`ssr: false`) | Empty until JS | OK — supplementary; not primary description |
| Add-by-Rss routes | Heavy `useEffect` | **`noindex`** |

**Conclusion:** Main SEO gap is missing **server head metadata**, not missing SSR body
for core public content pages.

## Reusable helpers (existing)

| Helper | Path | Use for SEO |
| --- | --- | --- |
| `stripAndDecodeHtml` | `packages/helpers/src/lib/html.ts` | Plain-text meta descriptions from RSS HTML |
| Image hero candidates | `packages/helpers/src/lib/image.ts` | `og:image` selection |
| `getWebOrigin` | `apps/web/src/config/index.ts` | `metadataBase`, canonical URLs |

## Gaps to close (target outcomes)

1. Shared `apps/web/src/lib/seo/` module with metadata builders and route policy map.
2. Root layout `metadata` + `metadataBase`; remove duplicate manual `<title>` when migrated.
3. `generateMetadata` on all class-A routes with feed-derived descriptions.
4. Static/curated metadata on class-B routes.
5. `robots.ts`, `sitemap.ts`, and route-level `noindex` for class-D.
6. Conditional robots for profiles/playlists (class-C).
7. E2E specs asserting SSR head tags and crawl assets.
8. management-web global `noindex`.

## Test coverage today

| Area | Coverage |
| --- | --- |
| E2E title smoke | `apps/web/e2e/smoke.spec.ts` — brand regex on `/` only |
| SEO metadata / robots / canonical | **None** |
| management-web SEO | **None** |

## Plan files in this set

| File | Scope |
| --- | --- |
| `01-metadata-foundation-and-route-classification.md` | Shared SEO module + layout foundation |
| `02-public-rss-content-metadata-rules.md` | Feed-backed detail pages |
| `03-product-and-listing-page-curated-seo-copy.md` | Home, listings, marketing |
| `04-crawl-index-policy-robots-sitemap-noindex.md` | robots, sitemap, noindex matrix |
| `05-async-rendering-and-ssr-seo-hardening.md` | Client-only routes + conditional pages |
| `06-seo-regression-e2e-and-helper-tests.md` | Unit + Playwright contracts |

See [`00-EXECUTION-ORDER.md`](./00-EXECUTION-ORDER.md) and [`COPY-PASTA.md`](./COPY-PASTA.md).
