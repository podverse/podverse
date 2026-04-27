# Phase 3b — Group A: management admin/data page modules

## Scope

Migrate 10 SCSS module files in `apps/management-web/src/app/(management)/...` from `theme.$x` SCSS variables to `@podverse/ui/styles/variables` + canonical CSS custom properties.

Runs in parallel with Group B (`05-`) and Group C (`06-`). Each group touches disjoint files.

## Files

1. `apps/management-web/src/app/(management)/dashboard/dashboard.module.scss`
2. `apps/management-web/src/app/(management)/dashboard/page.module.scss`
3. `apps/management-web/src/app/(management)/stats/page.module.scss`
4. `apps/management-web/src/app/(management)/workers/page.module.scss`
5. `apps/management-web/src/app/(management)/database/page.module.scss`
6. `apps/management-web/src/app/(management)/feed-operations/flag-status/page.module.scss`
7. `apps/management-web/src/app/(management)/users/page.module.scss`
8. `apps/management-web/src/app/(management)/users/[id]/page.module.scss`
9. `apps/management-web/src/app/(management)/users/[id]/edit/page.module.scss`
10. `apps/management-web/src/app/(management)/users/new/page.module.scss`

## Procedure (apply to every file)

### 1. Replace the import line

Old:

```scss
@use '../../../styles/theme/variables' as theme;
```

(or deeper relative path with the same suffix — preserve the relative-path depth, only the alias changes)

New:

```scss
@use '@podverse/ui/styles/variables' as *;
```

If Next.js Sass loader cannot resolve the package spec (Phase 3a step 5 verifies this), use the relative path that Phase 3a documented.

### 2. Apply the canonical token map

Replace every `theme.$…` reference per the table below. The table is exhaustive for the tokens defined in `apps/management-web/src/styles/theme/_variables.scss`; any reference outside this table is a bug in management-web today and should be flagged.

| `theme.$…` reference                                          | replacement                                              |
| ------------------------------------------------------------- | -------------------------------------------------------- |
| `theme.$color-primary`                                        | `var(--border-color-primary)`                            |
| `theme.$color-text-primary`                                   | `var(--text-color-primary)`                              |
| `theme.$color-text-secondary`                                 | `var(--text-color-secondary)`                            |
| `theme.$color-background`                                     | `var(--background-color-secondary)`                      |
| `theme.$color-background-light`                               | `var(--background-color-tertiary)`                       |
| `theme.$color-background-card`                                | `var(--background-color-tertiary)`                       |
| `theme.$color-border`                                         | `var(--border-color-tertiary)`                           |
| `theme.$color-border-light`                                   | `var(--border-color-opaque)`                             |
| `theme.$color-error`                                          | `var(--text-color-danger)`                               |
| `theme.$color-error-bg`                                       | `var(--background-color-error)`                          |
| `theme.$color-error-border`                                   | `var(--border-color-error)`                              |
| `theme.$color-disabled`                                       | `var(--text-color-secondary)` (add `opacity: 0.6;` if needed for legacy effect) |
| `theme.$color-on-primary`                                     | `var(--text-color-tertiary)`                             |
| `theme.$color-success`                                        | `var(--text-color-success)`                              |
| `theme.$color-success-bg`                                     | `var(--background-color-success)`                        |
| `theme.$color-warning`                                        | `var(--text-color-warning)`                              |
| `theme.$color-warning-bg`                                     | `var(--background-color-warning)`                        |
| `theme.$spacing-xs`                                           | `var(--spacing-md)`                                      |
| `theme.$spacing-sm`                                           | `var(--spacing-base)`                                    |
| `theme.$spacing-md`                                           | `var(--spacing-lg)`                                      |
| `theme.$spacing-lg`                                           | `var(--spacing-2xl)`                                     |
| `theme.$spacing-xl`                                           | `var(--spacing-4xl)`                                     |
| `theme.$font-size-xs`                                         | `var(--font-size-xs)`                                    |
| `theme.$font-size-base`                                       | `var(--font-size-base)`                                  |
| `theme.$font-size-lg`                                         | `var(--font-size-lg)`                                    |
| `theme.$font-size-xl`                                         | `var(--font-size-xl)`                                    |
| `theme.$font-size-xxl`                                        | `var(--font-size-2xl)`                                   |
| `theme.$font-weight-medium`                                   | `var(--font-weight-medium)`                              |
| `theme.$font-weight-semibold`                                 | `var(--font-weight-bold)`                                |
| `theme.$border-radius-sm`                                     | `var(--border-radius)`                                   |
| `theme.$border-radius-md`                                     | `var(--border-radius)`                                   |
| `theme.$border-width`                                         | `1px`                                                    |
| `theme.$shadow-card`                                          | `var(--shadow-card)`                                     |
| `theme.$transition-default`                                   | `var(--transition-default)`                              |

### 3. Common patterns

- `border: theme.$border-width solid theme.$color-border;` → `border: 1px solid var(--border-color-tertiary);`
- `padding: theme.$spacing-sm theme.$spacing-md;` → `padding: var(--spacing-base) var(--spacing-lg);`
- `transition: background-color theme.$transition-default;` → `transition: background-color var(--transition-default);`

### 4. Avoid Sass color functions on CSS custom properties

Sass functions like `darken()`, `lighten()`, and `mix()` cannot operate on `var(--…)`. If you encounter one (none expected in this group, but verify), replace with a theme-defined hover/state token (e.g. `--button-primary-bg-hover`) or use `color-mix()` in modern CSS.

## Verification

```bash
# Type-check first to catch syntax errors.
npm run -w @podverse/management-web type-check

# Build (this also runs Sass; failures point at unresolved tokens).
npm run -w @podverse/management-web build

# Confirm none of these 10 files still reference theme.
rg "theme\.\$" \
  apps/management-web/src/app/\(management\)/dashboard \
  apps/management-web/src/app/\(management\)/stats \
  apps/management-web/src/app/\(management\)/workers \
  apps/management-web/src/app/\(management\)/database \
  apps/management-web/src/app/\(management\)/feed-operations \
  apps/management-web/src/app/\(management\)/users
```

Expected: zero matches.

Visual smoke (after all three groups complete):

```bash
make app_management_web_e2e_run_basic_smoke
```

## Definition of done

- All 10 files import `@podverse/ui/styles/variables` (no `theme/variables`).
- All `theme.$…` references replaced per the canonical map.
- `npm run -w @podverse/management-web build` passes.
- Manual sanity check: dashboard, users list, users edit, workers, database, stats, flag-status pages render in dark theme without obvious styling regressions (some color shifts are expected since management is now using web's palette).
