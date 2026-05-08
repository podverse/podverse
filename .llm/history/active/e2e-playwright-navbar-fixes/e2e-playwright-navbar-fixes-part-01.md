# e2e-playwright-navbar-fixes

## Metadata

- Started: 2026-05-07
- Author: Cursor agent

## Sessions

### Session 1 - 2026-05-07

#### Prompt (Developer)

Debug: `e2e_test_playwright` failures (Podverse)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- **Web navbar E2E:** `.searchLink` is mobile-only in `@podverse/ui` NavBar styles; wide test now
  asserts Account + Back + Forward only; narrow test asserts Search + Open menu.
- **Management navbar E2E:** Role line renders in dropdown meta (`role="presentation"`), not as
  `menuitem`; assert with `getByText(/Role:/)`.
- **Playwright management-api env:** append `BUCKET_PROVIDER=` so E2E does not inherit shell bucket
  credentials (`storage-disabled` expects GET `/storage` → `enabled: false`).

#### Files Created/Modified

- M `apps/web/e2e/navbar-chrome.spec.ts`
- M `apps/management-web/e2e/navbar-chrome.spec.ts`
- M `apps/management-web/playwright.config.ts`
- A `.llm/history/active/e2e-playwright-navbar-fixes/e2e-playwright-navbar-fixes-part-01.md`

#### Verification

- `./scripts/nix/with-env make e2e_test_web_report_spec SPEC=e2e/navbar-chrome.spec.ts` — pass
- `./scripts/nix/with-env make e2e_test_management_web_report_spec SPEC=e2e/navbar-chrome.spec.ts,e2e/storage-disabled.spec.ts` — pass

### Session 2 - 2026-05-07

#### Prompt (Developer)

split that test out so we don't see the skipped noise

#### Key Decisions

- Moved storage superuser list/chrome test to **`storage-superuser-crud-enabled.spec.ts`**; default
  **`playwright.config.ts`** uses **`testIgnore`** so `npm test` / `e2e_test_playwright` no longer
  reports a skip.
- Added **`playwright.storage-enabled.config.ts`** with fake **`aws-s3`** bucket env
  (`buildManagementApiEnvFakeAwsForPlaywright`), **`test:e2e:storage-enabled`** npm script, and
  **`make e2e_test_management_web_storage_enabled`**.
- Shared env strings in **`playwright.management-api-env.ts`** to avoid drift between configs.

#### Files Created/Modified

- A `apps/management-web/playwright.management-api-env.ts`
- A `apps/management-web/playwright.storage-enabled.config.ts`
- A `apps/management-web/e2e/storage-superuser-crud-enabled.spec.ts`
- D `apps/management-web/e2e/storage-superuser-crud.spec.ts`
- M `apps/management-web/playwright.config.ts`
- M `apps/management-web/package.json`
- M `makefiles/local/Makefile.local.e2e.mk`
- M `makefiles/local/e2e-spec-order-management-web.txt`
- M `.cursor/skills/e2e-page-tests/SKILL.md`

#### Verification

- `./scripts/nix/with-env make e2e_test_management_web_storage_enabled` — pass
