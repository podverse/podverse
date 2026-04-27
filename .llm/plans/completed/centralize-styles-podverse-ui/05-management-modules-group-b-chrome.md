# Phase 3b — Group B: management admin sub-pages + app chrome

## Scope

Migrate 6 SCSS module files covering the admins sub-section, the root `app/page` splash, and the global app chrome (`ManagementAppLayout`, `ManagementUserMenu`).

Runs in parallel with Group A (`04-`) and Group C (`06-`). Each group touches disjoint files.

## Files

1. `apps/management-web/src/app/(management)/admins/page.module.scss`
2. `apps/management-web/src/app/(management)/admins/new/page.module.scss`
3. `apps/management-web/src/app/(management)/admins/[id]/edit/page.module.scss`
4. `apps/management-web/src/app/page.module.scss`
5. `apps/management-web/src/components/ManagementAppLayout/managementAppLayout.module.scss`
6. `apps/management-web/src/components/ManagementUserMenu/managementUserMenu.module.scss`

## Procedure

Apply the procedure documented in `04-management-modules-group-a-pages.md` (steps 1–4) to each file in this group. The canonical token map is identical.

In short:

1. Replace `@use '../../../styles/theme/variables' as theme;` (or deeper relative form) with `@use '@podverse/ui/styles/variables' as *;`.
2. Replace every `theme.$…` reference per the canonical map in `04-management-modules-group-a-pages.md`.
3. Replace `theme.$border-width` with the literal `1px`.
4. Do not introduce Sass color functions on CSS custom properties.

## Notes specific to this group

- `managementAppLayout.module.scss` and `managementUserMenu.module.scss` shape the chrome that hosts the new `ManagementThemeSwitcher` (added in Phase 3a). Keep the visual hierarchy unchanged — only swap tokens.
- `app/page.module.scss` is the splash/landing page. After migration it should pick up `var(--background-color-secondary)` from the body background; ensure no module-scoped rule fights with the global background.

## Verification

```bash
npm run -w @podverse/management-web type-check
npm run -w @podverse/management-web build

rg "theme\.\$" \
  apps/management-web/src/app/\(management\)/admins \
  apps/management-web/src/app/page.module.scss \
  apps/management-web/src/components/ManagementAppLayout \
  apps/management-web/src/components/ManagementUserMenu
```

Expected: zero matches.

Visual smoke (after all three groups complete):

```bash
make app_management_web_e2e_run_basic_smoke
```

## Definition of done

- All 6 files import `@podverse/ui/styles/variables` (no `theme/variables`).
- All `theme.$…` references replaced.
- Chrome (top nav, user menu, layout) renders cleanly in all three themes.
- `npm run -w @podverse/management-web build` passes.
