---
name: mobile-image-loading
description: Mobile artwork prefetch, disk cache, and first-paint preview so list→detail navigation does not flash empty covers. Use when wiring CoverImage, navigating into a channel/item header, or tuning image UX on weak Android.
---

# Mobile image loading (prefetch, cache, FOUC)

## When to use

Any time you wire **mobile artwork**, navigate from a painted list/grid into a **detail header**, or
touch player chrome that shows cover art.

URL selection (list vs lightbox) stays in **header-hero-image-sources**. This skill is the
**loading and cache** layer on top of those URLs.

## First paint from already-known pixels

If the source screen already painted list art, the destination **must** paint that same list URL on
the first frame. Do not wait for the network DTO before showing chrome the user already saw.

Prefer, in order:

1. **Route preview params** (`previewImageUrl` / `previewTitle`) from the painted row — see
   `apps/mobile/src/navigation/podcastDetailParams.ts`.
2. **SQLite / repository** hydration when preview is missing (deep link to a subscribed channel).
3. Network DTO refresh replaces preview when it arrives. Preview is display-only until confirmed.

Gray fallback (`CoverImage` with no `uri`) is only for a truly unknown channel — never for a row
the user just tapped that already had art.

## CoverImage owns the cache

All product artwork goes through **`CoverImage`** (`apps/mobile/src/components/primitives/CoverImage.tsx`).
It uses **`expo-image`** with **`cachePolicy="memory-disk"`** so a list decode can be reused on a
compact header without a second network round-trip. Standalone covers open the lightbox only on a
**stationary tap** (`coverImageTap.ts`); a press that moves is a scroll/drag and must not open it.

- List and compact header must use the **same list-size URL**
  (`primaryChannelListArtworkUrl` / `primaryListArtworkUrl`) so the disk cache hits.
- Lightbox / full-screen viewer stays **largest original** and is **not** prefetched on list tap.
- Do not put a gray fill behind a `uri` that is already set — that reads as an empty placeholder.

## Never block a tap

Prefetch, network, and shared-element setup must never sit between press and navigate.

- Optional `Image.prefetch(uri)` on press is **fire-and-forget** — never `await`ed before
  `navigation.navigate`.
- Do not add shared-element / Reanimated hero transitions to hide a missing cache. Fix the URI and
  the cache first.

## UX vs performance on weak Android

Paint known local pixels immediately. Prefer disk cache over re-decode. Do not add transition or
animation cost just to hide a cold load. Do not prefetch full-size lightbox files to make a push
feel smoother — that burns bandwidth and decode time on constrained devices.

Section chips that depend on a detail DTO use the same first-paint habit (device cache, not a
server `has_*` column). See **mobile-section-chrome-cache**.

## Related

- **header-hero-image-sources** — which URL for list vs lightbox
- **mobile-screen-layout** / **mobile-reusable-components** — where `CoverImage` sits
- **mobile-sync-orchestration** — first paint from cache on launch; pushed screens follow the same
  habit for already-known chrome
- **mobile-section-chrome-cache** — Official Clips / Podroll / episode evidence tabs
