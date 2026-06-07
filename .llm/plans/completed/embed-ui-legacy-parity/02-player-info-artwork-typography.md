# 02 — Player info, artwork, typography

## Objective

Match legacy player info row: 76px artwork, strong title hierarchy, pill-style publish date.

## File targets

- `apps/web/src/components/embed/EmbedPlayerInfo.tsx`
- `apps/web/src/styles/components/embed/EmbedPlayerInfo.module.scss`

## Changes

1. Artwork wrapper: **76px** (`IMAGES.MEDIA_PLAYER.DESKTOP.MINI.SIZE`).
2. When `buildMediaPlayerArtworkImageCandidates` returns empty, pass `[IMAGES.SRC.PLACEHOLDER]` to `ImageNonReact`.
3. Channel: `font-size-xs`, secondary, single-line ellipsis.
4. Title: `font-size-base` or `font-size-md`, bold, single-line ellipsis (replace 2-line clamp).
5. Date: wrap `ReadableDate` in pill (`background: var(--color-surface-secondary)`, padding, `border-radius: var(--radius-sm)`).
6. Keep existing `data-testid` hooks.

## Acceptance criteria

- Artwork shows image or placeholder (no broken icon).
- Title reads larger than channel name; date appears as a pill.
