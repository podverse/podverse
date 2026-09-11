---
name: header-hero-image-sources
version: 1.1.0
---

# Artwork sources: list, compact chrome, lightbox

## When to use

Any time you wire **podcast/channel artwork**, **episode/item artwork**, or merged chains on **web or mobile**. Do not pick `item_images[0]` / `channel_images[0]` / `images[0]`. Use `@podverse/helpers` so both apps prefer the same URL.

## Prefer shrunken artwork when it exists

CDN rows with **`is_resized === true`** are the bandwidth-friendly pick. Use them for every compact painted slot. Full-size originals belong in the **image viewer / lightbox**, not in lists.

## Surface rules

1. **Lists, grids, rows, tiles** — **`findDTO*ImageForList`**, **`buildDTO*ImageLoadCandidates`**, **`mergeDTOItemThenChannelImageCandidates`**, **`addByRSSFeedListArtworkCandidates`**, **`addByRSSResourceMergedArtworkCandidates`**, or the single-URL wrappers **`primaryListArtworkUrl`** / **`primaryChannelListArtworkUrl`**. These prefer resized thumbs that match the target size.

2. **Compact headers, profile art, mini player chrome** — same **list / shrunken-first** helpers. A 64–128px header does not need the original file. Pair with list or compact targets (`IMAGES.LIST.*`, `IMAGES.MEDIA_HEADER_MINI.*`, `IMAGES.MEDIA_PLAYER.*.MINI`, or **`ARTWORK_LIST_SIZE_FIND_TARGET`**) and **`lesser`**.

3. **Large in-app hero / fullscreen player art** — **`buildDTO*ImageHeroLoadCandidates`**, **`mergeDTOItemThenChannelImageHeroCandidates`**, **`itemHeaderSquareArtworkCandidates`**, **`buildMediaPlayerArtworkImageCandidates`** with **`artworkRole: 'hero'`**. Primary selection uses **`findDTO*ImageBySize` / `findDTO*ImageForHero`**, not the list finder.

4. **Full-size image viewer / lightbox** — always the **largest** usable original: **`itemHeaderLightboxArtworkCandidates`**, **`buildDTO*ImageHeroLoadCandidates(..., 'largest', 'greater')`**, **`primaryLightboxArtworkUrl`**, **`primaryChannelLightboxArtworkUrl`**. Never open the viewer on the list thumb when a larger candidate exists.

5. **Comparison + targets** — Hero slots that stay on-page use **`IMAGES.HEADER.*.SIZE_FIND_TARGET`** with **`greater`**. List / compact slots use **`lesser`** + list or mini targets. Lightbox uses **`'largest'`**.

## Image tap vs row tap

- If the **row, cell, or chrome is already the control** (navigates, plays, opens the player), the row action wins. Do not nest an image tap that steals that gesture. Web: no lightbox button inside a `Link` / row `onClick`. Mobile: **`CoverImage` `opensViewer={false}`**.
- If the image sits on a **non-interactive** surface (page header, compact form header, standalone cover), tap/click opens the full-size viewer with **largest** candidates. Web: **`ImageLightboxModal`**. Mobile: **`CoverImage`** (default `opensViewer`) + **`viewerUri`** from a lightbox helper.

## Do not

- Do not pass list/grid candidate helpers into a **lightbox** `candidates` / `viewerUri` prop.
- Do not pass hero/largest helpers into **list, grid, mini, or compact header** display slots.
- Do not invent a per-app first-URL picker. If the consumer needs one string (React Native `Image`, SQLite `image_url`), use **`primaryListArtworkUrl`** / **`primaryLightboxArtworkUrl`** (or the channel variants).

## Reference

Implementation: `packages/helpers/src/lib/image.ts` and `packages/helpers/src/lib/image-candidates/`.
