# Centralize Podverse styles in @podverse/ui — summary

## Goal

Adopt Metaboost's pattern in Podverse: move the canonical design tokens (CSS custom properties + SCSS variables), themes (`dark`/`light`/`dracula`), shared SCSS mixins, and Roboto font-faces into `@podverse/ui`, then have both `apps/web` and `apps/management-web` consume them.

`apps/web` is the source of truth for values. **The migration must be visually byte-equivalent for `apps/web`.** `apps/management-web` adopts the same tokens and the same `[data-ui-theme='dark'|'light'|'dracula']` switcher; its appearance will change.

## Plan files

- `00-EXECUTION-ORDER.md`
- `00-SUMMARY.md` (this file)
- `01-package-tokens-and-exports.md` — Phase 1: build the canonical layer in `@podverse/ui`
- `02-web-migrate-to-package.md` — Phase 2: switch `apps/web` to the package (byte-equivalent)
- `03-management-globals-and-themes.md` — Phase 3a: management globals + `[data-ui-theme]` + theme switcher
- `04-management-modules-group-a-pages.md` — Phase 3b parallel
- `05-management-modules-group-b-chrome.md` — Phase 3b parallel
- `06-management-modules-group-c-ui.md` — Phase 3b parallel
- `07-cleanup-and-skill.md` — Phase 4: delete legacy files, add skill, update docs
- `COPY-PASTA.md`

## Inventory

### Source-of-truth files in `apps/web`

- SCSS variables (compile-time only): `apps/web/src/styles/variables/breakpoints.scss`
- CSS custom property tokens (`:root`):
  - `apps/web/src/styles/variables/border-radius.scss`
  - `apps/web/src/styles/variables/element-sizes.scss`
  - `apps/web/src/styles/variables/font-size.scss`
  - `apps/web/src/styles/variables/font-weight.scss`
  - `apps/web/src/styles/variables/image-sizes.scss`
  - `apps/web/src/styles/variables/list-item-sizes.scss`
  - `apps/web/src/styles/variables/spacing.scss`
- Themes (set CSS custom props per UI theme): `apps/web/src/styles/ui-themes/{dark,light,dracula}.scss` (default theme is `dark`, declared on `:root`)
- Mixins: `apps/web/src/styles/mixins/{buttons,ellipsis,flexbox,form,headers,layout,lineClamp,listRow,media-queries,timeText}.scss`
- Font-faces: `apps/web/src/styles/font-faces.scss` (Roboto, served from `apps/web/public/fonts/Roboto/*.ttf`)
- Aggregator: `apps/web/src/styles/index.scss` (`font-faces` → `variables` → `ui-themes` → `mixins` → `keyframes` → `globals`)

### Files in `@podverse/ui` (today)

- `packages/ui/package.json` — has only the `.` export entry; no SCSS exports.
- `packages/ui/src/styles/_variables.scss` — small, divergent SCSS-only token set (replace).
- Component SCSS modules that consume that file:
  - `packages/ui/src/components/navigation/NavBar/NavBar.module.scss`
  - `packages/ui/src/components/navigation/NavCardGrid/NavCardGrid.module.scss`
  - `packages/ui/src/components/navigation/Pagination/Pagination.module.scss`
  - `packages/ui/src/components/table/Table/Table.module.scss`

### Files in `apps/management-web` (today)

- Aggregator: `apps/management-web/src/styles/index.scss` (one file with body styles + utility classes)
- Token source: `apps/management-web/src/styles/theme/_variables.scss` (replace + delete)
- 24 `*.module.scss` consumers under `apps/management-web/src` (full list below).
- Layout: `apps/management-web/src/app/layout.tsx` — does not set `data-ui-theme`.
- No Roboto font assets in `apps/management-web/public/fonts/`.

### 24 management-web SCSS modules to migrate

Group A — admin/data pages (10):

- `apps/management-web/src/app/(management)/dashboard/dashboard.module.scss`
- `apps/management-web/src/app/(management)/dashboard/page.module.scss`
- `apps/management-web/src/app/(management)/stats/page.module.scss`
- `apps/management-web/src/app/(management)/workers/page.module.scss`
- `apps/management-web/src/app/(management)/database/page.module.scss`
- `apps/management-web/src/app/(management)/feed-operations/flag-status/page.module.scss`
- `apps/management-web/src/app/(management)/users/page.module.scss`
- `apps/management-web/src/app/(management)/users/[id]/page.module.scss`
- `apps/management-web/src/app/(management)/users/[id]/edit/page.module.scss`
- `apps/management-web/src/app/(management)/users/new/page.module.scss`

Group B — admin sub-pages + chrome (6):

- `apps/management-web/src/app/(management)/admins/page.module.scss`
- `apps/management-web/src/app/(management)/admins/new/page.module.scss`
- `apps/management-web/src/app/(management)/admins/[id]/edit/page.module.scss`
- `apps/management-web/src/app/page.module.scss`
- `apps/management-web/src/components/ManagementAppLayout/managementAppLayout.module.scss`
- `apps/management-web/src/components/ManagementUserMenu/managementUserMenu.module.scss`

Group C — UI components (8):

- `apps/management-web/src/components/ui/Alert/Alert.module.scss`
- `apps/management-web/src/components/ui/Button/Button.module.scss`
- `apps/management-web/src/components/ui/Card/Card.module.scss`
- `apps/management-web/src/components/ui/CenterContainer/CenterContainer.module.scss`
- `apps/management-web/src/components/ui/Form/FormGroup.module.scss`
- `apps/management-web/src/components/ui/Form/FormInput.module.scss`
- `apps/management-web/src/components/ui/Form/FormLabel.module.scss`
- `apps/management-web/src/components/ui/LoadingText/LoadingText.module.scss`

