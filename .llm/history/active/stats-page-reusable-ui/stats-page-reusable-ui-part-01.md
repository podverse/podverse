# Stats page reusable UI — history

**Started:** 2026-05-06  
**Author:** Agent  
**Context:** Refactor management-web stats page to use `@podverse/ui` (`ButtonTabs`, `Table`, `Card`, `StatSummaryGrid`), extend `Table.Row` for clickable/selected rows, add theme token for selected row background, Vitest in `packages/ui`, Playwright E2E for stats.

---

### Session 1 — 2026-05-06

#### Prompt (Developer)

Implement the plan as specified (stats UI reuse refactor). Do NOT edit the plan file… Don't stop until you have completed all the to-dos.

#### Key Decisions

- Replaced page-local tabs, range controls, table shell, and detail panel styles with `ButtonTabs`, `Table`/`Table.ScrollContainer`, `Card`, `StatSummaryGrid`.
- Extended `Table.Row` with `selected`, spread row HTML attributes, `clickable`/`selected` styles; added `--table-row-selected-bg` per theme in `_themes.scss`.
- Added `StatSummaryGrid` under `packages/ui/src/components/stats/StatSummaryGrid/`.
- Added `vitest` + RTL tests for `Table.Row` and `StatSummaryGrid`; new E2E `apps/management-web/e2e/stats-page.spec.ts` with mocked `/stats/top/**` and `/stats/detail/**`.
- Ran `lint:fix` for import sort (`StatsPageClient`, UI tests; also fixed `ProductMembershipsPageClient` import order from same lint run).

#### Files Created/Modified

- `packages/ui/src/styles/_themes.scss`
- `packages/ui/src/components/table/Table/Table.tsx`
- `packages/ui/src/components/table/Table/Table.module.scss`
- `packages/ui/src/components/table/Table/index.ts`
- `packages/ui/src/components/table/Table/Table.test.tsx`
- `packages/ui/src/components/stats/StatSummaryGrid/*`
- `packages/ui/src/index.ts`
- `packages/ui/package.json`
- `packages/ui/vitest.config.ts`
- `apps/management-web/src/app/(management)/stats/StatsPageClient.tsx`
- `apps/management-web/src/app/(management)/stats/page.module.scss`
- `apps/management-web/e2e/stats-page.spec.ts`
- `apps/management-web/src/app/(management)/products/memberships/ProductMembershipsPageClient.tsx` (lint:fix import order)

---

### Session 2 — 2026-05-06

#### Prompt (Developer)

continue

#### Key Decisions

- Completed remaining validation: UI Vitest passing; ESLint clean after `lint:fix`; added E2E spec content and finalized history.

#### Files Created/Modified

- `.llm/history/active/stats-page-reusable-ui/stats-page-reusable-ui-part-01.md`
- `apps/management-web/e2e/stats-page.spec.ts` (E2E added/verified in this session)
