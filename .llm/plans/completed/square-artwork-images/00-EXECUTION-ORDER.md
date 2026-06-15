# Square (non-rounded) artwork images, controlled centrally — Execution Order

Make all artwork/thumbnail images across the site square by introducing a dedicated `--border-radius-artwork` token (set to 0) and pointing every artwork SCSS rule at it, so future rounding changes happen in one place without affecting cards, modals, or buttons.

## Why a new token

Today image rounding is applied per-feature via `border-radius: var(--border-radius)` on `.image`-style classes, and `--border-radius` is also used by cards, modals, inputs, dropdowns, and buttons. Zeroing the global token would square all of those too. The shared `@podverse/ui` `Image` components do NOT own radius — the per-feature `.image` SCSS classes are the source of truth. So add one artwork-specific token and route every artwork rule through it.

## Phases (single working phase + sweep)

1. `01-square-artwork.md` — add the token and swap all artwork selectors; verify with a sweep.

## Out of scope

- Do not change `--border-radius` (cards, modals, inputs, dropdowns, tooltips, badges, secondary buttons, list-row hover) or `--border-radius-round` (play buttons, sliders, icon buttons).
- Optional later cleanup: unused duplicate SCSS mirrors under `apps/web/src/styles/components/List/` (non-`Common/`) that no TSX imports.
