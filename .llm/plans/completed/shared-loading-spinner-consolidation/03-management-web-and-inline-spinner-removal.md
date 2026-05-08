# 03 - Replace LoadingText / InlineSpinner In Management-Web And Remove Both Shared Components

## Assessment

`apps/management-web` uses `LoadingText` from `@podverse/ui` to render a localized
"Loading…" string in ~14 places. The user wants to standardize on `LoadingSpinner`
everywhere, so each `LoadingText` callsite becomes a `LoadingSpinner` with the same
localized string passed as `ariaLabel`. The single `InlineSpinner` user
([apps/management-web/src/app/(management)/storage/StoragePageClient.tsx](../../../../apps/management-web/src/app/(management)/storage/StoragePageClient.tsx),
lines 497 and 507) becomes a `LoadingSpinner` with `size="inline"` (decorative — the
adjacent text already announces the state).

Once every importer has been switched, both `LoadingText` and `InlineSpinner` are
removed from `@podverse/ui`.

## Prompt

Migrate management-web callsites and remove the legacy shared components.

1. Replace `LoadingText` in every callsite below. Pass the same translation key already
   used as `children` to the new `ariaLabel` prop, and prefer the existing visual weight
   (use `size="small"` if the prior `LoadingText` rendered next to inline content; use
   the default `medium` for full-block "loading…" placeholders):
   - [apps/management-web/src/app/page.tsx](../../../../apps/management-web/src/app/page.tsx)
   - [apps/management-web/src/app/(management)/admins/AdminsListPageClient.tsx](../../../../apps/management-web/src/app/(management)/admins/AdminsListPageClient.tsx)
   - [apps/management-web/src/app/(management)/users/UsersListPageClient.tsx](../../../../apps/management-web/src/app/(management)/users/UsersListPageClient.tsx)
   - [apps/management-web/src/app/(management)/users/[id]/UserDetailPageClient.tsx](../../../../apps/management-web/src/app/(management)/users/[id]/UserDetailPageClient.tsx)
   - [apps/management-web/src/app/(management)/users/[id]/edit/EditUserPageClient.tsx](../../../../apps/management-web/src/app/(management)/users/[id]/edit/EditUserPageClient.tsx)
   - [apps/management-web/src/app/(management)/users/new/NewUserPageClient.tsx](../../../../apps/management-web/src/app/(management)/users/new/NewUserPageClient.tsx)
   - [apps/management-web/src/app/(management)/stats/StatsPageClient.tsx](../../../../apps/management-web/src/app/(management)/stats/StatsPageClient.tsx)
     (two callsites: `tc('loading')` and `ts('loadingDetail')`)
   - [apps/management-web/src/app/(management)/storage/StoragePageClient.tsx](../../../../apps/management-web/src/app/(management)/storage/StoragePageClient.tsx)
   - [apps/management-web/src/app/(management)/storage/[key]/StorageObjectDetailPageClient.tsx](../../../../apps/management-web/src/app/(management)/storage/[key]/StorageObjectDetailPageClient.tsx)
   - [apps/management-web/src/app/(management)/database/DatabaseIndexPageClient.tsx](../../../../apps/management-web/src/app/(management)/database/DatabaseIndexPageClient.tsx)
   - [apps/management-web/src/app/(management)/database/[table]/TableBrowserPageClient.tsx](../../../../apps/management-web/src/app/(management)/database/[table]/TableBrowserPageClient.tsx)
   - [apps/management-web/src/app/(management)/feed-operations/flag-status/FlagStatusPageClient.tsx](../../../../apps/management-web/src/app/(management)/feed-operations/flag-status/FlagStatusPageClient.tsx)
   - [apps/management-web/src/app/(management)/workers/WorkersPageClient.tsx](../../../../apps/management-web/src/app/(management)/workers/WorkersPageClient.tsx)
   - [apps/management-web/src/app/(management)/products/memberships/ProductMembershipsPageClient.tsx](../../../../apps/management-web/src/app/(management)/products/memberships/ProductMembershipsPageClient.tsx)
   - [apps/management-web/src/app/dashboard/database/[table]/TableBrowserPageClient.tsx](../../../../apps/management-web/src/app/dashboard/database/[table]/TableBrowserPageClient.tsx)
     (legacy duplicate path; check whether it's still routed before migrating).
2. Replace `InlineSpinner` usage in
   [apps/management-web/src/app/(management)/storage/StoragePageClient.tsx](../../../../apps/management-web/src/app/(management)/storage/StoragePageClient.tsx)
   (lines ~497, ~507):
   - From `<InlineSpinner /> {t('deleteAllCounting')}` to
     `<LoadingSpinner size="inline" decorative /> {t('deleteAllCounting')}` (and
     similar for `deleteAllInProgress`).
3. Update import statements:
   - Drop `LoadingText` and `InlineSpinner` from the `@podverse/ui` named-import list
     wherever they now go unused; add `LoadingSpinner` if it isn't already imported.
4. Confirm no remaining importers via repo-wide search:
   - `rg -nF "LoadingText"` should match only this plan's files / history (no
     `apps/**` or `packages/ui/**` matches).
   - `rg -nF "InlineSpinner"` should match only history / this plan.
5. Remove the legacy shared components:
   - Delete `packages/ui/src/components/layout/LoadingText/` (component, SCSS, barrel,
     any test files).
   - Delete `packages/ui/src/components/layout/InlineSpinner/` (component, SCSS, barrel,
     any test files).
   - Remove the four export lines (`LoadingText`, `LoadingTextProps`, `InlineSpinner`,
     `InlineSpinnerProps`) from
     [packages/ui/src/index.ts](../../../../packages/ui/src/index.ts).
6. Sanity-check that no other plan in `.llm/plans/active/` still references
   `LoadingText` as a contract (e.g.
   [.llm/plans/active/management-storage-object-detail-ux/01-storage-object-detail-page-ux.md](../../../../.llm/plans/active/management-storage-object-detail-ux/01-storage-object-detail-page-ux.md)
   mentions an "Initial metadata `LoadingText` path stays as-is"). If a referenced plan
   conflicts, update its language to `LoadingSpinner` rather than the old component.

## Acceptance Criteria

- No `LoadingText` or `InlineSpinner` imports remain in any app under `apps/**`.
- Every former `LoadingText` callsite renders the same translated string as
  `ariaLabel` on `LoadingSpinner`.
- `packages/ui/src/components/layout/LoadingText/` and
  `packages/ui/src/components/layout/InlineSpinner/` are removed.
- `packages/ui/src/index.ts` no longer exports those components.

## Verification

```bash
./scripts/nix/with-env npm run lint -w @podverse/ui -w @podverse/management-web
./scripts/nix/with-env npm run type-check -w @podverse/ui -w @podverse/management-web
./scripts/nix/with-env npm run test -w @podverse/ui
make e2e_test_management_web_report_spec SPEC=e2e/smoke.spec.ts
```
