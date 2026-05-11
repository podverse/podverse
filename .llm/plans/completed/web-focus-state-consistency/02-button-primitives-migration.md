# 02 — Button primitives (`@podverse/ui`)

## Deliverables

- Theme token `--box-shadow-focus-tab-strip` per palette in `_themes.scss` (paired with focus ring
  color).
- `Button.module.scss`: `overflow: visible`; variant `:focus` → `:focus-visible` where appropriate.
- `IconButton.module.scss`: remove duplicate outline; ghost appearance uses round radius for circular
  ring.
- `MoreButton.module.scss`: remove outline stacking.
- `Tab.module.scss`: `.tab:focus-visible` uses combined strip + `var(--box-shadow-focus)`.
- `Link.module.scss`: `:focus` → `:focus-visible` for color changes.
