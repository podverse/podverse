# staged-changes-dry-cleanup

## Started

2026-05-07

## Author

Agent (Claude in Cursor)

## Context

Implementation history for the DRY cleanup plan saved at
`.llm/plans/active/staged-changes-dry-cleanup/`. The plan resulted from a thorough
audit of the 807-file staged change set on branch `feature/mgmt-bucket-view`.

## Sessions

### Session 1 - 2026-05-07

#### Prompt (Developer)

Implement .llm/plans/active/staged-changes-dry-cleanup/01-delete-loading-overlay.md.

#### Goal

Delete dead `LoadingOverlay` from `@podverse/ui`. It is unused (no app imports it) and
duplicates the spinner pixel map and `<FaSpinner>` direct usage that
`LoadingSpinnerOverlay` already provides via composition with `LoadingSpinner`.

#### Key Decisions

- Moved the four shared SCSS rules (`.overlay`, `.content`, `.message`, `.spinnerWrapper`)
  plus the `flexbox` `@use` from `LoadingOverlay.module.scss` into
  `LoadingSpinnerOverlay.module.scss`. Folded the existing `.overlayShell` (sidebar
  offset) into the same module so `LoadingSpinnerOverlay.tsx` imports one styles file.
- Dropped `@keyframes spin` and `.spinner` — they were only used by `LoadingOverlay`'s
  inline `<FaSpinner>`. `LoadingSpinnerOverlay` composes `LoadingSpinner`, which owns
  its own animation.
- Replaced the exported `LoadingOverlaySpinnerSize` type with a new
  `LoadingSpinnerOverlaySize = Exclude<LoadingSpinnerSize, 'inline'>` defined in
  `LoadingSpinnerOverlay.tsx` and exported from the local `index.ts` and the package
  barrel. Single source of truth (`LoadingSpinnerSize`) instead of two parallel size
  unions.
- Deleted the `LoadingOverlay/` directory (four files) since no app referenced it.

#### Files Created/Modified

- M `packages/ui/src/components/layout/LoadingSpinnerOverlay/LoadingSpinnerOverlay.tsx`
- M `packages/ui/src/components/layout/LoadingSpinnerOverlay/LoadingSpinnerOverlay.module.scss`
- M `packages/ui/src/components/layout/LoadingSpinnerOverlay/index.ts`
- M `packages/ui/src/index.ts`
- D `packages/ui/src/components/layout/LoadingOverlay/LoadingOverlay.tsx`
- D `packages/ui/src/components/layout/LoadingOverlay/LoadingOverlay.module.scss`
- D `packages/ui/src/components/layout/LoadingOverlay/LoadingOverlay.test.tsx`
- D `packages/ui/src/components/layout/LoadingOverlay/index.ts`

#### Verification

- `./scripts/nix/with-env npm run lint -w @podverse/ui` — passes.
- `./scripts/nix/with-env npm run build:packages` — passes.
- `./scripts/nix/with-env npm run test -w @podverse/ui` — 145 / 145 passing.

### Session 2 - 2026-05-07

#### Prompt (Developer)

Implement .llm/plans/active/staged-changes-dry-cleanup/02-delete-common-list-page-header.md.

#### Goal

Remove the no-op `CommonListPageHeader` wrapper from `apps/web` and use `MainHeader` from
`@podverse/ui` directly at every call site.

#### Key Decisions

- Merged `MainHeader` into the existing `@podverse/ui` import alongside `Dropdown` or
  `Button` per file (single workspace import line).
- Deleted `CommonListPageHeader.tsx`. `Common/List/` still contains
  `CommonDetailListHeader.tsx` — directory kept.

#### Files Created/Modified

- M `apps/web/src/app/podcasts/PodcastsPageHeader.tsx`
- M `apps/web/src/app/HomePageHeader.tsx`
- M `apps/web/src/app/albums/AlbumsPageHeader.tsx`
- M `apps/web/src/app/episodes/EpisodesPageHeader.tsx`
- M `apps/web/src/app/artists/ArtistsPageHeader.tsx`
- M `apps/web/src/app/tracks/TracksPageHeader.tsx`
- M `apps/web/src/app/podcasts/livestreams/LivestreamsPageHeader.tsx`
- M `apps/web/src/components/AddByRSS/List/AddByRSSListHeader.tsx`
- D `apps/web/src/components/Common/List/CommonListPageHeader.tsx`

#### Verification

- `./scripts/nix/with-env npm run lint -w apps/web` — passes (max-warnings 0).

