# 04 — List rows legacy layout

## Objective

List embed rows match legacy: small play button + title + date • duration (no episode artwork).

## File targets

- `apps/web/src/components/embed/EmbedListRow.tsx`
- `apps/web/src/styles/components/embed/EmbedListRow.module.scss`

## Changes

1. Remove `ImagesPerView` and thumbnail imports/styles.
2. Row: `PlayButtonRow` + text button (title + meta subline).
3. Reduce row vertical padding to `var(--space-xs)`.
4. Keep `rowActive` highlight.

## Acceptance criteria

- List rows have no thumbnail column; play circle + text only.
