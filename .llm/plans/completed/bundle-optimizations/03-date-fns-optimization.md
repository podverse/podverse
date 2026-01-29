# Plan 03: date-fns Optimization (Helpers + apps/web, SUPPORTED_LOCALES-only)

## Goal

Reduce client bundle size (~300–500 KB+) by:

1. Using **subpath imports** for date-fns and importing **only the locales we use** in helpers.
2. Ensuring **date-fns and next-intl load only the locales that "all-available" encompasses** — the set defined in the monorepo (`SUPPORTED_LOCALES`). No arbitrary list.

## Locale source of truth

- **Definition**: [packages/helpers/src/lib/constants/locales.ts](packages/helpers/src/lib/constants/locales.ts)
- **`SUPPORTED_LOCALES`**: `['en-US', 'es', 'fr', 'el-GR']`
- **Usage**: [apps/web/src/i18n/request.ts](apps/web/src/i18n/request.ts) uses `SUPPORTED_LOCALES` when `NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES === 'all-available'`
- **i18n originals**: `apps/web/i18n/originals/{en-US,es,fr,el-GR}.json`

**Map to date-fns locale IDs**: `en-US` → `enUS`, `es` → `es`, `fr` → `fr`, `el-GR` → `el`. Derive from `SUPPORTED_LOCALES` (e.g. small map or helper) so we never hard-code a separate list.

## Scope

- **Packages/helpers**: [lib/date.ts](packages/helpers/src/lib/date.ts), [lib/i18n/timeFormatter.ts](packages/helpers/src/lib/i18n/timeFormatter.ts)
- **apps/web**: next-intl / use-intl use of date-fns for date/time formatting (large `date-fns/locale` chunk in bundle)
- **Bundle analyzer**: [env-config](tools/web-perf/bundle-analyzer/src/env-config.ts) uses `NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES: 'all-available'`; keep using that. No change required unless you want analyzer to use an explicit comma list for clarity.

## Implementation

### 1. Helpers: date-fns subpaths and locales from SUPPORTED_LOCALES

- Import **only** the four date-fns locales corresponding to `SUPPORTED_LOCALES`: `enUS`, `es`, `fr`, `el`.
- Use **subpath imports** for date-fns functions and locales (e.g. `date-fns/format`, `date-fns/locale/en-US`, etc.) so tree-shaking can drop unused code. Verify exact export style (default vs named) against the date-fns version in use:
  - `format`: `import format from 'date-fns/format'` (or named, per package).
  - `formatDuration`: `import { formatDuration } from 'date-fns/formatDuration'` (or equivalent).
  - `intervalToDuration`: `import { intervalToDuration } from 'date-fns/intervalToDuration'` (or equivalent).
- **`dateFnsLocaleMap`** (or equivalent): build from `SUPPORTED_LOCALES` → date-fns locale IDs; use for `getDateFnsLocale` and any formatter logic. No extra locales.
- Preserve existing behavior of `formatDateAbbrev`, `convertSecondsToDaysText`, `getDateFnsLocale`, `formatSecondsToReadableDuration`.

**Current usage** (for reference):

- **lib/date.ts**: `format`, `Locale` from date-fns; `enUS`, `es`, `fr`, `el` from date-fns/locale; `formatDateAbbrev`, `convertSecondsToDaysText`, `getDateFnsLocale`, `dateFnsLocaleMap`
- **lib/i18n/timeFormatter.ts**: `formatDuration`, `intervalToDuration` from date-fns; `enUS`, `es`, `el` from date-fns/locale; `formatSecondsToReadableDuration`

### 2. apps/web: next-intl / use-intl date-fns locale restriction

Next-intl (and use-intl) use date-fns for locale-aware date/time formatting. The bundle report shows a large `date-fns/locale` chunk (~602 KB parsed); that comes from next-intl/use-intl loading many locales by default.

- **Configure next-intl / use-intl** so only the **SUPPORTED_LOCALES** locales are loaded for date-fns. Options (depending on next-intl version):
  - next-intl `getRequestConfig` or provider options that limit date-fns locales to a given list.
  - Webpack **ContextReplacementPlugin** (or Next.js config equivalent) for `date-fns/locale` so only `en-US`, `es`, `fr`, `el` (or their package paths) are included.
  - Explicit client-side imports of **only** the four date-fns locales and passing them into next-intl/use-intl if the API supports it.
- **Single source of truth**: always derive the allowed list from `SUPPORTED_LOCALES` (import from `@podverse/helpers`). Use the same `SUPPORTED_LOCALES` → date-fns ID mapping as in helpers.

Implement the option that fits your next-intl setup; ensure no extra date-fns locales are bundled.

### 3. Keep "all-available" semantics

- `NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES === 'all-available'` must continue to mean "use `SUPPORTED_LOCALES`" everywhere, including date-fns and next-intl.
- When env is a comma list, only locales in `SUPPORTED_LOCALES` are valid; date-fns/next-intl should still only ever load locales from that validated set.

## Verification

1. From monorepo root: `npm run build:packages`, `npm run lint`.
2. Build web app: `cd apps/web && npm run build`.
3. `cd tools/web-perf/bundle-analyzer && npm run analyze:web` with a new report name (e.g. `post-date-fns-locales`). Compare client bundle size to baseline; expect a clear decrease (~300–500 KB+).
4. Manually verify: date/time formatting in app (lists, headers, settings) for `en-US`, `es`, `fr`, `el-GR`; switch locale and confirm no missing or wrong formats.
5. Run any existing tests that hit `lib/date` or `lib/i18n/timeFormatter`.

## Success criteria

- date-fns is used via subpath imports for `format`, `formatDuration`, `intervalToDuration` in helpers.
- Only the required locales (enUS, es, fr, el) are imported, derived from `SUPPORTED_LOCALES`; no arbitrary list.
- Date-fns and next-intl use **only** locales from `SUPPORTED_LOCALES`; next-intl/use-intl load only the four corresponding date-fns locales.
- Helpers build, lint, and web build succeed; i18n and date formatting behavior unchanged for supported locales.
- Client bundle size (via analyzer) is reduced.