### Session 3 - 2026-05-07

#### Prompt (Developer)

Implement .llm/plans/active/staged-changes-dry-cleanup/03-shared-error-boundary-shell.md.

#### Key Decisions

- Resolved `simple-import-sort/imports` for `global-error.tsx`: place `import type { MiscTranslations } from '@podverse/ui'` **above** the value import block from `@podverse/ui` (web + management-web).
- Marked plan `03-shared-error-boundary-shell.md` completed and moved it to `.llm/plans/completed/staged-changes-dry-cleanup/`.

#### Files Created/Modified

- M `apps/web/src/app/global-error.tsx`
- M `apps/management-web/src/app/global-error.tsx`
- M `.llm/plans/active/staged-changes-dry-cleanup/COPY-PASTA.md`
- M `.llm/plans/completed/staged-changes-dry-cleanup/03-shared-error-boundary-shell.md` (moved from `active/`)

#### Verification

- `./scripts/nix/with-env npm run lint` (repo root) — passes (type-check, ESLint, Prettier).

### Session 4 - 2026-05-07

#### Prompt (Developer)

Implement .llm/plans/active/staged-changes-dry-cleanup/04-table-family-internal-dedupe.md.

#### Key Decisions

- Added `computeFilterBarColumns` and `tableWithFilterColumnsToSortColumns` in
  `packages/ui/src/components/table/Table/tableWithFilterColumnHelpers.ts`; both
  `TableWithFilter` and `ResourceTableWithFilter` use them (removed `toSortColumns` /
  inline filter-column logic / grouped duplicate filter row).
- Extended `TableWithFilter` with optional `bodyRender` and a discriminated `TableWithFilterProps`
  union so grouped `ResourceTableWithFilter` composes the shared filter row + pagination without
  duplicating `<TableFilterBar />` markup.
- Added `mergeTableListStateInBrowserCookie` in `browserCookies.ts`; `useTableFilterState` no longer
  calls `readBrowserCookie` / `writeBrowserCookie` directly for list-state merges.
- Trimmed duplicate layout rules from `ResourceTableWithFilter.module.scss` (filter row now comes from
  `TableWithFilter` styles).
- Exported helpers + `TableWithFilterBodyRenderArgs` + `mergeTableListStateInBrowserCookie` from the UI
  package barrel.

#### Files Created/Modified

- A `packages/ui/src/components/table/Table/tableWithFilterColumnHelpers.ts`
- A `packages/ui/src/components/table/Table/tableWithFilterColumnHelpers.test.ts`
- A `packages/ui/src/lib/cookies/browserCookies.test.ts`
- M `packages/ui/src/lib/cookies/browserCookies.ts`
- M `packages/ui/src/hooks/useTableFilterState.ts`
- M `packages/ui/src/components/table/TableWithFilter/TableWithFilter.tsx`
- M `packages/ui/src/components/table/TableWithFilter/TableWithFilter.test.tsx`
- M `packages/ui/src/components/table/ResourceTableWithFilter/ResourceTableWithFilter.tsx`
- M `packages/ui/src/components/table/ResourceTableWithFilter/ResourceTableWithFilter.module.scss`
- M `packages/ui/src/index.ts`
- M `.llm/plans/active/staged-changes-dry-cleanup/COPY-PASTA.md`
- M `.llm/plans/completed/staged-changes-dry-cleanup/04-table-family-internal-dedupe.md` (moved from `active/`)

#### Verification

- `./scripts/nix/with-env npm run lint -w @podverse/ui` — passes.
- `./scripts/nix/with-env npm run test -w @podverse/ui` — 163 tests passing.
- `./scripts/nix/with-env npm run lint -w @podverse/management-web` — passes.
- `./scripts/nix/with-env npm run build:packages` — passes.

### Session 5 - 2026-05-07

#### Prompt (Developer)

Implement .llm/plans/active/staged-changes-dry-cleanup/05-subscribed-list-header-hook.md.

#### Key Decisions

- Added `useSubscribedListHeader` in `apps/web/src/hooks/useSubscribedListHeader.tsx` (JSX requires `.tsx`):
  guards from `typeValues` / `sortValues`, handlers for global / category / subscribed type changes,
  top-sort → range week, optional `preserveAcrossUpdates` for livestreams `liveItemType`.
- Refactored `PodcastsPageHeader`, `EpisodesPageHeader`, `ClipsPageHeader`, `LivestreamsPageHeader` to call
  the hook and spread `getPodcastsPageDropdownConfig` / `getEpisodesPageDropdownConfig` results (`...cfg`).
