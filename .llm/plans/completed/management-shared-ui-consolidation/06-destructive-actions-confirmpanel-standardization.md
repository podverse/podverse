# 06 - Destructive Actions ConfirmPanel Standardization

## Assessment

Management-web uses inconsistent patterns for destructive confirmations:

- `ConfirmPanel` / `ConfirmPanelActions` from `@podverse/ui` in flows such as storage and flag-status.
- `window.confirm` / `confirm()` in user and database row clients.

Standardizing on `ConfirmPanel` improves accessibility, testability, and visual consistency.

## Scope (initial)

Replace native confirm dialogs with shared panel pattern in:

- `apps/management-web/src/app/(management)/users/UsersListPageClient.tsx`
- `apps/management-web/src/app/(management)/users/[id]/UserDetailPageClient.tsx`
- `apps/management-web/src/app/(management)/database/[table]/[id]/RowDetailPageClient.tsx`

Grep for `window.confirm`, `confirm(`, and `window\.confirm` under `apps/management-web/src` after migration to catch stragglers.

## Prompt

1. For each call site, mirror the UX pattern used in `apps/management-web/src/app/(management)/storage/StoragePageClient.tsx` or `apps/management-web/src/app/(management)/feed-operations/flag-status/FlagStatusPageClient.tsx`: open state, title/body copy, primary destructive + cancel actions, loading/disabled on submit while the async action runs.
2. Use i18n keys for user-visible strings; do not introduce new hard-coded English in page bodies unless the repo already does so for that screen.
3. Ensure focus management is acceptable (no reliance on browser `confirm` focus trap); follow existing `ConfirmPanel` usage in the app.
4. Add or extend E2E coverage if a destructive path was previously untestable; otherwise rely on existing specs plus manual smoke.

## Acceptance Criteria

- No `window.confirm` / `confirm()` for user delete and database row delete flows covered by this prompt.
- Destructive actions use `ConfirmPanel` + `ConfirmPanelActions` + `Button` patterns consistent with storage/flag-status.
- Lint and type-check pass for `management-web`.

## Verification

```bash
./scripts/nix/with-env npm run lint -w @podverse/management-web
./scripts/nix/with-env npm run type-check -w @podverse/management-web
make e2e_test_management_web_report_spec SPEC=e2e/smoke.spec.ts
```
