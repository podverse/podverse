# 04 - Verification And Follow-Ups

## Goal

Verify the consolidation across `@podverse/ui`, `apps/web`, and `apps/management-web`,
and archive the plan set.

## Prompt

Run verification and close out the plan set.

1. Update plan tracking:
   - Mark all completed prompts in `COPY-PASTA.md`.
   - When all prompts are complete, move this directory from
     `.llm/plans/active/shared-loading-spinner-consolidation/` to
     `.llm/plans/completed/shared-loading-spinner-consolidation/` per
     [plan-completion](../../../../.cursor/skills/plan-completion/SKILL.md).
2. Update LLM history:
   - Append a session to
     `.llm/history/active/shared-loading-spinner-consolidation/shared-loading-spinner-consolidation-part-01.md`
     per [llm-history](../../../../.cursor/skills/llm-history/SKILL.md). Include exact
     prompt text, key decisions, files modified, verification results, and any
     follow-up notes.
3. Run code verification:
   - Lint and type-check `@podverse/ui`, `@podverse/web`, `@podverse/management-web`.
   - Run `@podverse/ui` unit tests.
   - Run scoped E2E for both apps.
4. Spot-check the standalone uses (no overlay) on web — verify-email,
   email-change-verifying, lazy-load placeholder, image placeholder, boost lists,
   switch button — to confirm visuals match.
5. Sanity grep across the repo to ensure no stragglers reference the removed
   components or app-local paths:
   - `rg -nF "LoadingText"` (should match only `.llm/`).
   - `rg -nF "InlineSpinner"` (should match only `.llm/`).
   - `rg -n "components/LoadingSpinner/"` (should be empty in `apps/**` and
     `packages/**`).

## Verification Commands

```bash
./scripts/nix/with-env npm run lint -w @podverse/ui -w @podverse/web -w @podverse/management-web
./scripts/nix/with-env npm run type-check -w @podverse/ui -w @podverse/web -w @podverse/management-web
./scripts/nix/with-env npm run test -w @podverse/ui
make e2e_test_report_scoped WEB_SPEC=e2e/smoke.spec.ts MGMT_SPEC=e2e/smoke.spec.ts
```

## Follow-Up Notes To Capture

- Whether `decorative` ended up being adopted at standalone web callsites or whether
  every callsite passed an `ariaLabel` (revisit if patterns diverge).
- Whether the legacy duplicate at
  `apps/management-web/src/app/dashboard/database/[table]/TableBrowserPageClient.tsx`
  is still routed; if not, schedule its removal as a follow-up.
- Whether
  [.llm/plans/active/management-storage-object-detail-ux/01-storage-object-detail-page-ux.md](../../../../.llm/plans/active/management-storage-object-detail-ux/01-storage-object-detail-page-ux.md)
  needed wording updates from `LoadingText` to `LoadingSpinner`.
- Any other `apps/**` modules still rendering an ad-hoc spinner that should be migrated
  later.