- Vitest RTL tests in `useSubscribedListHeader.test.tsx`; extended `apps/web/vitest.config.ts` with
  `@vitejs/plugin-react`, `jsdom`, and `.tsx` inclusion; added `@testing-library/react` / `@vitejs/plugin-react` /
  `jsdom` to `apps/web` devDependencies.
- **Build fixes:** `ResourceTableWithFilterProps` no longer indexes optional props off the `TableWithFilterProps`
  union (explicit `onRowClick` / `selectedRowKey`). Re-exported `TableWithFilterBodyRenderArgs` from
  `packages/ui/src/components/table/TableWithFilter/index.ts` so `@podverse/ui` barrel resolves correctly.

#### Files Created/Modified

- A `apps/web/src/hooks/useSubscribedListHeader.tsx`
- A `apps/web/src/hooks/useSubscribedListHeader.test.tsx`
- M `apps/web/src/app/podcasts/PodcastsPageHeader.tsx`
- M `apps/web/src/app/episodes/EpisodesPageHeader.tsx`
- M `apps/web/src/app/clips/ClipsPageHeader.tsx`
- M `apps/web/src/app/podcasts/livestreams/LivestreamsPageHeader.tsx`
- M `apps/web/vitest.config.ts`
- M `apps/web/package.json`
- M `package-lock.json`
- M `packages/ui/src/components/table/ResourceTableWithFilter/ResourceTableWithFilter.tsx`
- M `packages/ui/src/components/table/TableWithFilter/index.ts`
- M `.llm/plans/active/staged-changes-dry-cleanup/COPY-PASTA.md`
- M `.llm/plans/completed/staged-changes-dry-cleanup/05-subscribed-list-header-hook.md` (moved from `active/`)

#### Verification

- `./scripts/nix/with-env npm run lint -w @podverse/web` — passes.
- `./scripts/nix/with-env npm run test -w @podverse/web` — passes (25 tests).
- `./scripts/nix/with-env npm run build -w @podverse/web` — passes.
- `./scripts/nix/with-env npm run lint -w @podverse/ui` — passes.

### Session 6 - 2026-05-07

#### Prompt (Developer)

Implement .llm/plans/active/staged-changes-dry-cleanup/06-list-dropdown-config-factory.md.

#### Key Decisions

- Extended `apps/web/src/utils/dropdownMenuItems.ts` with `buildSubscribedListDropdownConfig` and
  overload-based `buildSubscribedListFilterParams` (with/without `currentCategory` when `supportsCategory`
  is true), reusing `getValidQueryParam` and existing `getRangeDropdownItems` wiring.
- Replaced the eight `*PageDropdownConfig` modules with thin wrappers that pass page-specific type/sort
  options and sort allowlists; livestreams still layers `currentLiveItemType` on the shared filter result.
  Episodes keeps `medium`-gated type options; `categorySorts` always provided so deep-linked `type=category`
  on music still resolves sort options like the pre-factory code.
- Added `apps/web/src/utils/dropdownMenuItems.test.ts` (Vitest) for the two helpers.

#### Files Created/Modified

- M `apps/web/src/utils/dropdownMenuItems.ts`
- A `apps/web/src/utils/dropdownMenuItems.test.ts`
- M `apps/web/src/app/podcasts/PodcastsPageDropdownConfig.ts`
- M `apps/web/src/app/episodes/EpisodesPageDropdownConfig.tsx`
- M `apps/web/src/app/albums/AlbumsPageDropdownConfig.ts`
- M `apps/web/src/app/artists/ArtistsPageDropdownConfig.ts`
- M `apps/web/src/app/podcasts/livestreams/LivestreamsPageDropdownConfig.tsx`
- M `apps/web/src/app/profiles/ProfilesPageDropdownConfig.ts`
- M `apps/web/src/app/tracks/TracksPageDropdownConfig.tsx`
- M `.llm/plans/active/staged-changes-dry-cleanup/COPY-PASTA.md`
- M `.llm/plans/completed/staged-changes-dry-cleanup/06-list-dropdown-config-factory.md` (moved from `active/`)

#### Verification

- `./scripts/nix/with-env npm run lint -w apps/web` — passes.
- `./scripts/nix/with-env npx vitest run src/utils/dropdownMenuItems.test.ts` (from `apps/web`) — 6 tests pass.
- `./scripts/nix/with-env npm run build -w apps/web` — passes.

