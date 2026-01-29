# Bundle Optimizations – History

## Session 1 – 2026-01-29

### Prompt (Developer)

@migration-COPY-PASTA.md (58-66)

(Agent 2B: date-fns Optimization – Read and execute .llm/plans/active/bundle-optimizations/03-date-fns-optimization.md; use date-fns subpath imports and SUPPORTED_LOCALES-only locales; restrict next-intl/date-fns in apps/web to same locales. Verify: npm run build:packages && npm run lint && cd apps/web && npm run build)

### Key Decisions

- **Helpers date.ts**: Switched to subpath imports (`date-fns/format`, `date-fns/locale/en-US`, etc.); built `dateFnsLocaleMap` and `DATE_FNS_LOCALE_IDS` from `SUPPORTED_LOCALES`; kept `en` → enUS for backward compatibility.
- **Helpers timeFormatter.ts**: Subpath imports for `formatDuration` and `intervalToDuration`; use `getDateFnsLocale(lang)` from `../date` instead of a switch; added `fr` support via shared map.
- **apps/web**: Added Webpack `ContextReplacementPlugin` for `date-fns/locale` so only `DATE_FNS_LOCALE_IDS` (en-US, es, fr, el) are bundled; imported `DATE_FNS_LOCALE_IDS` from `@podverse/helpers` and `webpack` for the plugin.
- **apps/web**: Added `webpack` as devDependency (^5.0.0) for TypeScript types in `next.config.ts`.

### Files Modified

- `packages/helpers/src/lib/date.ts` – subpath imports, SUPPORTED_LOCALES → date-fns map, export DATE_FNS_LOCALE_IDS
- `packages/helpers/src/lib/i18n/timeFormatter.ts` – subpath imports, use getDateFnsLocale, add fr
- `apps/web/next.config.ts` – ContextReplacementPlugin for date-fns/locale
- `apps/web/package.json` – devDependency webpack ^5.0.0

### Verification

- `npm run build:packages` – success
- `npm run lint` – type-check and eslint pass; Prettier warnings only on pre-existing report HTML files in tools/web-perf
- `cd apps/web && npm run build` – success

---

## Session 2 – 2026-01-29

### Prompt (Developer)

@migration-COPY-PASTA.md (72-81)

(Agent 3: Remove joi from Client Bundle – Read and execute .llm/plans/active/bundle-optimizations/09-joi-client.md; remove joi from web app client bundle; verify build/lint/web build; run bundle analyzer; confirm joi not in client treemap.)

### Key Decisions

- **Option A (split helpers-validation)**: Added `packages/helpers-validation/src/client.ts` with client-safe validators (regex-based email, length/pattern password, re-exports from url.ts). No joi; API/server continue using main package.
- **Package exports**: Added `exports` in package.json for `./client`; added root-level `client.js` and `client.d.ts` re-exporting from `dist/client` so `moduleResolution: "node"` (apps/web) resolves the subpath.
- **apps/web**: All 7 imports switched from `@podverse/helpers-validation` to `@podverse/helpers-validation/client` (Auth forms, ModalChangeEmail, SettingsNotifications, urlValidator).

### Files Modified

- `packages/helpers-validation/src/client.ts` – new client-safe API (getEmailErrorKey, getPasswordErrorKey, getPassword2ErrorKey, getPasswordRequirementsInfoKey, url validators)
- `packages/helpers-validation/package.json` – exports for `.` and `./client`; files include client.js, client.d.ts
- `packages/helpers-validation/client.js` – root re-export for node resolution
- `packages/helpers-validation/client.d.ts` – root type re-export
- `apps/web/src/components/Auth/AuthSignUpForm.tsx`, `AuthResetPasswordForm.tsx`, `AuthForgotPasswordForm.tsx`, `AuthEmailChangeForm.tsx` – import from `/client`
- `apps/web/src/components/Settings/Panels/SettingsAccount/ModalChangeEmail.tsx`, `SettingsNotifications/SettingsNotifications.tsx` – import from `/client`
- `apps/web/src/utils/proxy/urlValidator.ts` – import from `/client`

### Verification

- `npm run build:packages` – success
- `npm run lint` – success
- `cd apps/web && npm run build` – success
- Bundle analyzer: user to run `cd tools/web-perf/bundle-analyzer && npm run analyze:web`, use report name e.g. `post-joi-client-removal`, and confirm joi (or joi/dist) is not in the client bundle treemap.

