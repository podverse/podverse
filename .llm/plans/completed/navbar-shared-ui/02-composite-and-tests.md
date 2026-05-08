# Phase 02 — Composite implementation and tests

## Goal

Implement the composite `NavBar` in `@podverse/ui`, replacing the slot-only API (`brand` /
`left` / `right` ReactNodes) with the structured props from phase 01. Absorb layout and
responsive SCSS from web into the package.

## Files

- Primary:
  [packages/ui/src/components/navigation/NavBar/NavBar.tsx](../../../../packages/ui/src/components/navigation/NavBar/NavBar.tsx)
- Styles:
  [packages/ui/src/components/navigation/NavBar/NavBar.module.scss](../../../../packages/ui/src/components/navigation/NavBar/NavBar.module.scss)
- Tests:
  [packages/ui/src/components/navigation/NavBar/NavBar.test.tsx](../../../../packages/ui/src/components/navigation/NavBar/NavBar.test.tsx)
- Barrel:
  [packages/ui/src/index.ts](../../../../packages/ui/src/index.ts) — export types +
  component.

## Implementation notes

1. **Layout**: Mirror current web structure — brand region; left cluster for back/forward
   (desktop-only visibility via SCSS, matching
   `apps/web/src/styles/components/NavBar/NavBarLeftButtons.module.scss`); right cluster
   with flex-end alignment (`NavBarRightButtons` behavior).

2. **Primitives**: Use existing `@podverse/ui` pieces — `NavArrowButton`, `DropdownMenu`,
   `DropdownMenu.LinkItem`, `DropdownMenu.Meta`, `DropdownMenu.Item` — wiring account menu
   from `accountMenu.items`.

3. **Search**: Render as link-styled control with optional `LinkComponent`; match
   `NavBarSearchButton` responsive visibility (mobile-only display rules from web SCSS).

4. **Mobile toggle**: Controlled `mobileToggle` — show hamburger vs close icon based on
   `isOpen`; use `openLabel` / `closeLabel` for `aria-label`. Match
   `NavBarMoreButton.module.scss` breakpoints.

5. **Brand visibility**: Honor `brand.visibility === 'mobileOnly'` using absorbed rules
   from `NavBarBrand.module.scss`.

6. **Appearance**: Keep `data-appearance` and both `.navBar` / `.navBarWeb` classes as today.

7. **Tests**: Extend Vitest to assert — default appearance; web appearance; rendering of
   each optional section when provided; account menu meta/link/action rows; mobile toggle
   aria-label switches with `isOpen`; sections omitted when undefined.

## Verification

```bash
./scripts/nix/with-env npm run test:unit -w @podverse/ui
```

(or project-equivalent test command for `packages/ui` from repo root)

## Out of scope

- Migrating `apps/web` or `apps/management-web` (phases 03–04).
