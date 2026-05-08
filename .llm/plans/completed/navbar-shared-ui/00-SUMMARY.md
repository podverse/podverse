# NavBar shared UI composite

## Outcome

Promote the apps/web NavBar behavior into `@podverse/ui` as a **single composite**
`NavBar` component with typed optional sections. Apps pass only the sections they need;
unpassed sections do not render. Both `apps/web` and `apps/management-web` migrate off the
current slot-based shell (`brand` / `left` / `right` ReactNodes).

## Scope

- **`packages/ui`** — Replace the minimal shell with a structured composite; absorb SCSS
  from `apps/web/src/styles/components/NavBar/` into
  `packages/ui/src/components/navigation/NavBar/NavBar.module.scss`; expand Vitest for each
  optional section.
- **`apps/web`** — Single adapter builds composite props from contexts (Account, Modals,
  Config, LocalSettings, next-intl, next/navigation, ROUTES). Controlled mobile toggle
  replaces DOM-query toggling in `apps/web/src/utils/mobileNavMenu.ts`; remove obsolete
  `NavBar*` children and their SCSS.
- **`apps/management-web`** — Consume composite with `brand` + `accountMenu` only (no
  backForward, search, mobileToggle); retire or shrink `ManagementUserMenu` /
  `DashboardNavRight` into item builders as needed.

## Non-goals

- Visual redesign of the web navbar baseline (match existing web chrome).
- Embedding user-visible copy inside `@podverse/ui` (apps pass localized strings per
  [shared-ui-i18n](../../../../.cursor/rules/shared-ui-i18n.mdc)).

## References

- Prefer shared UI:
  [.cursor/rules/prefer-shared-ui-web-management.mdc](../../../../.cursor/rules/prefer-shared-ui-web-management.mdc).
- Shared UI i18n:
  [.cursor/rules/shared-ui-i18n.mdc](../../../../.cursor/rules/shared-ui-i18n.mdc).
- Plan completion:
  [.cursor/skills/plan-completion/SKILL.md](../../../../.cursor/skills/plan-completion/SKILL.md).
