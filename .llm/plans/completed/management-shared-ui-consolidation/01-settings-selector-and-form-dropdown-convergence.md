# 01 - Settings Selector And Form Dropdown Convergence

## Assessment

Management-web and web both render locale/theme settings selectors, but the UI and option-building live in separate app-local components:

- Management locale: `apps/management-web/src/components/ManagementLocaleSelector/ManagementLocaleSelector.tsx`
- Management theme: `apps/management-web/src/components/ManagementThemeSwitcher/ManagementThemeSwitcher.tsx`
- Web locale: `apps/web/src/components/Settings/Panels/SettingsGeneral/SettingsLocaleSelector.tsx`
- Web theme: `apps/web/src/components/Settings/Panels/SettingsGeneral/SettingsThemeSelector.tsx`
- Web labeled dropdown primitive: `apps/web/src/components/Form/FormDropdown.tsx`
- Existing shared primitives: `packages/ui/src/components/form/fieldPrimitives/Select.tsx`, `Label`, `FormGroup`, `FormStack`

This is the highest-value additional consolidation: the UI control shape and option rendering are generic, while app-specific persistence can remain in callbacks.

## Prompt

Create a shared settings selector/form dropdown primitive and migrate both apps.

1. Inventory current selector behavior:
   - Locale option source and labels in web and management-web.
   - Theme option source and labels in web and management-web.
   - Cookie writes, API updates, and refresh/reload behavior.
2. Add shared UI in `packages/ui`:
   - Prefer a generic `FormDropdown` or `FormSelect` component under `packages/ui/src/components/form/`.
   - Support `id`, `label`, `eyebrow`, `info`, `value`, `options`, `onChange`, disabled state, and full-width/dropdown behavior.
   - Use shared dropdown/menu primitives if that path is stable; otherwise use the existing `Select` primitive first and leave a follow-up to switch to menu-style dropdown.
   - Export the component and types from `packages/ui/src/index.ts`.
3. Migrate management-web:
   - Replace raw `<select>` in `ManagementLocaleSelector` and `ManagementThemeSwitcher` with the shared component.
   - Keep management-specific cookie and `router.refresh()` logic in management-web.
   - Preserve `SettingsPageClient` layout and labels.
4. Migrate web:
   - Replace app-local `FormDropdown` usage in `SettingsLocaleSelector` and `SettingsThemeSelector` with the shared component.
   - Preserve logged-in account update behavior in web locale changes.
   - Assess whether other web `FormDropdown` call sites can migrate safely in this pass; if broad, document remaining call sites.
5. Tests:
   - Add focused `@podverse/ui` tests for rendering options, selected value, `onChange`, labels, and info text.
   - Add or update app-level tests only if behavior changes.

## Acceptance Criteria

- Locale/theme selector control chrome is shared through `@podverse/ui`.
- App-specific side effects remain app-local.
- No raw `<select>` remains in `ManagementLocaleSelector` or `ManagementThemeSwitcher`.
- Existing web locale/theme behavior remains intact.

## Verification

```bash
./scripts/nix/with-env npm run lint -w @podverse/ui -w @podverse/web -w @podverse/management-web
./scripts/nix/with-env npm run type-check -w @podverse/ui -w @podverse/web -w @podverse/management-web
./scripts/nix/with-env npm run test -w @podverse/ui
```
