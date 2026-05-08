# Phase 01 — Podverse: SCSS + Tooltip

## Scope

Remove `var()` fallback arguments from Podverse `*.module.scss` and fix behavior where fallbacks hid
undefined or wrong custom properties.

## Key files

- `packages/ui/src/components/layout/FilterTablePageLayout/FilterTablePageLayout.module.scss`
- `packages/ui/src/components/table/BulkActionBar/BulkActionBar.module.scss`
- `packages/ui/src/components/stats/StatsBarChart/StatsBarChart.module.scss`
- `packages/ui/src/components/table/Table/TableSortableHeaderCell.module.scss`
- `packages/ui/src/components/overlays/Tooltip/Tooltip.module.scss`
- `packages/ui/src/components/overlays/Tooltip/Tooltip.tsx`
- `apps/web/src/styles/components/MediaPlayer/Modal/MediaPlayerVtsOverrideLikeButton.module.scss`

## Steps

1. **FilterTablePageLayout.module.scss** — Replace:
   - `--font-size-heading` → `--font-size-xl`
   - `--font-size-small` → `--font-size-sm`
   - `--color-text-muted` → `--text-color-secondary`
   - `--color-danger` → `--text-color-danger`  
   Remove all comma fallbacks.

2. **BulkActionBar.module.scss** — Replace `--color-background`, `--color-border`, `--font-size-small`
   with canonical Podverse tokens (e.g. `--background-color-secondary` or tertiary for sticky bar,
   `--border-color-tertiary`, `--font-size-sm`). Confirm visually against management-web table pages.

3. **StatsBarChart.module.scss** — Replace `--pv-color-text-muted` with `--text-color-secondary` (or add a
   chart token in `_themes.scss` only if product requires a distinct color).

4. **TableSortableHeaderCell.module.scss** — Replace
   `outline: 2px solid var(--focus-ring-color, var(--color-primary))` with a single token that exists in
   themes, e.g. `var(--border-color-primary)` (avoid nonexistent `--color-primary` as CSS variable).

5. **Tooltip** — In `Tooltip.module.scss`, use `left: var(--arrow-left)` only (no `, 50%`). In
   `Tooltip.tsx`, when `showArrow` is true, always set `--arrow-left` to `arrowLeft !== undefined ?
   \`${arrowLeft}px\` : '50%'`.

6. **MediaPlayerVtsOverrideLikeButton.module.scss** — Replace `var(--mp-text, inherit)` with
   `var(--text-color-primary)` (or another canonical modal text token consistent with
   `MediaPlayerInfoModal.module.scss`).

## Optional follow-up

- `packages/ui/src/components/stats/StatsBarChart/StatsBarChart.tsx`: remove fallback from
  `fill="var(--pv-color-primary, ...)"` using a canonical stroke/fill token.

## Verification

- From Podverse repo root: `rg 'var\([^)]+,' --glob '*.scss'` → no matches in this repo after edits.
- Smoke UI areas listed in `00-SUMMARY.md`.