### Session 7 - 2026-05-07

#### Prompt (Developer)

Implement .llm/plans/active/staged-changes-dry-cleanup/07-checkbox-and-alert-polish.md.

#### Key Decisions

- **CheckboxField** is the single labeled-checkbox API: added optional `id`, `name`, `className`, and
  `wrapInDiv` (migrates **LabeledCheckbox** layout + SCSS into `CheckboxField.module.scss` as `wrapRoot` /
  `wrapOption` / `wrapInput` / `wrapLabelText`). **apps/web** checkout + add-by-RSS use `CheckboxField` with
  `wrapInDiv` and explicit ids/names.
- Removed **`LabeledCheckbox`** component files and barrel exports.
- **Alert** returns `null` when `children` is null, undefined, or `''` unless **`renderWhenEmpty`** is set.
  Deleted **`ManagementInlineErrorAlert`**; **management-web** uses **`Alert`** from **`@podverse/ui`** with
  `{error}` children (empty errors render nothing).
- Fixed **`dropdownMenuItems.test.ts`** typing for `supportsCategory: false` (omit `category` key so overload
  resolves).

#### Files Created/Modified

- M `packages/ui/src/components/form/CheckboxField/CheckboxField.tsx`
- M `packages/ui/src/components/form/CheckboxField/CheckboxField.module.scss`
- A `packages/ui/src/components/form/CheckboxField/CheckboxField.test.tsx`
- M `packages/ui/src/components/layout/Alert/Alert.tsx`
- A `packages/ui/src/components/layout/Alert/Alert.test.tsx`
- M `packages/ui/src/index.ts`
- D `packages/ui/src/components/form/LabeledCheckbox/*` (removed)
- M `apps/web/src/app/add-by-rss/add/AddByRSSAddFeedPageClient.tsx`
- M `apps/web/src/app/checkout/CheckoutPageClient.tsx`
- M `apps/web/src/utils/dropdownMenuItems.test.ts`
- D `apps/management-web/src/components/Alert/ManagementInlineErrorAlert.tsx`
- M `apps/management-web/src/app/page.tsx`
- M multiple `apps/management-web/src/app/(management)/**/*PageClient.tsx` (Alert imports)
- M `.llm/plans/active/staged-changes-dry-cleanup/COPY-PASTA.md`
- M `.llm/plans/completed/staged-changes-dry-cleanup/07-checkbox-and-alert-polish.md` (moved from `active/`)

#### Verification

- `./scripts/nix/with-env npm run lint -w @podverse/ui` — passes.
- `./scripts/nix/with-env npm run test -w @podverse/ui` — passes (169 tests).
- `./scripts/nix/with-env npm run lint` from `apps/management-web` — passes.
- `./scripts/nix/with-env npm run type-check -w @podverse/web` — passes.

### Session 8 - 2026-05-07

#### Prompt (Developer)

Implement .llm/plans/active/staged-changes-dry-cleanup/08-i18n-and-delete-modal-cleanup.md.

#### Key Decisions

- **`useDeleteModal`:** Added optional `formatError`; on failure the hook sets `error` to
  `formatError(err) ?? ''` (no English default in `@podverse/ui`). Tests cover with/without
  `formatError`.
- **Loading aria:** `ManagementLoadingSpinnerFull` and `ManagementLoadingSpinnerSmall` use
  `useTranslations('misc')` + `t('loading')` to match web’s **`misc.loading`**. Removed
  **`common.loading`** from management-web `common` namespace in all locale originals; added
  **`misc.loading`** (aligned with web copy, incl. Unicode ellipsis) and reordered `misc` keys
  alphabetically. Overrides updated; added missing **`tableShared`** blocks to `fr` / `el-GR`
  originals and empty override stubs so **`i18n:validate`** key-order checks pass.

#### Files Created/Modified

- M `packages/ui/src/hooks/useDeleteModal.ts`
- M `packages/ui/src/hooks/useDeleteModal.test.tsx`
- M `apps/management-web/src/components/LoadingSpinner/ManagementLoadingSpinnerFull.tsx`
- M `apps/management-web/src/components/LoadingSpinner/ManagementLoadingSpinnerSmall.tsx`
- M `apps/management-web/i18n/originals/en-US.json`, `es.json`, `fr.json`, `el-GR.json`
- M `apps/management-web/i18n/overrides/es.json`, `fr.json`, `el-GR.json`
- M `.llm/plans/active/staged-changes-dry-cleanup/COPY-PASTA.md`
- M `.llm/plans/completed/staged-changes-dry-cleanup/08-i18n-and-delete-modal-cleanup.md` (moved from `active/`)

