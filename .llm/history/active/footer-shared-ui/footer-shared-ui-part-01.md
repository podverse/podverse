## Footer shared UI (plans)

**Started:** 2026-05-07  
**Context:** Promote `FooterBrand` / `FooterCopyright` into `@podverse/ui`; plan files only this session.

### Session 1 - 2026-05-07

#### Prompt (Developer)

create and save the plan files locally

#### Key Decisions

- Saved an executable plan set under `.llm/plans/active/footer-shared-ui/` with `00-SUMMARY.md`,
  `00-EXECUTION-ORDER.md`, `COPY-PASTA.md`, and numbered prompts `01`–`03` for packages/ui,
  apps/web + i18n, and verification (scoped E2E uses `e2e/smoke.spec.ts`).

#### Files Created/Modified

- `.llm/plans/active/footer-shared-ui/00-SUMMARY.md`
- `.llm/plans/active/footer-shared-ui/00-EXECUTION-ORDER.md`
- `.llm/plans/active/footer-shared-ui/COPY-PASTA.md`
- `.llm/plans/active/footer-shared-ui/01-packages-ui-footer-brand-and-copyright.md`
- `.llm/plans/active/footer-shared-ui/02-apps-web-wire-i18n-and-cleanup.md`
- `.llm/plans/active/footer-shared-ui/03-verification.md`

### Session 2 - 2026-05-07

#### Prompt (Developer)

Implement .llm/plans/active/footer-shared-ui/01-packages-ui-footer-brand-and-copyright.md.

#### Key Decisions

- Added `FooterBrand` (client, `Image`, optional `LinkComponent`, defaults aligned with `ActionLink`)
  and `FooterCopyright` (`FaRegCopyright`, required `label` + `href`) under
  `packages/ui/src/components/layout/FooterLayout/` with SCSS ported from web footer styles.
- Exported types and components from `packages/ui/src/index.ts` (alphabetized Footer\* block).
- Archived completed plan to `.llm/plans/completed/footer-shared-ui/01-packages-ui-footer-brand-and-copyright.md`.

#### Files Created/Modified

- `packages/ui/src/components/layout/FooterLayout/FooterBrand.tsx`
- `packages/ui/src/components/layout/FooterLayout/FooterBrand.module.scss`
- `packages/ui/src/components/layout/FooterLayout/FooterBrand.test.tsx`
- `packages/ui/src/components/layout/FooterLayout/FooterCopyright.tsx`
- `packages/ui/src/components/layout/FooterLayout/FooterCopyright.module.scss`
- `packages/ui/src/components/layout/FooterLayout/FooterCopyright.test.tsx`
- `packages/ui/src/index.ts`
- `.llm/plans/active/footer-shared-ui/COPY-PASTA.md`
- `.llm/plans/completed/footer-shared-ui/01-packages-ui-footer-brand-and-copyright.md` (moved from active)

### Session 3 - 2026-05-07

#### Prompt (Developer)

Implement .llm/plans/active/footer-shared-ui/02-apps-web-wire-i18n-and-cleanup.md.

#### Key Decisions

- Wired `Footer.tsx` to `@podverse/ui` `FooterBrand` / `FooterCopyright` with `useConfig`,
  `useLocalSettings`, `getBrandLogoSrc`, `NextLink` from `next/link` for shared primitives; nav/social
  keep app `Link`.
- Added `misc.open_source` in all web `i18n/originals` plus matching empty keys in `i18n/overrides`
  for es, fr, el-GR.
- Removed local `FooterBrand` / `FooterCopyright` components and their SCSS modules.
- Archived plan `02-apps-web-wire-i18n-and-cleanup.md` to `.llm/plans/completed/footer-shared-ui/`.

#### Files Created/Modified

- `apps/web/src/components/Footer/Footer.tsx`
- `apps/web/i18n/originals/en-US.json`
- `apps/web/i18n/originals/es.json`
- `apps/web/i18n/originals/fr.json`
- `apps/web/i18n/originals/el-GR.json`
- `apps/web/i18n/overrides/es.json`
- `apps/web/i18n/overrides/fr.json`
- `apps/web/i18n/overrides/el-GR.json`
- `.llm/plans/active/footer-shared-ui/COPY-PASTA.md`
- `.llm/plans/completed/footer-shared-ui/02-apps-web-wire-i18n-and-cleanup.md` (moved from active)

#### Files Deleted

- `apps/web/src/components/Footer/FooterBrand.tsx`
- `apps/web/src/components/Footer/FooterCopyright.tsx`
- `apps/web/src/styles/components/Footer/FooterBrand.module.scss`
- `apps/web/src/styles/components/Footer/FooterCopyright.module.scss`

### Session 4 - 2026-05-07

#### Prompt (Developer)

Implement .llm/plans/active/footer-shared-ui/03-verification.md.

#### Key Decisions

- Ran repo-wide `./scripts/nix/with-env npm run lint` (after Prettier fixes), `build:packages`,
  `npm run build -w apps/web`, and `npm run test -w @podverse/ui` — all succeeded.
- Applied Prettier to five files flagged by `prettier:check` (including `Footer.tsx` and footer-related
  UI tests; also `AddByRSSListClient.tsx` and `LazyLoadPlaceholder.test.tsx` which were already out of
  format).
- **E2E:** `make e2e_test_web_report_spec SPEC=e2e/smoke.spec.ts` did not complete here (`psql: command not
found` during `test_db_init`); run the same make target locally where Postgres client tools are on
  `PATH`.
- Moved remaining plan files from `.llm/plans/active/footer-shared-ui/` into
  `.llm/plans/completed/footer-shared-ui/` and marked prompt 03 complete in `COPY-PASTA.md`.

#### Files Created/Modified

- `apps/web/src/components/Footer/Footer.tsx` (Prettier import wrapping)
- `apps/web/src/components/AddByRSS/List/AddByRSSListClient.tsx` (Prettier only)
- `packages/ui/src/components/layout/FooterLayout/FooterBrand.test.tsx` (Prettier only)
- `packages/ui/src/components/layout/FooterLayout/FooterCopyright.test.tsx` (Prettier only)
- `packages/ui/src/components/layout/LazyLoadPlaceholder/LazyLoadPlaceholder.test.tsx` (Prettier only)
- `.llm/plans/completed/footer-shared-ui/COPY-PASTA.md`
- `.llm/plans/completed/footer-shared-ui/00-EXECUTION-ORDER.md`
- `.llm/plans/active/footer-shared-ui/` — removed after merging into completed (plan set archived)
