# 05 - Verification And Follow-Ups

## Goal

Verify any completed consolidation prompts and keep plan/history state accurate.

## Prompt

Run verification and close out the completed plan items.

1. Update plan tracking:
   - Mark completed prompts in `COPY-PASTA.md`.
   - If all prompts are complete, move this directory from `.llm/plans/active/management-shared-ui-consolidation/` to `.llm/plans/completed/management-shared-ui-consolidation/`.
2. Update LLM history:
   - Append a session to `.llm/history/active/management-shared-ui-consolidation/management-shared-ui-consolidation-part-01.md`.
   - Include exact prompt text, key decisions, files modified, verification results, and any deferred candidates.
3. Run code verification for implemented prompts:
   - Lint and type-check affected workspaces.
   - Run `@podverse/ui` tests if shared components/hooks changed.
   - Run targeted management-web E2E for visible settings/menu/nav/login changes.

## Verification Commands

```bash
./scripts/nix/with-env npm run lint -w @podverse/ui -w @podverse/web -w @podverse/management-web
./scripts/nix/with-env npm run type-check -w @podverse/ui -w @podverse/web -w @podverse/management-web
./scripts/nix/with-env npm run test -w @podverse/ui
```

Management-web E2E (`make e2e_test_management_web_report_spec`) passes a single `SPEC` string to Playwright as **one** argument; a comma-separated list is **not** resolved as multiple files. Run one spec per invocation (or use a single glob). Example:

```bash
./scripts/nix/with-env make e2e_test_management_web_report_spec SPEC=e2e/smoke.spec.ts
./scripts/nix/with-env make e2e_test_management_web_report_spec SPEC=e2e/settings-page.spec.ts
```

## Verification record (2026-05-06)

| Step | Result |
| --- | --- |
| Lint `@podverse/ui`, `@podverse/web`, `@podverse/management-web` | Pass |
| Type-check same workspaces | Pass |
| `npm run test -w @podverse/ui` (Vitest) | Pass (29 tests) |
| E2E `e2e/smoke.spec.ts` | Pass |
| E2E `e2e/settings-page.spec.ts` | Pass |

## Captured follow-up notes

- **Web `FormDropdown`:** Removed from `apps/web`; web uses `@podverse/ui` `FormDropdown` (no local wrapper file under `apps/web/src/components/Form/`).
- **Account menu:** Convergence covered **both** apps — `ManagementUserMenu` (management-web) and `NavBarDropdownButton` (web) on shared `DropdownMenu`.
- **Nav brand/shell:** **Implemented** — `NavBar` gained `appearance="management" \| "web"`; management layout uses `appearance="web"`; web keeps its full local `NavBar` composition.
- **`06` native confirm:** **`window.confirm` / `confirm(`** not found under `apps/management-web/src` after targeted migrations (grep). Targeted user/database delete flows use `ConfirmPanel`.
- **`07` session guard:** Hook adopted for **settings, dashboard (management route), storage** list only. **Deferred follow-up:** `StatsPageClient`, `WorkersPageClient`, `StorageObjectDetailPageClient`, login `page.tsx`, and `apps/dashboard/DashboardPageClient.tsx` still call `getCurrentUser()` with inline `useEffect` + redirect patterns.
