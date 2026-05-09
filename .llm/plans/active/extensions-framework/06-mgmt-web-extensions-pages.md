# Phase 06 — management-web extensions pages

Build the admin UI that an operator uses to enable, disable, and configure
extensions. Lists every registered extension; clicking through opens an edit form
generated from the manifest's `configSchema` (or a custom `SettingsForm` if the
extension provides one).

## Pages and components

```
apps/management-web/src/app/(management)/extensions/
  page.tsx                              # server component: fetches list, renders client
  ExtensionsListPageClient.tsx
  ExtensionsListPageClient.module.scss
  [id]/
    page.tsx                            # server component: fetches detail
    ExtensionDetailPageClient.tsx
    ExtensionDetailPageClient.module.scss
```

### List page

`ExtensionsListPageClient.tsx`:

- Uses `@podverse/ui` `ResourceTableWithFilter` per
  [`crud-tables-resources`](../../../../.cursor/skills/crud-tables-resources/SKILL.md).
- Columns: name, kind, enabled (badge), last updated.
- Row click navigates to `/extensions/[id]`.
- Empty state per
  [`tableEmptyState`](../../../../apps/management-web/src/lib/tableEmptyState.ts)
  pattern: "No extensions are registered. Register one in the registry to enable it
  here."
- Search/filter handled by the shared resource-table primitives if applicable.

### Detail page

`ExtensionDetailPageClient.tsx`:

- Renders breadcrumbs (Extensions > {extension name}) per
  [`management-edit-breadcrumbs`](../../../../.cursor/skills/web/SKILL.md) (Podverse
  equivalent skill if any; otherwise mirror the
  `apps/management-web/src/app/(management)/admins/[id]/edit` layout).
- Top section: read-only manifest metadata (`id`, `kind`, `description`).
- Form section: enabled toggle + auto-generated config fields.
- Action row uses
  [`form-primary-actions-row`](../../../../.cursor/skills/form-primary-actions-row/SKILL.md):
  Cancel before Save, right-aligned, wraps on narrow widths.
- On submit, calls `reqExtensionsUpdate(id, body)` (added below) and on success
  navigates back to the list with a toast.

## Auto-form generator

`apps/management-web/src/lib/extensions/AutoConfigForm.tsx` takes a manifest's
`configSchema` and renders form controls:

- For each field in `configSchema.fields`:
  - Resolve **labels** with `useTranslations()` using **`fields[name].labelKey`** (required
    on every field per phase `01`).
  - Resolve optional **help** tooltips with **`fields[name].helpKey`** when present.
  - Read the Joi schema's `describe()` result for that field (type, required,
    constraints).
  - Render the appropriate `@podverse/ui` form primitive: text input, number input,
    boolean toggle, single-select.
  - If `secret: true`, mask the value and show "leave blank to keep current."
  - If `userEditable: false`, render the field as read-only with a tooltip pointing
    operators at the corresponding env var.
- Validates client-side via the same Joi schema (`joi.validate(value)`).
- Emits `onChange(config)` with the typed object.

Omitting `labelKey` on a field is a **TypeScript error** at manifest authoring time
(`ExtensionConfigFieldMeta`), not a runtime English fallback.

If an extension provides a custom `SettingsForm` in its manifest, the detail page
renders that instead. Phase `07`'s Cloudflare extension uses the auto-form.

## Request module

`apps/management-web/src/lib/requests/extensions.ts` exports:

- `reqExtensionsList(): Promise<ExtensionListItem[]>`
- `reqExtensionsGet(id: string): Promise<ExtensionDetail>`
- `reqExtensionsUpdate(id: string, body: { enabled: boolean; config: object }): Promise<ExtensionDetail>`

Follow the existing request-module pattern in
`apps/management-web/src/lib/requests/`.

## Nav route

Edit `apps/management-web/src/lib/managementNavRoutes.ts`:

```ts
export type ManagementNavSection =
  | 'feedFlagStatus'
  | 'stats'
  | 'database'
  | 'products'
  | 'admins'
  | 'users'
  | 'workers'
  | 'storage'
  | 'extensions';
```

Add a route with `visible: (user, ctx) => ctx.extensionsEnabled && canManageExtensions(user)`.
`extensionsEnabled` reads the runtime-config `EXTENSIONS_ENABLED` value; the helper
`canManageExtensions` is added to
`apps/management-web/src/lib/managementPermissions.ts` and gates on the new
`extensions_crud` permission introduced in phase `05`.

`ManagementAppNavContext` gains an `extensionsEnabled: boolean` field; consumers of
`managementNavRoutes` are updated in the same commit.

## Permission helpers

`apps/management-web/src/lib/managementPermissions.ts`:

```ts
export function canManageExtensions(user: CurrentUser): boolean {
  return (
    user.role === 'superuser' ||
    Boolean(user.permissions && user.permissions.extensions_crud >= 2)
  );
}
```

The threshold (`>= 2`) follows the existing read/edit convention used by
`canReadFeeds`, `canReadStats`, etc.

## i18n

Per [`shared-ui-i18n`](../../../../.cursor/rules/shared-ui-i18n.mdc) and the
[`i18n`](../../../../.cursor/skills/i18n/SKILL.md) skill, add new keys to
`apps/management-web/i18n/originals/en-US.json` and keep other locales in sync:

- **Shell:** `nav.extensions`, page titles, breadcrumb labels, form labels for
  "Enabled", "Configuration", "Save changes", empty state, success toast, error toast.
- **Per-extension fields:** each manifest `labelKey` / `helpKey` must exist under a
  stable namespace (e.g. `extensions.cloudflare.token.label`,
  `extensions.cloudflare.token.help`). Phase `07` lists the Cloudflare keys explicitly.
- All copy lives in the app, not the auto-form generator (which is framework-agnostic but
  reads keys from the manifest).

## URL and tab state

Per [`tab-active-state-url-match`](../../../../.cursor/rules/) and existing list-page
patterns, the list page treats `/extensions` as canonical and does not insert query
params on first render; user interactions add params if they apply (search, filter).

## Verification

```bash
./scripts/nix/with-env npm run lint -w apps/management-web
./scripts/nix/with-env npm run build -w apps/management-web
./scripts/nix/with-env make e2e_test_management_web_report_spec SPEC=e2e/extensions-list-edit.spec.ts
```

The E2E spec file is created in phase `09`; running it now will fail until phase `09`
lands. The lint and build commands are the gating signal for this phase.
