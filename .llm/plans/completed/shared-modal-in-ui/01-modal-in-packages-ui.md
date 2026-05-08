# 01 — Modal in `packages/ui`

## Goal

Add `Modal` + `MODAL_CONTENT_MAX_WIDTH` to `@podverse/ui`, ported from [`apps/web/src/components/Modal/Modal.tsx`](../../../../apps/web/src/components/Modal/Modal.tsx) and [`apps/web/src/styles/components/Modal/Modal.module.scss`](../../../../apps/web/src/styles/components/Modal/Modal.module.scss).

## Implementation

- **Directory:** `packages/ui/src/components/layout/Modal/` (`Modal.tsx`, `Modal.module.scss`, `Modal.test.tsx`; add `index.ts` only if consistent with sibling layout components).
- **SCSS:** Use UI breakpoints and mixins, e.g. `@use '../../../styles/breakpoints';`, `@use '../../../styles/mixins/flexbox' as *;`, `@use '../../../styles/mixins/layout' as *;` (see [`FooterLayout.module.scss`](../../../../packages/ui/src/components/layout/FooterLayout/FooterLayout.module.scss)). Reuse tokens from [`_variables-root.scss`](../../../../packages/ui/src/styles/_variables-root.scss) (`--shadow-modal`, `--spacing-modal-padding`, etc.).
- **Props:** Match current behavior: `isOpen`, `onClose?`, `ariaLabel`, `children`, optional `header`, `modalContentMaxWidth?`, `contentTransparent?`. Export `MODAL_CONTENT_MAX_WIDTH` (= 580).
- **i18n:** No hardcoded user-visible or AT strings in the package. When `onClose` is provided, require `closeButtonAriaLabel: string` (discriminated typing so call sites cannot omit it).
- **Exports:** [`packages/ui/src/index.ts`](../../../../packages/ui/src/index.ts).
- **Tests:** Vitest + Testing Library — closed → `null`; open → `role="dialog"` and backdrop present.
- **Docs:** Brief entry in [`packages/ui/PACKAGES-UI.md`](../../../../packages/ui/PACKAGES-UI.md).

## Preserve edge behavior

Keep `(header || header === '')` header-row semantics unless explicitly simplifying (parity with current web).
