# 02 - Account Menu Convergence

## Assessment

Management-web has a bespoke account menu with duplicated open state, outside-click handling, Escape handling, and menu styling:

- `apps/management-web/src/components/ManagementUserMenu/ManagementUserMenu.tsx`
- `apps/management-web/src/components/ManagementUserMenu/managementUserMenu.module.scss`

Web has a similar account dropdown:

- `apps/web/src/components/NavBar/NavBarDropdownButton.tsx`
- `apps/web/src/components/Dropdown/DropdownMenu.tsx`

The previous plan moved the keyboard hook into `@podverse/ui`, but it did not create a shared account-menu composition with trigger content, menu links, meta rows, and action items.

## Prompt

Consolidate account/user menu composition on top of `@podverse/ui`.

1. Inventory required behavior:
   - Management: display email/id, role meta row, settings link, logout action, post-logout redirect.
   - Web: logged-in display name/email, profile/membership/settings actions, login/logout behavior.
2. Extend shared menu primitives:
   - Prefer enhancing `packages/ui/src/components/navigation/DropdownMenu/` rather than adding a one-off account menu if the behavior is generic.
   - Support custom trigger content, menu meta/header rows, action items, and link items.
   - Support `LinkComponent` for Next links without importing Next into `@podverse/ui`.
   - Preserve keyboard behavior: Enter/Space opens, Escape closes and returns focus, ArrowUp/ArrowDown navigates, click outside closes.
3. Migrate management-web:
   - Replace bespoke `ManagementUserMenu` state/effects/menu panel with shared menu primitives.
   - Keep logout request and routing in management-web.
   - Remove `managementUserMenu.module.scss` if fully superseded.
4. Migrate web:
   - Migrate `NavBarDropdownButton` to the same shared menu composition if parity is straightforward.
   - If web requires a larger visual migration, keep a thin wrapper and document remaining app-local style reasons.
5. Tests:
   - Add `@podverse/ui` menu tests for meta rows, link items, action items, keyboard close, and click handling.
   - Add/update E2E only if nav behavior changes visibly.

## Acceptance Criteria

- Management account menu no longer owns duplicate outside-click/Escape/menu item styling.
- Shared menu supports both button actions and link menu items.
- Web and management-web account menus use the same shared primitive or thin wrappers around it.

## Verification

```bash
./scripts/nix/with-env npm run lint -w @podverse/ui -w @podverse/web -w @podverse/management-web
./scripts/nix/with-env npm run type-check -w @podverse/ui -w @podverse/web -w @podverse/management-web
./scripts/nix/with-env npm run test -w @podverse/ui
make e2e_test_management_web_report_spec SPEC=e2e/smoke.spec.ts,e2e/settings-page.spec.ts
```
