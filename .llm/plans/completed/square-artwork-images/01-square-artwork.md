# 01 — Square artwork via a dedicated token

## Step 1: Add the token

- Add `--border-radius-artwork: 0;` in `packages/ui/src/styles/_variables-root.scss` (next to the existing `--border-radius` block).
- Mirror as `$border-radius-artwork: var(--border-radius-artwork);` in `packages/ui/src/styles/_variables.scss` for parity.

## Step 2: Point artwork selectors at the token

Replace `border-radius: var(--border-radius)` (and the `--border-radius-sm` / `--border-radius-md` aliases) on artwork/thumbnail image selectors with `border-radius: var(--border-radius-artwork)`.

Shared list/grid (highest leverage — podcasts, episodes, tracks, artists, albums, queues, playlists, live items, grid tiles):

- `apps/web/src/styles/components/Common/List/Podcasts/ListPodcastRow.module.scss` (`.image`)
- `apps/web/src/styles/components/Common/List/Podcasts/Episodes/ListEpisodeRow.module.scss` (`.image`, `.imageMobile`)
- `apps/web/src/styles/components/Common/List/LiveItem/ListLiveItemRow.module.scss` (`.image`, `.imageMobile`)
- `apps/web/src/styles/components/Common/List/ListGridNode.module.scss` (`.image` only — leave `.gridNode` hover container on `--border-radius`)

List-specific rows (imported by TSX):

- `apps/web/src/styles/components/List/Clips/ListClipRow.module.scss`
- `apps/web/src/styles/components/List/ItemChapters/ListItemChapterRow.module.scss`
- `apps/web/src/styles/components/List/ItemSoundbites/ListItemSoundbiteRow.module.scss`
- `apps/web/src/styles/components/List/SearchResults/ListSearchResultPodcastIndexFeedRow.module.scss`

Embed + Podcast Index + Add-by-RSS:

- `apps/web/src/styles/components/embed/EmbedPlayerInfo.module.scss` (`.image`, `.brandLogo`/`.brandLogoLink`)
- `apps/web/src/styles/components/embed/EmbedVideoCenterArt.module.scss` (`.centerArt`)
- `apps/web/src/styles/components/PodcastIndex/PodcastIndexFeedInfo.module.scss` (`.image`)
- `apps/web/src/styles/components/AddByRSS/List/AddByRSSList.module.scss` (`.image`, currently `--border-radius-sm`)
- `apps/web/src/styles/components/AddByRSS/Detail/AddByRSSDetail.module.scss` (`.feedImage`, currently `--border-radius-md`)

## Step 3: Safety sweep

- Grep `apps/web/src/styles` for remaining `border-radius: var(--border-radius` on `image`/`art`/`thumb`/`logo`/`centerArt`/`feedImage` selectors; confirm only intentional non-artwork containers (cards, `.gridNode`/`.listItem` hover rows, panels) still reference `--border-radius`.
- Headers and the media player bar/modal art are already square (no radius) — no change needed; end state is consistent.
- With radius 0 there is nothing to clip, so the `ImageNonReact` wrapper-vs-img clipping caveat is moot.

## Verification

```bash
make e2e_test_web_report_spec SPEC=e2e/podcast.spec.ts
```
