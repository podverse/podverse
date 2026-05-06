# Phase 0 inventory — Shared UI consolidation (Podverse)

Generated from `01-phase0-inventory-sweep.md`. No extraction work — pattern map only.

## 1. Management-web `*.module.scss` (under `apps/management-web/src/app/`)

**Count:** 16 files.

| Pattern cluster                         | Example class names                         | Files (count) | Occurrence notes |
| ------------------------------------- | ------------------------------------------- | ------------- | ---------------- |
| Breadcrumb row (full)                 | `.breadcrumbs`, `.breadcrumbLink`, `.breadcrumbSep` | 6             | `database/page`, `stats/page`, `products/page`, `users/new/page`, `admins/new/page`, `admins/[id]/edit/page` |
| Breadcrumb link only                | `.breadcrumbLink`                           | 1             | `admins/page` (with `.headerActions`, no `.breadcrumbs` wrapper) |
| Breadcrumb variant (compact)         | `.bread`, `.breadLink`                      | 1             | `feed-operations/flag-status/page` |
| Key-value / DL grid                 | `.valueList`, `.valueRow`, `.valueTerm`, `.valueDesc` | 1             | `products/page` |
| Definition list (`<dl>`)            | `.dl`, `.dl dt`, `.dl dd`                   | 1             | `feed-operations/flag-status/page` |
| Lookup grid                         | `.lookupGrid`, `.lookupActionLabel`         | 1             | `feed-operations/flag-status/page` |
| Section / heading stack             | `.header`, `.section`, `.h2`, `.h3`         | 1             | `feed-operations/flag-status/page` |
| Page subtitle                       | `.pageSubtitle`                             | 1             | `products/page` |
| List header actions                 | `.headerActions`                            | 2             | `admins/page`, `users/page` |
| Muted text / inline link / confirm   | `.muted`, `.inlinelink`, `.confirm`, `.confirmRow` | 1      | `feed-operations/flag-status/page` |
| Raw control styling                 | `.select`, `.textarea`, `.inlineControl`, `.inlineControlButton` | 1 | `feed-operations/flag-status/page` |
| Form + submit/cancel/delete        | `.form`, `.formGroup`, `.input`, `.submitButton`, `.cancelLink`, `.deleteButton` | 1 | `database/page` (also row/create flows) |
| Workers filter input                | `.filterInput` (bordered input)             | 1             | `workers/page` (overlaps token-wise with `.searchInput` on `stats/page`) |
| Stats toolbar / tabs                | `.toolbar`, `.tabs`, `.tab`, `.rangeToggle`, `.searchInput` | 1 | `stats/page` |
| Login shell                         | `.loginCard`, `.loginHeader`                | 1             | `page.module.scss` (app root) |
| Settings stack                      | `.stack`                                    | 1             | `settings/page` |
| Dashboard brand                     | `.brandLink`                                | 1             | `dashboard/dashboard.module.scss` |

**Cross-file repeats (informal):** `.loadingText` / `.errorText` appear in multiple SCSS modules with
similar rules; `.pagination` / `.paginationButton` appear in both `database/page.module.scss` and
`stats/page.module.scss`.

## 2. Management-web route clients — imports and raw HTML

**Convention:** `*PageClient.tsx` under `apps/management-web/src/app/` plus root `page.tsx` (login).

### `@podverse/ui`

| Symbol imports | Files |
| -------------- | ----- |
| `NavCardGrid`, `NavCard` (type) | `(management)/dashboard/DashboardPageClient.tsx`, `dashboard/DashboardPageClient.tsx`, `(management)/products/ProductsPageClient.tsx` |
| `StatsBarChart`, `StatsBarChartDatum` | `(management)/stats/StatsPageClient.tsx` |
| `Disclosure` | `(management)/workers/WorkersPageClient.tsx` |
| `CheckboxField`, `FormPrimaryActions` | `(management)/users/new/NewUserPageClient.tsx` |
| `Pagination`, `Table` | `(management)/users/UsersListPageClient.tsx` |

### `apps/management-web/src/components/ui/*`

| Imports | Files |
| ------- | ----- |
| `Button`, `Alert`, `Card`, `CenterContainer`, `LoadingText`, … (`@podverse/ui`) | `page.tsx` (login), `(management)/feed-operations/flag-status/FlagStatusPageClient.tsx`, `(management)/workers/WorkersPageClient.tsx`, `(management)/settings/SettingsPageClient.tsx` |
| `FormGroup`, `FormInput`, `FormLabel` (`components/ui/Form`) | login, flag-status, settings |

### Raw `<button>`, `<input>`, `<select>`, `<textarea>` (grep-assisted)

