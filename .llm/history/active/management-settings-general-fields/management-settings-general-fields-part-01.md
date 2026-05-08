# management-settings-general-fields

**Started:** 2026-05-07
**Author:** Agent
**Context:** Align management Settings dropdown content with web Settings General.

---

### Session 1 - 2026-05-07

#### Prompt (Developer)

i need you to improve the dropdown select that appear on this page dramatically. the contents with selectors on the mgmt web settings page should match the style and layout of the web settings page. you should be using reusable components for those sections. don't change the headers, we are just focusing on the dropdown select in the content of the page in mgmt web

#### Key Decisions

- **`FormDropdown` `label` prop** (same as web `SettingsLocaleSelector` / `SettingsThemeSelector`) on **`ManagementLocaleSelector`** and **`ManagementThemeSwitcher`**; removed duplicate **`Label` + `FormGroup` + `Card`** chrome from [`SettingsPageClient`](<apps/management-web/src/app/(management)/settings/SettingsPageClient.tsx>).
- Reusable **[`ManagementSettingsGeneralFields`](apps/management-web/src/components/ManagementSettingsGeneralFields/ManagementSettingsGeneralFields.tsx)**: order **Language → `Divider` withSpacing → Theme** (matches [`SettingsGeneral`](apps/web/src/components/Settings/Panels/SettingsGeneral/SettingsGeneral.tsx)); wrapper **`max-width: var(--form-max-width)`** so controls are not full-bleed like web form column.
- **Headers unchanged:** [`ManagementPageShell`](packages/ui) `title` / `subtitle` only.

#### Files Created/Modified

- `apps/management-web/src/components/ManagementSettingsGeneralFields/ManagementSettingsGeneralFields.tsx`
- `apps/management-web/src/components/ManagementSettingsGeneralFields/ManagementSettingsGeneralFields.module.scss`
- `apps/management-web/src/components/ManagementSettingsGeneralFields/index.ts`
- `apps/management-web/src/components/ManagementLocaleSelector/ManagementLocaleSelector.tsx`
- `apps/management-web/src/components/ManagementThemeSwitcher/ManagementThemeSwitcher.tsx`
- `apps/management-web/src/app/(management)/settings/SettingsPageClient.tsx`