## Canonical token map (management → web)

Used throughout Phase 3b. Every `theme.$x` in management-web maps to either an existing web token or a NEW token added to all three theme blocks in Phase 1.

| management token (`theme.$…`)                                          | web token (`var(--…)`) or replacement                        | Notes                                                                                       |
| ---------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `$color-text-primary`                                                  | `var(--text-color-primary)`                                  |                                                                                             |
| `$color-text-secondary`                                                | `var(--text-color-secondary)`                                |                                                                                             |
| `$color-background`                                                    | `var(--background-color-secondary)`                          | Web's "page" surface                                                                        |
| `$color-background-light`                                              | `var(--background-color-tertiary)`                           |                                                                                             |
| `$color-background-card`                                               | `var(--background-color-tertiary)`                           |                                                                                             |
| `$color-border`                                                        | `var(--border-color-tertiary)`                               |                                                                                             |
| `$color-border-light`                                                  | `var(--border-color-opaque)`                                 |                                                                                             |
| `$color-primary`                                                       | `var(--border-color-primary)`                                | Accent color in web                                                                         |
| `$color-on-primary`                                                    | `var(--text-color-tertiary)`                                 | Contrast-on-accent in web                                                                   |
| `$color-error`                                                         | `var(--text-color-danger)`                                   |                                                                                             |
| `$color-error-bg`                                                      | `var(--background-color-error)`                              | NEW — add to all themes in Phase 1                                                          |
| `$color-error-border`                                                  | `var(--border-color-error)`                                  | NEW — add to all themes in Phase 1                                                          |
| `$color-success`                                                       | `var(--text-color-success)`                                  | NEW — add to all themes in Phase 1                                                          |
| `$color-success-bg`                                                    | `var(--background-color-success)`                            | NEW — add to all themes in Phase 1                                                          |
| `$color-warning`                                                       | `var(--text-color-warning)`                                  | NEW — add to all themes in Phase 1                                                          |
| `$color-warning-bg`                                                    | `var(--background-color-warning)`                            | NEW — add to all themes in Phase 1                                                          |
| `$color-disabled`                                                      | `var(--text-color-secondary)`                                | Combine with `opacity: 0.6` where needed                                                    |
| `$spacing-xs` `$spacing-sm` `$spacing-md` `$spacing-lg` `$spacing-xl`  | `var(--spacing-md)` `--spacing-base` `--spacing-lg` `--spacing-2xl` `--spacing-4xl` | Pick the closest rung; see below |
| `$font-size-xs`                                                        | `var(--font-size-xs)`                                        |                                                                                             |
| `$font-size-base`                                                      | `var(--font-size-base)`                                      |                                                                                             |
| `$font-size-lg`                                                        | `var(--font-size-lg)`                                        |                                                                                             |
| `$font-size-xl`                                                        | `var(--font-size-xl)`                                        |                                                                                             |
| `$font-size-xxl`                                                       | `var(--font-size-2xl)`                                       |                                                                                             |
| `$font-weight-medium`                                                  | `var(--font-weight-medium)`                                  |                                                                                             |
| `$font-weight-semibold`                                                | `var(--font-weight-bold)`                                    | Web has only `light/normal/medium/bold` rungs; semibold maps to bold                        |
| `$border-radius-sm`                                                    | `var(--border-radius)`                                       | Web has one canonical radius                                                                |
| `$border-radius-md`                                                    | `var(--border-radius)`                                       |                                                                                             |
| `$border-width`                                                        | `1px` literal                                                | Not a token in web                                                                          |
| `$shadow-card`                                                         | `var(--shadow-card)`                                         | NEW — add to all themes in Phase 1                                                          |
| `$transition-default`                                                  | `var(--transition-default)`                                  | NEW — add to canonical tokens in Phase 1                                                    |

### Spacing mapping rationale

Management's spacing rungs (current values in `apps/management-web/src/styles/theme/_variables.scss`):

- `$spacing-xs: 0.5rem` → closest web `--spacing-md` (`0.5rem`)
- `$spacing-sm: 0.75rem` → web `--spacing-base` (`0.75rem`)
- `$spacing-md: 1rem` → web `--spacing-lg` (`1rem`)
- `$spacing-lg: 1.5rem` → web `--spacing-2xl` (`1.5rem`)
- `$spacing-xl: 2rem` → web `--spacing-4xl` (`2rem`)

## Verification gates

- After Phase 1: `npm run -w @podverse/ui type-check && npm run -w @podverse/ui lint`
- After Phase 2: `npm run -w @podverse/web build`; manual diff of compiled web CSS for `/`, `/podcasts`, `/playlist/...`; `make app_web_e2e_run_basic_smoke`.
- After Phase 3a: management-web boots and renders dark theme by default; theme switcher cycles dark/light/dracula and persists to cookie.
- After Phase 3b: `npm run -w @podverse/management-web build && npm run -w @podverse/management-web type-check`; `make app_management_web_e2e_run_basic_smoke`.
- After Phase 4: `rg "styles/theme/variables" apps/management-web` returns no matches; `rg "apps/web/src/styles/(variables|ui-themes|font-faces|mixins)" apps/web/src` returns only forwarder files (or nothing if forwarders were removed).

## Out of scope

- Renaming any web CSS custom property — preserved verbatim.
- Refactoring web components or page layouts.
- Theming for any third-party app outside this monorepo.
