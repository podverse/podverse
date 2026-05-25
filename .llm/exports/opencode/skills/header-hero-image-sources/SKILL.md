---
name: header-hero-image-sources
description: "Converted from .llm/exports/opencode/skills/header-hero-image-sources/SKILL.md"
version: 1.0.0
---


# Header / hero vs list image sources

## When to use

Any time you wire **podcast/channel artwork**, **episode/item artwork**, or merged chains for **large visible surfaces** (headers, hero regions, expanded player artwork, `MediaHeaderMini`) versus **lists, grids, rows, and compact tiles**.

## Rules

1. **Lists and grids** — Use **`buildDTOItemImageLoadCandidates`**, **`buildDTOChannelImageLoadCandidates`**, **`mergeDTOItemThenChannelImageCandidates`**, **`addByRSSFeedListArtworkCandidates`**, **`addByRSSResourceMergedArtworkCandidates`** (queue/playlist rows). These use **`findDTO*ImageForList`** so **`is_resized`** CDN thumbs are preferred when they match the target size (bandwidth-friendly).

2. **Headers, hero artwork, lightbox-quality chains, media chrome** — Use **`buildDTOItemImageHeroLoadCandidates`**, **`buildDTOChannelImageHeroLoadCandidates`**, **`mergeDTOItemThenChannelImageHeroCandidates`**, **`itemHeaderSquareArtworkCandidates`** (episode/track/chapter/clip square headers), and **`addByRSSChannelHeaderTriple`** / **`addByRSSChannelHeaderGreaterBreakpointCandidates`** (already hero-based). Primary selection uses **`findDTO*ImageBySize`** only — **never** the list-oriented resized-first finder.

3. **Comparison + targets** — For hero slots, pair **`IMAGES.HEADER.*.SIZE_FIND_TARGET`** with **`greater`** so the chosen asset is **at least** as wide as the displayed slot (see `apps/web/src/constants/images.ts`). **`lesser`** + list targets belong on **`IMAGES.LIST.*`** surfaces.

4. **Do not** pass list/grid candidate helpers into **`CommonChannelHeaderImage`**, **`CommonItemHeader`** header props, Add-by-RSS podcast/artist/album **header** components, or **`MediaHeaderMini`**.

## Reference

Implementation: `packages/helpers/src/lib/image.ts` (`buildDTOImageLoadCandidates` and hero variants).
