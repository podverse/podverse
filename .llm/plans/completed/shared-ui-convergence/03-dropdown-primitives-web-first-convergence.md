# 03 — Dropdown keyboard hook in `@podverse/ui`

## Goal

Promote `useDropdownKeyboardNavigation` from web into `packages/ui` so keyboard/menu behavior has a single implementation.

## Prompt

- Add `packages/ui/src/hooks/useDropdownKeyboardNavigation.tsx` (typed, no `any`; avoid unnecessary assertions).
- Export from `packages/ui/src/index.ts`.
- Update all web imports to use `@podverse/ui`; delete `apps/web/src/hooks/useDropdownKeyboardNavigation.tsx`.
- Keep web `Dropdown` / `DropdownMenu` presentation and a11y behavior unchanged (parity).

## Done when

- No duplicate hook in `apps/web`; consumers import from `@podverse/ui`.
