# 10 — Verification

## Goal

Confirm the cleanup landed without behavior regressions. This step is read-only with
respect to feature source — only run lint, build, and E2E reports. (The Makefile may be
adjusted so comma-separated `SPEC` values expand to multiple Playwright files.)

## Lint and build

From repo root (use `./scripts/nix/with-env` if `node` / tooling are only on the flake
path):

```bash
npm run lint
npm run build:packages
npm run build -w apps/web
npm run build -w apps/management-web
```

## Unit tests (no DB)

```bash
npm run test:unit
```

These cover the new `@podverse/ui` helpers and components added in steps `03` (error
boundary), `04` (table column helpers + cookie helper), `05`/`06` (factory + hook),
`07` (checkbox merge + alert empty), and `08` (delete-modal formatError).

## API integration tests (optional)

```bash
npm run test:e2e:api
```

Plan steps in this set don’t touch API; skip unless you want a DB-backed sanity check
(requires `make test_deps`).

## E2E (Playwright) — scoped reports

Run from repo root. **`SPEC` may be comma-separated** (expanded to multiple Playwright
paths by `makefiles/local/Makefile.local.e2e.mk`). Paths are relative to each app’s
project dir (`apps/web` / `apps/management-web`), e.g. `e2e/smoke.spec.ts`.

Default web order for full reports lives in `makefiles/local/e2e-spec-order-web.txt`.
Current web specs include `e2e/smoke.spec.ts`, `e2e/navbar-chrome.spec.ts`,
`e2e/membership-page-trial-limitations.spec.ts`, `e2e/media-player-foundation.spec.ts`,
`e2e/media-player-overlay-hierarchy.spec.ts`, `e2e/likes-auth-and-more-menu.spec.ts`.

Example scoped web run (adjust list to match specs present on your branch):

```bash
make e2e_test_web_report_spec SPEC=e2e/smoke.spec.ts,e2e/navbar-chrome.spec.ts,e2e/membership-page-trial-limitations.spec.ts
```

Management-web (comma-separated):

```bash
make e2e_test_management_web_report_spec SPEC=e2e/admins-list.spec.ts,e2e/users-list.spec.ts,e2e/database-table-browser.spec.ts,e2e/storage-superuser-crud.spec.ts
```

Use `./scripts/nix/with-env make …` when `psql` must come from the dev shell (e.g.
`test_db_init`).

For the error-boundary work (step `03`), exercise an error path manually in dev or add
a deliberate-throw fixture spec; the existing E2E does not cover the boundary route.

## Visual checks

- Affected list pages render the same dropdowns/buttons as before (sort, type, range,
  view selector).
- The `error.tsx` and `global-error.tsx` shells render the title, message, and three
  (or two for global) action buttons.
- Loading spinners read out the same `aria-label` after the `common.loading` /
  `misc.loading` alignment in step `08`.

## Cleanup

This plan set now lives under **`.llm/plans/completed/staged-changes-dry-cleanup/`**
(including [COPY-PASTA.md](./COPY-PASTA.md)). For future multi-plan sets, use the
[`plan-completion`](../../../../.cursor/skills/plan-completion/SKILL.md) workflow to
move **`active/` → `completed/`** when all prompts are done.

## Done when

- All lint/build/unit commands above pass.
- Scoped E2E reports run successfully for the specs you intend to gate on (investigate
  failures on a case-by-case basis).
- The plan set has been moved to `.llm/plans/completed/`.
