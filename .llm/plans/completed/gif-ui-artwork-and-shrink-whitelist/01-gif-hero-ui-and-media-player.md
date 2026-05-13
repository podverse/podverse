# 01 — GIF in hero/header artwork (and media player)

## Root cause

[`packages/helpers/src/lib/image.ts`](packages/helpers/src/lib/image.ts): hero APIs default to `allowedExtensions: ['png', 'jpg', 'webp']`. [`urlHasAllowedImageExtension`](packages/helpers/src/lib/image.ts) rejects `.gif` URLs.

## What to change

1. Add a shared constant (name TBD), e.g. `DEFAULT_HERO_ARTWORK_EXTENSIONS = ['png', 'jpg', 'webp', 'gif']`, exported if useful for tests.

2. Use it as the default for **hero-only** exports:

   - `findDTOItemImageForHero`
   - `findDTOChannelImageForHero`
   - `buildDTOItemImageHeroLoadCandidates`
   - `buildDTOChannelImageHeroLoadCandidates`
   - `mergeDTOItemThenChannelImageHeroCandidates`

3. **Media player:** [`buildMediaPlayerArtworkImageCandidates`](packages/helpers/src/lib/image-candidates/mediaPlayerArtwork.ts) already uses `mergeDTOItemThenChannelImageHeroCandidates` — no API change once hero defaults include `gif`.

4. **Web surfaces affected** (no component edits if defaults fixed): [`CommonChannelHeaderImage.tsx`](apps/web/src/components/Common/Media/CommonChannelHeaderImage.tsx), episode/track/chapter/clip headers via [`itemHeaderSquareArtworkCandidates`](packages/helpers/src/lib/image-candidates/itemHeaderSquareArtworkCandidates.ts), [`MediaHeaderMini.tsx`](apps/web/src/components/MediaHeaderMini/MediaHeaderMini.tsx), Add-by-RSS headers, [`MediaPlayerInfoModal.tsx`](apps/web/src/components/MediaPlayer/Modal/MediaPlayerInfoModal.tsx) / desktop / mobile player info.

## Lists / grids (optional)

List-first helpers (`findDTOItemImageForList`, `buildDTOItemImageLoadCandidates`, `mergeDTOItemThenChannelImageCandidates`) use the same png/jpg/webp default. Extend to include `gif` **only if** product wants GIF in episode/album/grid rows; otherwise leave unchanged.

## Tests

[`packages/helpers/src/lib/image-candidates/imageCandidates.test.ts`](packages/helpers/src/lib/image-candidates/imageCandidates.test.ts), [`packages/helpers/src/lib/image.test.ts`](packages/helpers/src/lib/image.test.ts): primary `.gif` hero URL selected when appropriate.

## Hygiene

Remove `#region agent log` / `fetch('http://127.0.0.1:7492/...')` blocks from hero builders in `image.ts` when editing.
