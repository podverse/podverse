# shared-ui-link-promotion

**Started:** 2026-05-07  
**Author:** Agent  
**Context:** Shared UI Link primitive in `@podverse/ui`.

---

### Session 1 - 2026-05-07

#### Prompt (Developer)

@podverse/.llm/plans/active/shared-ui-link-promotion/COPY-PASTA.md:13

#### Key Decisions

- Added **`Link`** under **`packages/ui/src/components/navigation/Link/`** with **`LinkRenderProps`**, **`LinkProps`**, **`LinkComponent`** / **`AnchorComponent`** render props (defaults plain `<a>`), **`fullPageLoad`** branch, disabled **`href`** **`span`**, and **`button`** when **`href`** omitted. SCSS ported from web **`Link.module.scss`** tokens.
- No **`next/link`** or **`@podverse/helpers`** in **`packages/ui`** per plan.
- **`packages/ui/src/index.ts`** exports **`Link`**, **`LinkProps`**, **`LinkRenderProps`** after **`ActionLink`**.
- **`01-shared-ui-link.md`** moved to **`.llm/plans/completed/shared-ui-link-promotion/`**; **`COPY-PASTA.md`** updated.

#### Files Created/Modified

- `packages/ui/src/components/navigation/Link/Link.tsx`
- `packages/ui/src/components/navigation/Link/Link.module.scss`
- `packages/ui/src/components/navigation/Link/Link.test.tsx`
- `packages/ui/src/components/navigation/Link/index.ts`
- `packages/ui/src/index.ts`
- `.llm/plans/active/shared-ui-link-promotion/COPY-PASTA.md`
- `.llm/plans/completed/shared-ui-link-promotion/01-shared-ui-link.md` (moved from active)

---

### Session 2 - 2026-05-07

#### Prompt (Developer)

@podverse/.llm/plans/active/shared-ui-link-promotion/COPY-PASTA.md:19

#### Key Decisions

- Replaced **`apps/web/src/components/Link/Link.tsx`** with a **`'use client'`** thin wrapper: **`@podverse/ui`** **`Link`**, **`getSafeLinkHref`**, **`LinkComponent`** = **`next/link`** matching **`LinkRenderProps`**.
- **Blocked** unsafe hrefs: pass **`href={href}`** (raw) with **`disabled`** so shared **`Link`** uses the **disabled `span`** branch (a href-less `disabled` call would render a **button**).
- Removed **`apps/web/src/styles/components/Link/Link.module.scss`**; styling comes from shared **`Link`**. No callsite edits.
- Updated **`.llm/plans/completed/shared-ui-component-consolidation/04-high-risk-feasibility-and-wrappers.md`** for the new **Link** policy; **`02-web-migration.md`** moved to **`.llm/plans/completed/shared-ui-link-promotion/`**; **`COPY-PASTA.md`** marks step 02 done.

#### Files Created/Modified

- `apps/web/src/components/Link/Link.tsx`
- `apps/web/src/styles/components/Link/Link.module.scss` (deleted)
- `.llm/plans/completed/shared-ui-component-consolidation/04-high-risk-feasibility-and-wrappers.md`
- `.llm/plans/completed/shared-ui-link-promotion/02-web-migration.md` (moved from active)
- `.llm/plans/active/shared-ui-link-promotion/COPY-PASTA.md`

---

### Session 3 - 2026-05-07

#### Prompt (Developer)

@podverse/.llm/plans/active/shared-ui-link-promotion/COPY-PASTA.md:25

#### Key Decisions

- Ran plan **03** verification: **`@podverse/ui`** + **`@podverse/web`** lint, type-check, **`build:packages`**, **`build -w @podverse/web`**, **`npm run test -w @podverse/ui`** — all passed. Use **`-w @podverse/web`** instead of **`apps/web`** so npm does not also run **`web-sidecar`** (missing scripts).
- **`Link.test.tsx`:** **`toMatchObject`** instead of indexing **`mock.calls[0][0]`** — fixes **`TS2532`** under strict **`tsc`**.
- **`apps/web` Link:** ESLint **simple-import-sort** — separate **`import type`** from **`@podverse/ui`** before the value import.
- **`rg`** scope for Link work: **`packages/ui/src/components/navigation/Link`** has no **`next/`** or **`@podverse/helpers`**; other **`packages/ui`** files may still import them (pre-existing).
- **E2E** not completed in this environment: **`test_db_init`** failed (**`mapfile: command not found`** in **`run-linear-migrations.sh`** when **`make`** uses a non-bash shell). User should run **`make e2e_test_web_report_spec`** locally. Specs used in the plan: **`e2e/smoke.spec.ts`**, **`e2e/navbar-chrome.spec.ts`**, **`e2e/likes-auth-and-more-menu.spec.ts`** (substitutes for non-existent home/contact/podcast-detail specs).
- Plan set **`.llm/plans/active/shared-ui-link-promotion/`** moved to **`.llm/plans/completed/shared-ui-link-promotion/`** (all three prompts done).

#### Files Created/Modified

- `packages/ui/src/components/navigation/Link/Link.test.tsx`
- `apps/web/src/components/Link/Link.tsx` (import order)
- `.llm/plans/completed/shared-ui-link-promotion/03-verification-and-followups.md`
- `.llm/plans/completed/shared-ui-link-promotion/COPY-PASTA.md`
- `.llm/plans/completed/shared-ui-link-promotion/00-EXECUTION-ORDER.md`
