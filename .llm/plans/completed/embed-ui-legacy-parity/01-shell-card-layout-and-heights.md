# 01 — Shell card layout and heights

## Objective

One legacy-style bordered card containing player, list (when present), and footer. Fix vertical clipping and bump iframe heights.

## File targets

- `apps/web/src/styles/components/embed/EmbedSingleShell.module.scss`
- `apps/web/src/styles/components/embed/EmbedListShell.module.scss`
- `apps/web/src/styles/components/embed/EmbedPlayerPanel.module.scss`
- `apps/web/src/styles/components/embed/EmbedFooter.module.scss`
- `apps/web/src/lib/embed/buildEmbedIframeCode.ts`
- `apps/web/src/styles/components/embed/EmbedNotFoundShell.module.scss` (height sync)
- `apps/web/src/styles/components/embed/EmbedNotAvailableShell.module.scss` (height sync)

## Changes

1. Move `border` + `border-radius` from `playerRegion` to `.shell` on single and list shells.
2. Remove `overflow: hidden` from `playerRegion` (use `overflow: visible`).
3. List embed: `playerRegion` `flex: 0 0 auto` with `min-height` ~200px so header never collapses.
4. Footer: keep `border-top`, no extra outer margin; reads as card footer.
5. Heights: single **260px**, list **720px** in shell SCSS and `DEFAULT_*_IFRAME_HEIGHT`.

## Acceptance criteria

- Single and list embeds show info + progress + transport without vertical clipping at 400–800px iframe width.
- Shell is one visual card (border on outer shell, not inner player only).
