# page-wrapper-shared-ui

**Started:** 2026-05-07  
**Author:** Agent  
**Context:** Move `PageWrapper` from apps/web into `@podverse/ui`.

---

### Session 1 - 2026-05-07

#### Prompt (Developer)

Execute **PageWrapper → `@podverse/ui` — phase 01** per
[`01-move-pagewrapper-to-shared-ui.md`](./01-move-pagewrapper-to-shared-ui.md): implement the shared
`PageWrapper`, export it, update `apps/web` root layout, delete the app-local component and SCSS, and
append LLM history. Preserve `id="page-wrapper"` and verify build; suggest targeted E2E smoke per
repo rules.

#### Key Decisions

- Shared **`PageWrapper`** in `packages/ui` mirrors web SCSS; root **`id="page-wrapper"`** fixed; optional **`className`** merged with module styles via `classnames`.
- Barrel exports placed after **`MainInnerWrapper`** in `packages/ui/src/index.ts`.
- Added **`PageWrapper.test.tsx`** (`#page-wrapper`, optional `className`).

#### Files Created/Modified

- `packages/ui/src/components/layout/PageWrapper/PageWrapper.tsx`
- `packages/ui/src/components/layout/PageWrapper/PageWrapper.module.scss`
- `packages/ui/src/components/layout/PageWrapper/PageWrapper.test.tsx`
- `packages/ui/src/index.ts`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/components/PageWrapper/PageWrapper.tsx` (deleted)
- `apps/web/src/styles/components/PageWrapper/PageWrapper.module.scss` (deleted)
- `.llm/plans/completed/page-wrapper-shared-ui/` (entire plan set from `active/`, including `01-move-pagewrapper-to-shared-ui.md`, `COPY-PASTA.md`, `00-*.md`)
