---
name: mobile-image-loading
description: Mobile artwork prefetch, disk cache, first-paint preview, and iOS list thumbnails. Use when wiring CoverImage, decodeEdge, navigating into a channel/item header, or tuning image UX.
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

The headphone placeholder (`CoverImage` with no `uri`, or a URI that fails to load) is only for a
truly unknown channel — never for a row the user just tapped that already had art.

## CoverImage owns the cache

All product artwork goes through **`CoverImage`** (`apps/mobile/src/components/primitives/CoverImage.tsx`).
It uses **`expo-image`** with **`cachePolicy="memory-disk"`** so a list decode can be reused on a
compact header without a second network round-trip. Standalone covers open the lightbox only on a
**stationary tap** (`coverImageTap.ts`); a press that moves is a scroll/drag and must not open it.

- List and compact header must use the **same list-size URL**
  (`primaryChannelListArtworkUrl` / `primaryListArtworkUrl`) so the disk cache hits.
- Lightbox / full-screen viewer stays **largest original** and is **not** prefetched on list tap.
- Do not paint the placeholder bitmap behind a `uri` that is already set — that flashes the
  headphone icon while a known cover decodes.

## iOS list thumbnails

expo-image on iOS resizes a remote URI on the main queue. A Home chip switch mounts about twenty
covers in the commit that must paint the new chip, so full-size art stalls the finger lift.
Android already decodes at view size off the main thread.

`CoverImage` takes `decodeEdge` (displayed points) on list, grid, and compact header art.
`useCoverThumbnail` (`apps/mobile/src/components/primitives/useCoverThumbnail.ts`) is iOS-only:

- Eligible URIs exclude animated GIFs. No edge, or Android, returns `off` and the plain path runs.
- `thumbnailEdgePx` is `round(points × PixelRatio)`, at least 1. That is the decode size
  (`maxWidth` / `maxHeight` on `Image.loadAsync`). Do not add a step, a multiplier, or a "high
  definition" bump. A bitmap larger than the tile is minified in the layer and looks worse.
- The load source includes `scale: PixelRatio.get()`. Native `ImageSource` has `scale`; the public
  TypeScript type omits it, so the source is a variable rather than a type assertion. Scale 1
  leaves a device-pixel bitmap tagged as hundreds of points, and trilinear minification softens
  photographs while flat logos still look acceptable.
- The view receives the `ImageRef`, not `{ uri }`. An image reference skips the main-queue resize.
- The cache is about 24 MB of decoded pixels, keyed by pixel edge and URI. Do not `release()` the
  reference. A failed load is not remembered.

The channel header passes its 78 pt edge. The full-screen viewer and large player art omit
`decodeEdge`. Narrative and the T5 numbers:
[MOBILE-IOS-CHIP-SWITCH.md](/docs/development/mobile/MOBILE-IOS-CHIP-SWITCH.md).

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
server `has_*` column). See **mobile-section-chrome-cache**. Subscribe, the notification bell, and
download/delete icons use **mobile-navigate-known-state**.

## Related

- **header-hero-image-sources** — which URL for list vs lightbox
- **mobile-screen-layout** / **mobile-reusable-components** — where `CoverImage` sits
- **mobile-sync-orchestration** — first paint from cache on launch; pushed screens follow the same
  habit for already-known chrome
- **mobile-section-chrome-cache** — Official Clips / Podroll / episode evidence tabs
- **mobile-navigate-known-state** — subscribe / bell / download icons known before push
