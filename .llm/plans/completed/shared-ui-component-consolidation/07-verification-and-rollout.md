# 07 — Verification and rollout

## Prompt (Agent)

Execute **phase 07**: verify each merged migration from phases 02–05. Update `.llm/history/active/`
per `llm-history-tracking`. Move completed numbered plan files to
`.llm/plans/completed/shared-ui-component-consolidation/` when **all** phases done; keep
`COPY-PASTA.md` and `00-*` in `active/` until then (per plan lifecycle).

## Automated checks (from monorepo root)

Use Nix wrapper in sandboxed environments:

```bash
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run test:unit
```

## API / DB tests (if api touched)

```bash
./scripts/nix/with-env npm run test:e2e:api
```

## E2E (UI changes — use Make targets only)

Pick specs that cover touched surfaces (examples—adjust to actual specs in repo):

```bash
make e2e_test_web_report_spec SPEC=e2e/smoke.spec.ts
make e2e_test_management_web_report_spec SPEC=e2e/smoke.spec.ts
```

For cross-app:

```bash
make e2e_test_report_scoped WEB_SPEC=e2e/<web>.spec.ts MGMT_SPEC=e2e/<mgmt>.spec.ts
```

## Rollout order

1. `packages/ui` unit tests + any new Storybook stories.
2. `apps/web` wrapper swaps (low risk first).
3. `apps/management-web` convergence.
4. Remove dead SCSS / dead exports / unused deps (e.g. orphan `react-hot-toast`).

## Completion checklist

- [x] `COPY-PASTA.md` all items checked.
- [x] Numbered files + `COPY-PASTA.md` + `00-*` moved to `completed/` mirror path (plan set archived).
- [x] No regressions in a11y roles for nav, menus, dialogs touched — covered by `@podverse/ui` unit tests and smoke E2E.

## Completed (2026-05-06)

Automated verification (repo root, Nix wrapper where needed):

| Step | Result |
| ---- | ------ |
| `npm run build:packages` | Passed |
| `npm run prettier:write` then `npm run lint` | Passed (full type-check, ESLint, Prettier) |
| `npm run test:unit` | Passed (includes `packages/ui`, `apps/web`, `apps/management-web` Vitest) |
| `./scripts/nix/with-env make e2e_test_report_scoped WEB_SPEC=e2e/smoke.spec.ts MGMT_SPEC=e2e/smoke.spec.ts` | Passed |

API Vitest (`npm run test:e2e:api`) not required — phases 02–05 did not change API routes.

E2E note: run **`make`** via `./scripts/nix/with-env` when `psql` is not on the bare PATH (linear migrations).
