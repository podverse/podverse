# Phase 03 — apps/web migration

## Goal

Replace
[apps/web/src/components/NavBar/NavBar.tsx](../../../../apps/web/src/components/NavBar/NavBar.tsx)
with a thin client wrapper that builds composite `NavBar` props from app-only concerns:
`next-intl`, `next/navigation`, `next/link`, Account, Modals, Config, LocalSettings, ROUTES,
and API logout.

## Controlled mobile sidebar

- Remove imperative DOM toggling in
  [apps/web/src/utils/mobileNavMenu.ts](../../../../apps/web/src/utils/mobileNavMenu.ts)
  **or** narrow it to a thin helper that only flips React state — the sidebar open state
  must live in React (e.g. `LocalSettings` or a small dedicated context decided during
  implementation).
- [apps/web/src/components/SideBar/SideBar.tsx](../../../../apps/web/src/components/SideBar/SideBar.tsx)
  should derive open/closed from the same state source (replace classList toggling on the
  sidebar if needed).
- Pass `mobileToggle.isOpen` / `onToggle` into the composite NavBar.

## Delete app-local NavBar pieces

After migration, remove obsolete components and SCSS:

- `NavBarBrand.tsx`, `NavBarLeftButtons.tsx`, `NavBarRightButtons.tsx`,
  `NavBarSearchButton.tsx`, `NavBarDropdownButton.tsx`, `NavBarMoreButton.tsx`
- `apps/web/src/styles/components/NavBar/*.module.scss`

Update imports (e.g.
[apps/web/src/app/layout.tsx](../../../../apps/web/src/app/layout.tsx)) if paths change.

## i18n

Add or reuse keys for: back, forward, search aria-label, account dropdown aria-label,
mobile open/close labels, and any menu item labels currently using `useTranslations` in the
old dropdown — wire through composite props.

## Rules

- [.cursor/rules/shared-ui-i18n.mdc](../../../../.cursor/rules/shared-ui-i18n.mdc)
- [.cursor/rules/avoid-type-assertions.mdc](../../../../.cursor/rules/avoid-type-assertions.mdc)

## Verification (after phases 04–05 for full E2E)

```bash
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run build -w apps/web
```