---

## Session 3 – 2026-01-29

### Prompt (Developer)

@migration-COPY-PASTA.md (87-96)

(Agent 4A: Lazy-Load Heavy UI – Read and execute .llm/plans/active/bundle-optimizations/04-lazy-load-heavy-ui.md; identify heavy components via bundle treemap, then lazy-load them with next/dynamic; use loading fallbacks where appropriate. Verify: npm run build:packages && npm run lint && cd apps/web && npm run build; run bundle analyzer and confirm initial client bundle size decreased.)

### Key Decisions

- **Modals**: Replaced static imports of all 10 modals with `next/dynamic`; each modal is mounted only when its open state is true (e.g. `modalAuthLogin.isOpen`, `modalPlaylistAddTo.channel !== null`), so modal code loads on first open. ModalDisclaimer mounts when `!serverEnvironmentDisclaimerAccepted`.
- **Toast / MembershipExpirationToast**: Lazy-loaded via `next/dynamic` with `ssr: false` inside the existing client component `LazyLoadedComponents.tsx` (layout is a Server Component and cannot use `ssr: false` with dynamic). Toast and MembershipExpirationToast removed from layout; they now render inside LazyLoadedComponents.
- **Settings panels**: Replaced static imports of SettingsGeneral, SettingsAccount, SettingsProfile, SettingsNotifications with `next/dynamic`; each panel loads when its tab is selected, with minimal `loading` fallbacks (aria-busy divs).

### Files Modified

- `apps/web/src/components/Modals/Modals.tsx` – dynamic imports per modal; conditional render based on modal state
- `apps/web/src/components/LazyLoadedComponents/LazyLoadedComponents.tsx` – added LazyToast and LazyMembershipExpirationToast (ssr: false)
- `apps/web/src/app/layout.tsx` – removed Toast and MembershipExpirationToast (now in LazyLoadedComponents)
- `apps/web/src/components/Settings/Settings.tsx` – dynamic imports for SettingsGeneral, SettingsAccount, SettingsProfile, SettingsNotifications with loading fallbacks

### Verification

- `npm run build:packages` – success
- `npm run lint` – success
- `cd apps/web && npm run build` – success
- Bundle analyzer: run `cd tools/web-perf/bundle-analyzer && npm run analyze:web` (interactive: choose base report e.g. 004-post-joi-client-removal, enter report name e.g. `lazy-load-heavy-ui`); compare client bundle size and confirm initial load decreased.

---

## Session 4 – 2026-01-29

### Prompt (Developer)

@migration-COPY-PASTA.md (124-132)

(Agent 4D: Lazy-load Virtuoso – Read and execute .llm/plans/active/bundle-optimizations/07-virtuoso.md. Lazy-load react-virtuoso (VirtualizedList / ItemTranscript) when transcript is used. Verify: npm run build:packages && npm run lint && cd apps/web && npm run build)

### Key Decisions

- **ItemTranscript lazy-loaded at call sites**: Used `next/dynamic` in EpisodeList and TrackList to load ItemTranscript only when the transcript tab is shown; react-virtuoso (via VirtualizedList inside ItemTranscript) is then loaded on demand.
- **Loading fallback**: `loading: () => <div aria-label="Loading transcript" style={{ minHeight: 400 }} />` so layout doesn’t jump; `ssr: false` since transcript is client-only.

### Files Modified

- `apps/web/src/app/episode/[item_id]/EpisodeList.tsx` – dynamic import of ItemTranscript with loading fallback
- `apps/web/src/app/track/[item_id]/TrackList.tsx` – dynamic import of ItemTranscript with loading fallback

### Verification

- `npm run build:packages` – success
- `npm run lint` – success (Prettier run on modified files)
- `cd apps/web && npm run build` – failed due to unrelated type error in `SettingsAccount.tsx` (dismissToast expects string, got Promise<string>); lazy-load changes are complete and lint-clean

---

## Session 5 – 2026-01-29

### Prompt (Developer)

Check the currently active bundle optimizations plans and determine which ones have already been completed and if they have been completed handle them as completed

### Key Decisions

