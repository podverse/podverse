# Web focus state consistency — execution order

1. **01-foundation-focus-ring-mixin.md** — Shared mixin + global `:focus-visible` on `button` / `a` /
   `summary`.
2. **02-button-primitives-migration.md** — `Button`, `IconButton`, `MoreButton`, `Tab`, `Link` in
   `@podverse/ui`.
3. **03-overflow-and-image-buttons.md** — Header button row, `Tabs` strip, `Button` overflow, square
   image buttons.
4. **04-non-button-focusables.md** — Volume + progress sliders.
5. **05-tests-and-verification.md** — Playwright `focus-states.spec.ts` + spec order list.

Phases 02 and 03 may be combined in one PR after 01 is merged; 04 and 05 depend on mixin + globals.
