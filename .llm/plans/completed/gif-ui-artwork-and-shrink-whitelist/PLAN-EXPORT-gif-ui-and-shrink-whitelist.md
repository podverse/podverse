---
name: GIF UI and shrink whitelist
overview: Extend `@podverse/helpers` image URL rules so GIFs participate in every hero/header artwork path (including media player modal/desktop/mobile artwork via `buildMediaPlayerArtworkImageCandidates`). Add a strict shrink-service whitelist so only static raster types (e.g. png/jpeg/webp) are decoded/resized; GIF and detected multi-frame/animated inputs are skipped before or after fetch without attempting resize upload.
todos:
  - id: helpers-hero-gif
    content: Add shared default extensions incl. gif for hero/header helpers + optional list defaults in packages/helpers/src/lib/image.ts
    status: pending
  - id: helpers-player-covered
    content: Confirm mediaPlayerArtwork.ts needs no API change (uses merge hero); add unit test with .gif URL if useful
    status: pending
  - id: shrink-whitelist
    content: Add shrink-eligible extension helper + early skip + sharp metadata guard in imageShrink/batch.ts; tests
    status: pending
  - id: docs-shrink-gif
    content: Document static-only shrink policy in docs/image-shrinking
    status: pending
  - id: remove-debug-fetch
    content: Remove agent-log fetch regions from image.ts when editing
    status: pending
---

# GIF in headers/heroes + shrink whitelist

## Scope: where GIFs must load (UI)

Central behavior is [`packages/helpers/src/lib/image.ts`](packages/helpers/src/lib/image.ts) (`urlHasAllowedImageExtension` + default `allowedExtensions`).

**Hero / header surfaces** (large artwork, non-list-first selection) use:

- `findDTOItemImageForHero` / `findDTOChannelImageForHero`
- `buildDTOItemImageHeroLoadCandidates` / `buildDTOChannelImageHeroLoadCandidates`
- [`mergeDTOItemThenChannelImageHeroCandidates`](packages/helpers/src/lib/image.ts)

Web usage includes podcast/artist/album header images ([`CommonChannelHeaderImage.tsx`](apps/web/src/components/Common/Media/CommonChannelHeaderImage.tsx)), episode/track/chapter/clip headers ([`itemHeaderSquareArtworkCandidates`](packages/helpers/src/lib/image-candidates/itemHeaderSquareArtworkCandidates.ts) / lightbox), [`MediaHeaderMini.tsx`](apps/web/src/components/MediaHeaderMini/MediaHeaderMini.tsx), Add-by-RSS headers, etc.

**Media player “full size” artwork** is **not** a separate candidate builder: [`buildMediaPlayerArtworkImageCandidates`](packages/helpers/src/lib/image-candidates/mediaPlayerArtwork.ts) delegates to `mergeDTOItemThenChannelImageHeroCandidates`. Fixing hero defaults automatically fixes modal/desktop/mobile player images ([`MediaPlayerInfoModal.tsx`](apps/web/src/components/MediaPlayer/Modal/MediaPlayerInfoModal.tsx) and siblings).

**Implementation (UI):**

1. Introduce a shared constant in `image.ts`, e.g. `DEFAULT_HERO_ARTWORK_EXTENSIONS` (name TBD) = `['png', 'jpg', 'webp', 'gif']` (jpeg maps via existing URL parsing).
2. Use it as the default `allowedExtensions` for **every hero-oriented** export listed above so channel + item hero chains behave identically.

**Lists vs heroes:** Episode/grid/list rows use `mergeDTOItemThenChannelImageCandidates` / `buildDTOItemImageLoadCandidates` (list-first), which today share the same png/jpg/webp default. For **GIF in list cards** as well, extend the **list-oriented** defaults in the same file to the same quad — optional product call; if you only want GIF in large headers, restrict the constant to hero-only APIs and leave list defaults unchanged.

## Scope: shrink service whitelist (workers)

Today [`apps/workers/src/commands/imageShrink/batch.ts`](apps/workers/src/commands/imageShrink/batch.ts) pipes any fetched bytes through `sharp(...).resize().webp()` with **no** GIF/animation guard.

**Goal:** Only attempt shrink for **expected static raster** inputs; **never** run the resize/WebP upload path for GIF or detected animations.

**Implementation (shrink):**

1. **Shared rule** (prefer `@podverse/helpers` so worker + future callers agree): e.g. `SHRINK_ELIGIBLE_IMAGE_EXTENSIONS` = `png` | `jpg` | `jpeg` | `webp` only — **exclude `gif`**. Reuse the same URL parsing approach as [`urlHasAllowedImageExtension`](packages/helpers/src/lib/image.ts) for consistency.

2. **Early reject** at the start of `processTarget` (after basic validation, before expensive GET): if the source URL’s extension is **not** shrink-eligible, **return** without resizing (log at `info`/`debug`). Optionally touch `imageShrinkSourceService.updateCheckTime` / upsert minimal metadata so backfill does not hot-loop (match existing patterns for skipped work).

3. **Defense in depth** after download: run `sharp(originalBuffer).metadata()` before resize. Skip shrink if:

   - `metadata.format === 'gif'`, or
   - multi-page / animated WebP (e.g. `metadata.pages` / pages-related signals available from Sharp for WebP), or
   - `format` not in the allowed set.

   On skip: do **not** call `uploadResizedImage` / `saveResizedRow`; optionally record checksum/source row update only if existing flow expects it.

4. **Tests:** Worker unit test (or helpers test for URL helper + thin worker test for skip path) covering `.gif` URL early exit and a synthetic buffer that reports animated WebP metadata if feasible without heavy fixtures.

5. **Docs:** Short addition to [`docs/image-shrinking/SERVICE.md`](docs/image-shrinking/SERVICE.md) or architecture doc: shrink applies only to static png/jpeg/webp; GIFs remain origin URLs for display via UI helpers.

## Hygiene (same PR if touching `image.ts`)

Remove stray `#region agent log` / `fetch('http://127.0.0.1:7492/...')` blocks from [`packages/helpers/src/lib/image.ts`](packages/helpers/src/lib/image.ts) hero builders if still present — they should not ship in production bundles.

## Verification

```bash
./scripts/nix/with-env npm run test:unit -w @podverse/helpers
./scripts/nix/with-env npm run test:unit -w apps/workers
```

Lint touched packages as usual.