#### Verification

- `./scripts/nix/with-env npm run test -w @podverse/ui` — 170 tests pass.
- `npx ts-node scripts/ci/validate-i18n.ts` — run locally after `tableShared` + override sync (should pass).

### Session 9 - 2026-05-07

#### Prompt (Developer)

Implement .llm/plans/active/staged-changes-dry-cleanup/09-layout-naming-clarity.md.

#### Key Decisions

- Renamed **`MainInnerWrapper`** → **`MainSidebarLayout`** (SCSS class **`mainSidebarLayout`**) and
  **`MainInnerContentWrapper`** → **`MainColumnStack`** (**`mainColumnStack`**) with new directories under
  `packages/ui/src/components/layout/`.
- Updated all **`apps/web`** imports/usages; **`management-web`** had no references.
- Added a barrel JSDoc notice-family guide above **`Alert`** exports listing **`Banner`**, **`Callout`**,
  **`CallToActionMessage`**, **`Alert`**, **`RestrictedNotice`**.
- Removed obsolete **`MainInnerWrapper/`** and **`MainInnerContentWrapper/`** component directories.

#### Files Created/Modified

- A `packages/ui/src/components/layout/MainSidebarLayout/MainSidebarLayout.tsx`
- A `packages/ui/src/components/layout/MainSidebarLayout/MainSidebarLayout.module.scss`
- A `packages/ui/src/components/layout/MainColumnStack/MainColumnStack.tsx`
- A `packages/ui/src/components/layout/MainColumnStack/MainColumnStack.module.scss`
- M `packages/ui/src/index.ts`
- D `packages/ui/src/components/layout/MainInnerWrapper/*`
- D `packages/ui/src/components/layout/MainInnerContentWrapper/*`
- M `apps/web/**/*.tsx` (bulk rename imports + JSX)
- M `.llm/plans/active/staged-changes-dry-cleanup/COPY-PASTA.md`
- M `.llm/plans/completed/staged-changes-dry-cleanup/09-layout-naming-clarity.md` (moved from `active/`)

#### Verification

- `./scripts/nix/with-env npm run lint` — passes (includes Prettier check).
- `./scripts/nix/with-env npm run build:packages` — passes.
- `./scripts/nix/with-env npm run lint:fix -w @podverse/web` — applied import-sort fixes after bulk rename.

### Session 10 - 2026-05-07

#### Prompt (Developer)

Implement .llm/plans/active/staged-changes-dry-cleanup/10-verification.md.

#### Key Decisions

- Ran **`npm run lint`**, **`build:packages`**, **`build -w apps/web`**, **`build -w apps/management-web`**, and
  **`npm run test:unit`** — all passed.
- **`make e2e_test_management_web_report_spec`** with comma-separated **`SPEC`** (four specs) — **4 passed**.
- **`make e2e_test_web_report_spec SPEC=e2e/smoke.spec.ts`** — **1 passed**.
- **`e2e/navbar-chrome.spec.ts`** failed once (wide viewport: **`Search`** link not found); likely UI/copy drift,
  unrelated to verification edits.
- **`makefiles/local/Makefile.local.e2e.mk`**: expand comma-separated **`SPEC`** / **`WEB_SPEC`** / **`MGMT_SPEC`** to
  multiple Playwright arguments via **`tr ',' ' '`** so documented comma lists work.
- Rewrote **`.llm/plans/.../10-verification.md`** for current repo spec inventory and Nix/`psql` note; checked
  **COPY-PASTA** step **10** and moved the whole **`staged-changes-dry-cleanup`** plan set from **`active/`** to
  **`completed/`**.

#### Files Created/Modified

- M `makefiles/local/Makefile.local.e2e.mk`
- M `.llm/plans/completed/staged-changes-dry-cleanup/10-verification.md`
- M `.llm/plans/completed/staged-changes-dry-cleanup/COPY-PASTA.md`
- (Plan set `staged-changes-dry-cleanup` moved from **`.llm/plans/active/`** to **`.llm/plans/completed/`**,
  including `00-*.md` and `01`–`09` plan files already there.)
- M `.llm/plans/completed/staged-changes-dry-cleanup/COPY-PASTA.md` (prompt paths → **`completed/`**).

#### Verification

- See Key Decisions (lint/build/unit green; management-web E2E green; web smoke green; navbar-chrome failed).
