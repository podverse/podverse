# side-content-packages-ui

**Started:** 2026-05-06  
**Author:** Agent  
**Context:** Move **`SideContent`** layout shell from **`apps/web`** into **`@podverse/ui`** for reuse.

### Session 1 - 2026-05-06

#### Prompt (Developer)

move SideContent into packages/ui

#### Key Decisions

- Added **`SideContent`** + **`SideContentProps`** under **`packages/ui/src/components/layout/SideContent/`** with SCSS using **`packages/ui`** breakpoints (same responsive hide-below-lg behavior as the former web module).
- Exported from **`packages/ui/src/index.ts`**; **`apps/web`** imports **`SideContent`** from **`@podverse/ui`** everywhere (merged duplicate **`@podverse/ui`** import lines where needed).
- Removed **`apps/web/src/components/SideContent/`** and **`apps/web/src/styles/components/SideContent/`**.

#### Files Created/Modified

- `packages/ui/src/components/layout/SideContent/SideContent.tsx`
- `packages/ui/src/components/layout/SideContent/SideContent.module.scss`
- `packages/ui/src/index.ts`
- `apps/web/src/**/*.tsx` (all former **`SideContent`** call sites)
- Deleted `apps/web/src/components/SideContent/SideContent.tsx`
- Deleted `apps/web/src/styles/components/SideContent/SideContent.module.scss`
