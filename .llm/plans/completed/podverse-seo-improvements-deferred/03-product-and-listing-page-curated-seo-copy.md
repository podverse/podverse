# Phase 2b — Product and listing page curated SEO copy

## Goal

Add metadata to **Podverse product, listing, and marketing** routes using **curated**
descriptions authored for Podverse — not RSS feed fields.

**Rule:** these pages represent Podverse discovery/product surfaces, not a single
RSS channel or item.

## i18n strategy

Prefer existing translation keys from page components / `MainHeader` labels:

1. Search `apps/web/i18n/originals/en-US.json` for keys used by target pages.
2. Add dedicated SEO keys under a new namespace, e.g. `seo.pages.home.description`.
3. Use `getTranslations` from `next-intl/server` inside `generateMetadata` where
   locale-aware copy is required.

For pages without i18n yet, add English keys first; run i18n sync in a follow-up if
required by CI.

## Suggested curated copy (en-US defaults)

Adjust tone to match brand; store in i18n, not hardcoded in multiple files.

| Route | Title key | Description intent |
| --- | --- | --- |
| `/` | Home / brand | Discover podcasts, music, and livestreams on Podverse |
| `/podcasts` | Podcasts | Browse podcast feeds and shows |
| `/episodes` | Episodes | Browse podcast episodes across Podverse |
| `/artists` | Artists | Discover music artists |
| `/albums` | Albums | Browse music albums |
| `/tracks` | Tracks | Discover music tracks |
| `/podcasts/livestreams` | Podcast livestreams | Live podcast streams |
| `/music/livestreams` | Music livestreams | Live music streams |
| `/playlists` | Playlists | Community playlists on Podverse |
| `/clips` | Clips | Podcast and music clips |
| `/videos` | Videos | Video content on Podverse |
| `/profiles` | Profiles | Public creator profiles |
| `/about` | About | About Podverse |
| `/contact` | Contact | Contact Podverse |
| `/terms` | Terms | Terms of service |
| `/donate` | Donate | Support Podverse |
| `/mobile-app` | Mobile app | Podverse mobile app |
| `/updates` | Updates | Product updates |
| `/v4v/metaboost` | MetaBoost | Value-for-value boosting |

## Files to update

Add `export async function generateMetadata` (or static `export const metadata`) to:

| File | Metadata type |
| --- | --- |
| `apps/web/src/app/page.tsx` | Curated home |
| `apps/web/src/app/podcasts/page.tsx` | Listing |
| `apps/web/src/app/episodes/page.tsx` | Listing |
| `apps/web/src/app/artists/page.tsx` | Listing |
| `apps/web/src/app/albums/page.tsx` | Listing |
| `apps/web/src/app/tracks/page.tsx` | Listing |
| `apps/web/src/app/podcasts/livestreams/page.tsx` | Listing |
| `apps/web/src/app/music/livestreams/page.tsx` | Listing |
| `apps/web/src/app/playlists/page.tsx` | Listing |
| `apps/web/src/app/clips/page.tsx` | Listing |
| `apps/web/src/app/videos/page.tsx` | Listing |
| `apps/web/src/app/profiles/page.tsx` | Listing |
| `apps/web/src/app/about/page.tsx` | Marketing |
| `apps/web/src/app/contact/page.tsx` | Marketing |
| `apps/web/src/app/terms/page.tsx` | Legal |
| `apps/web/src/app/donate/page.tsx` | Marketing |
| `apps/web/src/app/mobile-app/page.tsx` | Marketing |
| `apps/web/src/app/updates/page.tsx` | Marketing |
| `apps/web/src/app/v4v/metaboost/page.tsx` | Product |

Use `buildStaticPageMetadata()` from phase 1.

## Canonical rules for listing pages

- Canonical = path without pagination/sort query params.
- Example: `/podcasts?page=2` → canonical `/podcasts`.

## Default OG image

Use site default brand OG image from phase 1 layout defaults unless page has a
dedicated marketing asset.

## Do not use feed data here

Listing pages may SSR list rows containing channel titles in the **body**, but
**meta description must not** pull the first row's `channel_description`. Keep copy
stable and product-level.

## Exit criteria

- Each listed route has unique curated meta description in SSR HTML.
- Titles differ from generic brand-only title.
- i18n keys exist for en-US (and es if repo requires parity for new keys).
- No RSS `channel_description` / `item_description` used in these metadata builders.

## Verification

```bash
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run build -w apps/web
```

Manual:

```bash
curl -s http://localhost:4032/podcasts | rg -i 'meta name="description"'
```

Description should match curated i18n string, not a podcast show description.
