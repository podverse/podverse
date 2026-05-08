# PageWrapper → `@podverse/ui` — summary

**Status:** Active (plan only; execution is follow-on work).

## Objective

Move [`PageWrapper`](../../../../apps/web/src/components/PageWrapper/PageWrapper.tsx) from
**apps/web** into [`packages/ui`](../../../../packages/ui) so the layout shell is reusable and aligned
with [`AppWrapper`](../../../../packages/ui/src/components/layout/AppWrapper/AppWrapper.tsx) and
other layout primitives.

## In scope

- New `PageWrapper` under `packages/ui/src/components/layout/PageWrapper/` (`.tsx` + module SCSS).
- Export from `packages/ui/src/index.ts`.
- Root layout imports `PageWrapper` from `@podverse/ui`; delete app-local component and its SCSS.
- Preserve **`id="page-wrapper"`** on the root element (required by media player layout JS and global
  SCSS — see phase file).

## Out of scope

- **management-web** — no change unless a later initiative adopts the same shell.
- Broader layout refactors (`WindowWrapper`, `SideBar`, etc.).

## References

- [`.cursor/rules/prefer-shared-ui-web-management.mdc`](../../../../.cursor/rules/prefer-shared-ui-web-management.mdc)
- [ui-component-promotion](../../../../.cursor/skills/ui-component-promotion/SKILL.md)
