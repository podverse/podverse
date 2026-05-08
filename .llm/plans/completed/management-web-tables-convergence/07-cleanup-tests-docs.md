# Phase 07 — Cleanup, tests, docs, rollout

## Goal

After every page is migrated (phases 04 / 05 / 06), drop now-unused helpers, add the **remaining**
`.cursor` skills (others landed in phase 03), finalize e2e, update history, and move the plan set to
`completed/`.

## Deliverables

1. **Drop unused app-local helpers:**
   - `apps/management-web/src/app/(management)/.../*` — delete dead spinner / empty / sort
     helpers replaced by wrappers (e.g. `SORT_ARROW_ASC` / `SORT_ARROW_DESC` constants if
     unused; ad-hoc `EmptyStateText` call sites; per-page Pagination wiring).
   - Remove the duplicate `dashboard/database/[table]/TableBrowserPageClient.tsx` if not
     already done in phase 04.

2. **Permissions matrix:**
   - In
     [`NewAdminPageClient.tsx`](../../../../apps/management-web/src/app/(management)/admins/new/NewAdminPageClient.tsx)
     and
     [`EditAdminPageClient.tsx`](../../../../apps/management-web/src/app/(management)/admins/[id]/edit/EditAdminPageClient.tsx),
     adopt `Table.SortableHeaderCell` only if columns become sortable (otherwise keep
     `Table.HeaderCell`). The matrix continues to use the raw `Table` primitive.

3. **Skills (mirror metaboost) — phase 07 only:**

   - [`tables-support-sorting/SKILL.md`](../../../../.cursor/skills/tables-support-sorting/SKILL.md)
   - [`table-sort-defaults/SKILL.md`](../../../../.cursor/skills/table-sort-defaults/SKILL.md)
   - [`sort-prefs-cookie-by-path/SKILL.md`](../../../../.cursor/skills/sort-prefs-cookie-by-path/SKILL.md)

   **`crud-tables-resources`**, **`.cursor/rules/management-web-tables.mdc`**, and **`PACKAGES-UI.md` Table family**
   ship in **phase 03** — do not duplicate here.

4. **Rule cross-links:** Ensure `.cursor/rules/management-web-tables.mdc` (from phase 03) references
   all four skills above plus **`crud-tables-resources`**.

5. **i18n cleanup:**
   - Run `npm run lint:i18n` (or repo equivalent) and prune keys no longer referenced.
   - Confirm overrides files match `originals/en-US.json` structure.

6. **E2E:**
   - Full regression pass after all migrations.
   - Catch-up tests from phase 04 net-new specs if not merged incrementally.

7. **History:**
   - Update
     `.llm/history/active/management-web-tables-convergence/management-web-tables-convergence-part-01.md`
     across all phases.
   - When all numbered phases are complete, move every `0?-*.md` plus `00-*.md` and
     `COPY-PASTA.md` to `.llm/plans/completed/management-web-tables-convergence/` per
     [`plan-lifecycle`](../../../../.cursor/rules/plan-lifecycle.mdc).

## Verification

```bash
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run build -w apps/management-web
make e2e_test_management_web_report
```

## Out of scope

- Backend list-API normalization.
- `apps/web` table consolidation (separate plan set later).
- Removing app-local components that are still used by non-table pages.