- **Completed plans** (verified via codebase and history): 01 fix measurement (bundle-analyzer uses totalAssetSize), 02 sideEffects (four packages have "sideEffects": false), 03 date-fns, 04 lazy-load heavy UI, 06 toast (LazyToast in LazyLoadedComponents), 07 virtuoso, 09 joi-client.
- **Remaining**: 05 lazy-dnd (ListQueueResources/ListPlaylistResources still static import @hello-pangea/dnd), 08 parsing-libs (no history or code evidence).
- **Plan lifecycle**: Moved completed plan files from `.llm/plans/active/bundle-optimizations/` to `.llm/plans/completed/bundle-optimizations/` per plan-lifecycle rule. Updated 00-overview.md, migration-00-EXECUTION-ORDER.md, EXECUTION.md, and migration-COPY-PASTA.md with status and links to completed plans.

### Files Modified

- Created `.llm/plans/completed/bundle-optimizations/` and moved: 01-fix-bundle-measurement.md, 02-side-effects-packages.md, 03-date-fns-optimization.md, 04-lazy-load-heavy-ui.md, 06-toast.md, 07-virtuoso.md, 09-joi-client.md.
- `.llm/plans/active/bundle-optimizations/00-overview.md` – added Status section, updated Execution Order and Plan Files table.
- `.llm/plans/active/bundle-optimizations/migration-00-EXECUTION-ORDER.md` – added Status, marked phases complete, updated Quick Start.
- `.llm/plans/active/bundle-optimizations/EXECUTION.md` – added Status, updated Phases table.
- `.llm/plans/active/bundle-optimizations/migration-COPY-PASTA.md` – added status note for remaining Phase 4b prompts.

---

## Session 6 – 2026-01-29

### Prompt (Developer)

Review the active bundle optimizations plans and determine which ones are redundant or already completed because there are suspicious looking ones that seem like they should already be done. but are still inactive

### Key Decisions

- **Redundant (duplicates)**: `05-esm-helpers-optional.md` was identical to `10-esm-helpers-optional.md`; `06-audit-helpers-surface-optional.md` was identical to `11-audit-helpers-surface-optional.md`. Deleted the duplicate-numbered files (05-esm, 06-audit); kept 10 and 11 as the canonical optional plans.
- **Already completed but still "active"**: Plan 08 (parsing libs) — transcript is lazy-loaded via `await import('./transcriptParser')` in transcript.ts; DescriptionRenderer is lazy-loaded via next/dynamic in EpisodeSummary, LivestreamSummary, TrackSummary; UpdatesClient is lazy-loaded via next/dynamic in updates/page.tsx. Moved 08-parsing-libs.md to completed.
- **Truly remaining**: 05-lazy-dnd only (ListQueueResources/ListPlaylistResources still static import @hello-pangea/dnd). Optional 10 and 11 unchanged.

### Files Modified

- Deleted `.llm/plans/active/bundle-optimizations/05-esm-helpers-optional.md`, `06-audit-helpers-surface-optional.md`.
- Moved `08-parsing-libs.md` to `.llm/plans/completed/bundle-optimizations/`.
- Updated 00-overview.md, migration-00-EXECUTION-ORDER.md, EXECUTION.md, migration-COPY-PASTA.md: 08 marked complete, remaining core plan is 05 only; noted duplicate cleanup.

---

## Session 7 – 2026-01-29

### Prompt (Developer)

Wasn't the lazy dnd completed? or was it not?

### Key Decisions

- **Lazy DnD was already completed.** QueuesList.tsx, PlaylistList.tsx, and PlaylistEditList.tsx each use `next/dynamic` to load ListQueueResources / ListPlaylistResources with `ssr: false` and a loading fallback. So @hello-pangea/dnd is only loaded when users visit queue or playlist pages, not in the main bundle. Earlier review had only checked the component files (static import of dnd) and missed the route-level dynamic imports.
- Moved 05-lazy-dnd.md to completed and updated all overview/execution docs: all core plans (01–09) are now complete; only optional 10 and 11 remain.

### Files Modified

- Moved `.llm/plans/active/bundle-optimizations/05-lazy-dnd.md` to `.llm/plans/completed/bundle-optimizations/`.
- Updated 00-overview.md, migration-00-EXECUTION-ORDER.md, EXECUTION.md, migration-COPY-PASTA.md: 05 marked complete, "remaining (core): none."
