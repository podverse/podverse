# Shared LoadingSpinner Consolidation

## Outcome

Standardize on a single loading spinner across the monorepo, exported from `@podverse/ui`,
and remove the redundant `LoadingText` and `InlineSpinner` shared components.

- One canonical `LoadingSpinner` (and `LoadingSpinnerOverlay`) exported from
  [packages/ui/src/index.ts](../../../../packages/ui/src/index.ts).
- Visual and behavioral parity with the existing `apps/web` spinner and overlay (no UX
  redesign).
- The current `@podverse/ui` `InlineSpinner` is **subsumed** into the new shared
  `LoadingSpinner` via a `size="inline"` variant; `InlineSpinner` is removed.
- The current `@podverse/ui` `LoadingText` is **removed**. Every callsite in
  `apps/management-web` switches to the new `LoadingSpinner`.
- Per the [shared-ui-i18n](../../../../.cursor/rules/shared-ui-i18n.mdc) rule, the shared
  component does **not** import `next-intl`; apps pass an `ariaLabel` prop with their own
  localized string.

## Scope

- `packages/ui` — add `LoadingSpinner` + `LoadingSpinnerOverlay`; remove `LoadingText` and
  `InlineSpinner`; update barrel and tests.
- `apps/web` (~38 callsites) — switch imports to `@podverse/ui`; pass localized
  `ariaLabel`; delete the app-local `LoadingSpinner` / `LoadingSpinnerOverlay` and SCSS.
- `apps/management-web` (~14 callsites) — replace every `LoadingText` and the existing
  `InlineSpinner` usage with `LoadingSpinner`.

## Non-Goals

- Visual redesign of the spinner; preserve the existing web look-and-feel.
- Changing how `LoadingSpinnerOverlay` is positioned (keep the
  `--sidebar-desktop-width` offset).
- Migrating apps that don't currently use these components.
- Replacing the spinner indicator inside `Button isLoading` (out of scope; uses its own
  internal indicator).

## References

- Shared UI rules:
  [.cursor/rules/prefer-shared-ui-web-management.mdc](../../../../.cursor/rules/prefer-shared-ui-web-management.mdc),
  [.cursor/rules/shared-ui-i18n.mdc](../../../../.cursor/rules/shared-ui-i18n.mdc).
- Reusable components skill:
  [.cursor/skills/reusable-components/SKILL.md](../../../../.cursor/skills/reusable-components/SKILL.md).
- Plan completion / archiving:
  [.cursor/skills/plan-completion/SKILL.md](../../../../.cursor/skills/plan-completion/SKILL.md).
