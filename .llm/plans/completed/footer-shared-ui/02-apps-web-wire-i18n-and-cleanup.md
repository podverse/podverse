# 02 — `apps/web`: wire Footer + i18n + delete locals

## Goal

Use the new `@podverse/ui` components from [`Footer.tsx`](../../../../apps/web/src/components/Footer/Footer.tsx),
pass all strings and logo inputs from the app, add translation keys, remove obsolete files.

## Footer.tsx

- Import `FooterBrand` and `FooterCopyright` from `@podverse/ui`.
- Call `useConfig()`, `useLocalSettings()`, and
  [`getBrandLogoSrc(uiTheme)`](../../../../apps/web/src/utils/brandLogo.ts) at the **Footer** level.
- Pass into `FooterBrand`:

  - `logoSrc={getBrandLogoSrc(uiTheme)}`
  - `alt={config.public.brand.name}`
  - `href="/"` (or omit if default)
  - `LinkComponent={Link}` where **`Link` is `next/link`**, not the app styled `Link` used for nav
    items (footer brand/copyright do not use that wrapper today).

- Pass into `FooterCopyright`:

  - `href={LINKS.opensourceLicense}` from [`constants/links.ts`](../../../../apps/web/src/constants/links.ts)
  - `label={t(...)}` using the new i18n key (below)
  - `LinkComponent={Link}` from `next/link`.

## i18n

- Add a short label key for the AGPL footer link in **all**
  [`apps/web/i18n/originals/*.json`](../../../../apps/web/i18n/originals/) (`en-US`, `es`, `fr`,
  `el-GR`). Suggested key: **`misc.open_source`** with English value **`Open Source`** for `en-US`.
- Sync overrides only if your locale workflow requires it (see i18n docs).

## Delete (after wiring)

- [`apps/web/src/components/Footer/FooterBrand.tsx`](../../../../apps/web/src/components/Footer/FooterBrand.tsx)
- [`apps/web/src/components/Footer/FooterCopyright.tsx`](../../../../apps/web/src/components/Footer/FooterCopyright.tsx)
- [`apps/web/src/styles/components/Footer/FooterBrand.module.scss`](../../../../apps/web/src/styles/components/Footer/FooterBrand.module.scss)
- [`apps/web/src/styles/components/Footer/FooterCopyright.module.scss`](../../../../apps/web/src/styles/components/Footer/FooterCopyright.module.scss)

Do **not** add thin re-export wrappers under `apps/web/src/components` (see apps/web AGENTS).

## Done when

- No remaining imports of deleted modules; `Footer.tsx` type-checks.