| File | Approx. raw control hits |
| ---- | ------------------------ |
| `FlagStatusPageClient.tsx` | 6 |
| `NewUserPageClient.tsx` | 14 |
| `EditUserPageClient.tsx` | 15 |
| `StatsPageClient.tsx` | 8 |
| `RowDetailPageClient.tsx` | 5 |
| `NewAdminPageClient.tsx`, `EditAdminPageClient.tsx` | 4 each |
| `WorkersPageClient.tsx` | 2 |
| `UsersListPageClient.tsx` | 2 |
| `TableBrowserPageClient.tsx` (×2 paths) | 2 each |
| `CreateRowPageClient.tsx` | 2 |
| `UserDetailPageClient.tsx` | 4 |

**No raw controls** in: `DatabaseIndexPageClient.tsx`, `AdminsListPageClient.tsx`,
`ProductMembershipsPageClient.tsx`, `SettingsPageClient.tsx`, both `DashboardPageClient.tsx`,
`ProductsPageClient.tsx` (products hub uses links/cards only).

## 3. Web app cross-reference (`apps/web/src/components/`)

| Area | Primary primitives | Notes |
| ---- | ------------------ | ----- |
| `Form/` | `Form`, `TextInput`, `TextArea`, `Checkbox`, `RadioButton`, `SwitchButton`, `SearchInput`, `FormDropdown`, `FormStack`, `InlineForm`, `TextInputNumber`, `TextInputHHMMSS`, `TextCheckboxes`, `FormErrorMessageText`, `FormInfoMessageText`, `TextInputNumberIncrements` | Web `TextInput` is **controlled** and feature-rich (eyebrow, info, prefix/suffix, optional buttons). |
| `Button/` | `Button.tsx` | Single canonical web button module. |
| Other | Large domain-specific trees (`MediaPlayer`, `Boost`, `List`, etc.) | Out of scope for generic extraction per plan non-goals. |

**vs management `src/components/ui/Form/FormInput.tsx`:** Thin wrapper: spreads `InputHTMLAttributes`,
applies `FormInput.module.scss` only — **much smaller API** than web `TextInput`.

## 4. `packages/ui` baseline (`packages/ui/src/index.ts`)

Authoritative export list: **`packages/ui/src/index.ts`** (includes Phases 1–4 lift-outs). Examples:
`Breadcrumbs`, `DescriptionList`, `Button`, form primitives (`Input`, `Select`, `TextArea`, `Label`,
`FieldError`, `fieldPrimitiveClasses`, `CheckboxField`, `FormPrimaryActions`), shells (`Card`, `Alert`,
`CenterContainer`, `LoadingText`), `NavBar`, `NavCardGrid`, `Pagination`, `Table`, `StatsBarChart`,
`Disclosure`.

**Still web-local:** composed **`TextInput`** and other domain-heavy controls under `apps/web/src/components/`.

## 5. Consolidation matrix (minimum rows)

| Pattern               | Example files                                                | Proposed `@podverse/ui` name                   | Risk | Notes                                                                             |
| --------------------- | ------------------------------------------------------------ | ---------------------------------------------- | ---- | --------------------------------------------------------------------------------- |
| Breadcrumbs           | 6–8 SCSS modules (see §1)                                    | `ManagementBreadcrumbs` or `PageBreadcrumbs`   | L    | Mostly presentation + `Link`; normalize `.bread` vs `.breadcrumbs`.               |
| Key-value / DL        | `products/page`, `flag-status/page`                        | `DescriptionList` / `KeyValueList`             | L    | Grid rules differ slightly — one flexible API or two variants.                   |
| Button                | `management-web/.../ui/Button`, web `Button.tsx`             | `Button` (single export)                       | M    | Phase 2; visual parity with web + loading states.                                |
| Text field primitives | `FormInput`, web `TextInput`, raw `<input>` in clients      | `Input` / strategy from Phase 3                | H    | Large API gap; plan asks for explicit strategy.                                   |
| Card / Alert / Loading | _(was)_ management `components/ui` shells | `Card`, `Alert`, `LoadingText`, `CenterContainer` in `@podverse/ui` | M | **Phase 4 done.**                                                                    |
| Confirm panel         | `flag-status/page.module.scss` `.confirm`                    | `ConfirmPanel` or `Callout`                    | L    | Single heavy user today.                                                          |
| Select / textarea styling | `flag-status` SCSS + raw elements                        | Shared field chrome or extend form strategy    | M    | Overlaps Phase 3.                                                                 |

## Phase 3 — Form strategy (chosen)

**Strategy A — Thin primitives in `packages/ui`.** Export composable **`Input`**, **`Select`**,
**`TextArea`**, **`Label`**, **`FieldError`**, and **`fieldPrimitiveClasses`** (stable class-name
strings from shared SCSS for non-React children such as theme/locale `<select>`). **`apps/web`** keeps
**`TextInput`** and other composed controls until a later migration. **`management-web`** adopts
primitives on login, settings, and feed flag-status flows; **`FormInput`** / **`FormLabel`** remain
thin re-exports (`Input` / `Label`) for existing `components/ui/Form` barrel imports.
