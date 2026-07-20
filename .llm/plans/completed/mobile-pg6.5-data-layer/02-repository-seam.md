# 02 — Repository + sync seam + native-cache projection stubs

Implement master step **9b.2**.

## Detail docs

- [491-data-layer-repository-seam](/docs/proposals/mobile/_master-plan_/details/491-data-layer-repository-seam.md)

## Decision / skills

- [DOCS-MOBILE-DATA-LAYER-OFFLINE.md §7.1](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md)
- **mobile-data-layer**, **mobile-carplay-android-auto** rule

## Tasks

1. Create `apps/mobile/src/data/repositories/` and `apps/mobile/src/data/sync/` (+ barrel
   `src/data/index.ts` as needed).
2. Document and enforce: screens/hooks call repositories; `createMobileApiRequestService` /
   `req*` / `requestWithMobileAuthRefresh` for **product data** live only inside repositories
   (auth bootstrap may still seed session).
3. Add native-cache **projection helpers** (stubs OK) e.g.
   `projectQueueSnapshotToNativeCache`, `projectDownloadsIndexToNativeCache`,
   `projectLibraryBrowseIndexToNativeCache` — wrap engine 2.35 hooks if present; no-op / log in
   `__DEV__` until Track 12 storage exists. Call sites must be ready for queue/download/library
   repos so Track 12 does not rewrite repositories.
4. Provide a thin example repository proving the pattern (may be the account stub started here or
   a minimal health/read path).
5. Confirm `apps/mobile/AGENTS.md` + **mobile-data-layer** skill already match; fix if drifted.
6. Mark **9b.2** / **491** `done`.

## Acceptance

- No new product-data screen code calls `ApiRequestService` directly after this prompt’s migrations
  of call sites that this step touches (full screen migration continues in 03–05)
- Projection helpers exist and are documented as required for car/watch domains
- Dual-store: do not claim SQLite is readable by car when JS is dead

Do not run tests during agent work.
