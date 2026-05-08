# Phase 01 — Design and types

## Goal

Finalize the composite `NavBar` API and discriminated unions **without** changing runtime
behavior yet (documentation-only or type stubs only if needed for CI — prefer docs-only in
this phase).

## Context

- Current shell:
  [packages/ui/src/components/navigation/NavBar/NavBar.tsx](../../../../packages/ui/src/components/navigation/NavBar/NavBar.tsx).
- Web pieces to absorb:
  [apps/web/src/components/NavBar/](../../../../apps/web/src/components/NavBar/).

## Deliverables

1. **Typed props** for the composite (export from `@podverse/ui` when implemented in phase
   02):

   - `appearance?: 'web' | 'management'` — keep existing semantics.
   - **`brand`** (required): `{ LinkComponent?, href, children, visibility?: 'always' |
     'mobileOnly' }` — `children` is logo/image or text; apps resolve theme-aware logo src.
   - **`backForward?`**: `{ onBack, onForward, backLabel, forwardLabel }` — labels are
     localized strings from the app.
   - **`search?`**: `{ LinkComponent?, href, ariaLabel }`.
   - **`accountMenu?`**: `{ ariaLabel, isLoggedIn, displayName?, LinkComponent?, items:
     Array<meta | link | action> }` using a discriminated union:
     - `{ type: 'meta'; key: string; label: string }`
     - `{ type: 'link'; key: string; label: string; href: string }`
     - `{ type: 'action'; key: string; label: string; onClick: () => void }`
   - **`mobileToggle?`**: `{ isOpen, onToggle, openLabel, closeLabel }` — controlled; apps
     own state.

2. **Link injection**: Document optional `LinkComponent` / `DropdownMenu.LinkItem`
   integration pattern (Next.js `Link` vs default `<a>`), aligned with existing
   `DropdownMenuLinkComponentProps`.

3. **i18n**: No default English in `@podverse/ui`; list every string that apps must pass.

4. **Optional**: Add a short `README` or comment block in the phase appendix listing files
   that will change in later phases (no code edits required if you keep this phase
   documentation-only).

## Verification

- Review against [.cursor/rules/shared-ui-i18n.mdc](../../../../.cursor/rules/shared-ui-i18n.mdc).
- Phase complete when the API is written down and agreed for phase 02 implementation.

## Appendix — reference items shape (sketch)

```typescript
// Illustrative only — final names live in packages/ui in phase 02
type NavBarAccountMenuItem =
  | { type: 'meta'; key: string; label: string }
  | { type: 'link'; key: string; label: string; href: string }
  | { type: 'action'; key: string; label: string; onClick: () => void };
```
