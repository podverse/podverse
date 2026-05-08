# Shared UI Description (safe HTML)

Started: 2026-05-06  
Author: Agent  
Context: Move web `DescriptionRenderer` / `SafeHtmlDescription` into `@podverse/ui`.

### Session 1 - 2026-05-06

#### Prompt (Developer)

move the Description component to packages/ui

#### Key Decisions

- Added `packages/ui/src/components/layout/Description/` with `DescriptionRenderer`, `SafeHtmlDescription`, `isHtmlString`, and shared `SafeHtmlDescription.module.scss`; dependency `isomorphic-dompurify` on `@podverse/ui`.
- Exported prop types `DescriptionRendererProps` and `SafeHtmlDescriptionProps`.
- Removed `apps/web` local Description folder and dropped direct `isomorphic-dompurify` from `apps/web` (consumed via `@podverse/ui`).
- Vitest coverage for `isHtmlString`, sanitization, and plain vs HTML rendering.

#### Files Created/Modified

- packages/ui: `DescriptionRenderer.tsx`, `SafeHtmlDescription.module.scss`, `DescriptionRenderer.test.tsx`, `package.json`, `src/index.ts`
- apps/web: updated imports (including `next/dynamic` paths), removed `src/components/Description/*`, `package.json`
