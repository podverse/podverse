# image-placeholder-cls

## Metadata

- **Started:** 2026-05-05
- **Author:** Agent
- **Context:** Prevent layout shift when placeholder artwork vs loaded image in apps/web Image component

---

### Session 1 - 2026-05-05

#### Prompt (Developer)

use outline

#### Key Decisions

- Replaced `border` on `.imagePlaceholder` with `outline` + `outline-offset: -1px` so the fallback ring does not change border-box size versus successfully loaded images (`apps/web/src/styles/components/Image/Image.module.scss`).

#### Files Created/Modified

- `apps/web/src/styles/components/Image/Image.module.scss`
- `.llm/history/active/image-placeholder-cls/image-placeholder-cls-part-01.md`

---

### Session 2 - 2026-05-05

#### Prompt (Developer)

the placeholder image should have padding within the image wrapper so that the image itself appears to be smaller. i would make it approx 1/3 smaller than the wrapper size (the image wrapper should stay the same size only the image contents should appear smaller)

#### Key Decisions

- Placeholder branch wraps artwork in `.placeholderOuter` with inline `width`/`height` matching props (same slot as loaded image).
- Inner `NextImage` uses `Math.round((dim * 2) / 3)` (~⅓ smaller per axis than wrapper = visually inset).
- Consumer `className` (e.g. margin, border-radius) applies to the wrapper; `overflow: hidden` respects rounded corners.
- Ring uses `box-shadow: inset 0 0 0 1px` (no layout shift; not clipped by `overflow` like `outline`).

#### Files Created/Modified

- `apps/web/src/components/Image/Image.tsx`
- `apps/web/src/styles/components/Image/Image.module.scss`
- `.llm/history/active/image-placeholder-cls/image-placeholder-cls-part-01.md`

---

### Session 3 - 2026-05-05

#### Prompt (Developer)

the list view works but the grid view is breaking. can you fix this at the image level

#### Key Decisions

- Grid list nodes use [`ListGridNode.module.scss`](apps/web/src/styles/components/Common/List/ListGridNode.module.scss) `.image` with `width: 100%` + `aspect-ratio: 1 / 1`. Placeholder had inline `style={{ width: 600, height: 600 }}` from props (`IMAGES.LIST.GRID.SIZE`), forcing huge boxes that broke CSS grid.
- When `width`/`height` both equal `IMAGES.LIST.GRID.SIZE`, treat as fluid grid slot: **omit inline dimensions** on `.placeholderOuter`, add `.placeholderOuterFluid` (`min-width: 0`, `width: 100%`, etc.), and `.imagePlaceholderFluid` so the bitmap stays ~⅔ of the slot via `width: calc(200% / 3)`.

#### Files Created/Modified

- `apps/web/src/components/Image/Image.tsx`
- `apps/web/src/styles/components/Image/Image.module.scss`
- `.llm/history/active/image-placeholder-cls/image-placeholder-cls-part-01.md`
