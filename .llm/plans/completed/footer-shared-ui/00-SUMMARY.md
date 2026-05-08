# Footer brand and copyright — shared UI

## Outcome

Move `FooterBrand` and `FooterCopyright` from `apps/web` into `@podverse/ui` (alongside
existing `FooterLayout`), with **all user-visible strings and config-derived values passed as
props** from the web app. Remove app-local components and duplicate SCSS after migration.

## Scope

- **`packages/ui`:** Add `FooterBrand` and `FooterCopyright` under
  `packages/ui/src/components/layout/FooterLayout/`, SCSS modules, barrel exports in
  `packages/ui/src/index.ts`. Use the existing **`LinkComponent`** pattern (see `ActionLink`).
  `FooterBrand` is `'use client'` because it uses `Image`.
- **`apps/web`:** Update `Footer.tsx` to pass `logoSrc`, `alt`, `href`, `LinkComponent`
  (`next/link`), and localized copyright `label`; remove
  `apps/web/src/components/Footer/FooterBrand.tsx`,
  `FooterCopyright.tsx`, and their SCSS under `apps/web/src/styles/components/Footer/`.
- **i18n:** Add a key for the copyright link label (e.g. `misc.open_source`) in all
  `apps/web/i18n/originals/*.json` — the current UI hardcodes English "Open Source".

## Non-Goals

- Changing footer layout structure beyond swapping component locations.
- Management-web (no footer usage today).
- Storybook (not used in this package).

## References

- [prefer-shared-ui-web-management.mdc](../../../../.cursor/rules/prefer-shared-ui-web-management.mdc)
- [shared-ui-i18n.mdc](../../../../.cursor/rules/shared-ui-i18n.mdc)
- [apps/web/AGENTS.md](../../../../apps/web/AGENTS.md) (no thin re-export wrappers)
