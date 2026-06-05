# Phase 4 — Async rendering and SSR SEO hardening

## Goal

Address routes where client-only or partial SSR behavior could leave bots with thin
HTML or wrong indexing signals. Complement head metadata from phases 2–3.

## Problem routes

| Route | Issue | Remediation |
| --- | --- | --- |
| `/search` | Client-only `SearchPageClient`; no SSR results | `noindex` (phase 4); optional static meta title "Search" |
| `/settings` | Client-only shell | `noindex` (phase 3) |
| `/profile/[id_text]` | Tabs/lists client-loaded | Server metadata from `ssrAccount`; conditional robots |
| `/playlist/[playlist_id]` | User-generated | Conditional robots from sharable/public flag on DTO |
| Add-by-Rss subtree | Heavy client fetch | Layout-level `noindex` (phase 3) |
| Transcript tabs | `dynamic(..., { ssr: false })` | OK — do not use transcript as meta description |

## Conditional public content

### Profile page

File: `apps/web/src/app/profile/[id_text]/page.tsx`

In `generateMetadata`:

1. Fetch account via same cached fetcher as page (reuse `reqAccountGetByIdText`).
2. If not found → return `buildNoindexMetadata({ title: 'Profile' })` or let redirect
   stand; metadata for 404/notFound should still be noindex.
3. Read `sharable_status` (or equivalent DTO field):
   - **public** → indexable; title = display name / username; description = curated
     or account bio field if present (not email).
   - **unlisted** → `noindex` (link-only discovery).
   - **private** → `noindex`; page redirects to `/profiles` — metadata should not
     leak private info.

### Playlist page

File: `apps/web/src/app/playlist/[playlist_id]/page.tsx`

In `generateMetadata`:

1. Fetch playlist via cached `reqPlaylistGet`.
2. If playlist has public/sharable visibility → index with title = playlist title;
   description = playlist description field if exists (user-authored, not RSS).
3. Else → `noindex`.

Document visibility rules inline with ORM/DTO field names used in API responses.

## Search page policy (explicit)

File: `apps/web/src/app/search/page.tsx`

**Decision:** `/search` is **not** indexed.

- Rationale: results are client-fetched; SEO value is low; avoids duplicate/thin pages.
- Implement `buildNoindexMetadata({ title: 'Search' })`.
- Do **not** attempt SSR search results for bots in this phase.

If product later wants indexable search, create a new plan — out of scope here.

## Ensure primary entity heading in body (optional hardening)

Detail pages use `<h2>` for entity titles in some components (e.g. episode header).
Optional improvement (low priority):

- Promote primary entity title to `<h1>` on public content pages for accessibility/SERP
  alignment, **or** document why `<h2>` is retained due to layout `MainHeader` `<h1>`.

If layout already renders an `<h1>` for section title, ensure exactly one `<h1>` per page
(single-focus semantic document). Note outcome in PR description; do not block SEO merge.

## SSR HTML spot-check script (optional dev helper)

Add `scripts/development/seo-ssr-spot-check.sh` (optional):

- Curl sample URLs; grep for title, description, robots, canonical.
- Used locally — not CI-required unless desired.

## Double-fetch avoidance

All `generateMetadata` functions added in phases 2–4 must use `React.cache` fetchers
from `apps/web/src/lib/seo/fetchers.ts`. Audit each route — no duplicate API round-trip
per request beyond cached call.

## Exit criteria

- Profile and playlist pages set robots based on visibility DTO fields.
- Search confirmed noindex with documented rationale.
- No public RSS content route relies solely on client effect for **title/description
  in head** (head covered in phase 2a).
- Cached fetchers shared between `generateMetadata` and page components.

## Verification

```bash
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run build -w apps/web
```

Manual profile checks with seeded public vs private accounts (after `make e2e_seed`):

```bash
curl -s http://localhost:4032/profile/<public-id-text> | rg -i 'robots|description'
curl -s http://localhost:4032/profile/<private-id-text> | rg -i 'noindex'
```

Phase 6 automates profile sharable_status matrix.
