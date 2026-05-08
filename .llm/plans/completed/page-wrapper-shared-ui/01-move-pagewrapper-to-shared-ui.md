# Phase 01 — Move PageWrapper to `@podverse/ui`

## Goal

Replace the web-only `PageWrapper` with a shared implementation under `packages/ui`, keeping DOM and
visual behavior identical.

## Current sources

| Artifact | Path |
| --- | --- |
| Component | [`apps/web/src/components/PageWrapper/PageWrapper.tsx`](../../../../apps/web/src/components/PageWrapper/PageWrapper.tsx) |
| Styles | [`apps/web/src/styles/components/PageWrapper/PageWrapper.module.scss`](../../../../apps/web/src/styles/components/PageWrapper/PageWrapper.module.scss) |
| Consumer | [`apps/web/src/app/layout.tsx`](../../../../apps/web/src/app/layout.tsx) |

## Non-negotiable: `id="page-wrapper"`

The root element **must** keep `id="page-wrapper"` (hardcode; do not make configurable without
updating all dependents):

- [`apps/web/src/utils/mediaPlayer/mediaPlayerLayout.ts`](../../../../apps/web/src/utils/mediaPlayer/mediaPlayerLayout.ts)
  — `getElementById('page-wrapper')` toggles `media-player-active`.
- [`apps/web/src/styles/globals/pageAdjust.scss`](../../../../apps/web/src/styles/globals/pageAdjust.scss)
  — `#page-wrapper.media-player-active` rules.

## Implementation checklist

1. **Add** `packages/ui/src/components/layout/PageWrapper/PageWrapper.tsx`
   - Mirror patterns from
     [`AppWrapper`](../../../../packages/ui/src/components/layout/AppWrapper/AppWrapper.tsx): `import type { ReactNode } from 'react'`,
     `classnames` for optional `className`, named function export.
   - Props: `children: ReactNode`, optional `className?: string`.
   - Root `div`: **`id="page-wrapper"`** always, `className` merged with module class.

2. **Add** `packages/ui/src/components/layout/PageWrapper/PageWrapper.module.scss` — copy rules from
   the web file unchanged (`.pageWrapper`: flex column, flex 1, min-height/height 100vh,
   overflow-y auto).

3. **Export** `PageWrapper` and `PageWrapperProps` from
   [`packages/ui/src/index.ts`](../../../../packages/ui/src/index.ts) (alphabetically with other layout
   exports).

4. **Update** [`apps/web/src/app/layout.tsx`](../../../../apps/web/src/app/layout.tsx): import
   `PageWrapper` from `@podverse/ui` (alongside `AppWrapper`); remove local `PageWrapper` import.

5. **Delete**
   - `apps/web/src/components/PageWrapper/PageWrapper.tsx`
   - `apps/web/src/styles/components/PageWrapper/PageWrapper.module.scss`

6. **LLM history** — append a session under `.llm/history/active/[feature]/` per repo rules (exact
   prompt, files touched).

## Verification (executor / human)

From monorepo root (Nix: `./scripts/nix/with-env …`):

```bash
npm run build:packages
npm run build -w apps/web
```

Optional E2E smoke (adjust spec if your smoke path differs):

```bash
make e2e_test_web_report_spec SPEC=e2e/smoke.spec.ts
```

## Appendix — layout context (reference)

`RootLayout` nests: `WindowWrapper` → `AppWrapper` → `SideBar` + `PageWrapper` → nav, banner,
`children`. Only `PageWrapper` moves in this phase.
