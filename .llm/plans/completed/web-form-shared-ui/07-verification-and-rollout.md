# 07 — Verification and rollout

## Prompt (Agent)

Execute **phase 07**: run lint/build checks, add or update Playwright coverage for touched flows per
`feature-implementation-testing`, document verification commands per `response-ending-make-verify`,
update `.llm/history/active/`, and move this plan set to `completed/` when done.

## Automated checks (repo root)

```bash
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run build -w apps/web
./scripts/nix/with-env npm run build -w apps/management-web
```

Use `./scripts/nix/with-env` for any Node tooling per `nix-terminal-wrapper` rule.

## Tests

- **`packages/ui`:** `npm run test -w @podverse/ui` (or root script if wired).
- **API:** Not required unless endpoints changed (not expected for pure UI move).
- **E2E:** Use **Make** targets only per `e2e-run-with-make-only` — favor scoped specs touching forms:

```bash
make e2e_test_web_report_spec SPEC=e2e/<relevant>.spec.ts
make e2e_test_management_web_report_spec SPEC=e2e/<relevant>.spec.ts
```

Pick specs covering login, settings, checkout/membership, clip edit, playlist edit, boost donate, and
management CRUD if those screens changed in phase 06.

## Plan lifecycle

When phase 07 passes:

1. Update [`COPY-PASTA.md`](./COPY-PASTA.md) checkboxes to complete.
2. Move numbered files `01`–`07` and this directory’s metadata to
   `.llm/plans/completed/web-form-shared-ui/`.
3. Follow [`plan-completion`](../../../../.cursor/skills/plan-completion/SKILL.md) if skill differs
   from repo `plan-lifecycle` rule — align with moving the **whole** set when the last prompt
   completes.

## Documentation (optional)

If `packages/ui` gains a large form surface, add a short pointer in root `AGENTS.md` or package doc
**only** if maintainers want it — keep within documentation-conventions skill.

## Completed — 2026-05-06

Agent run:

- `./scripts/nix/with-env npm run lint` — passed after `prettier:write` on files flagged by `prettier:check`
  (`packages/ui` touched by formatting drift).
- `./scripts/nix/with-env npm run build:packages` — passed.
- `./scripts/nix/with-env npm run build -w apps/web` — passed.
- `./scripts/nix/with-env npm run build -w apps/management-web` — passed.
- `./scripts/nix/with-env npm run test -w @podverse/ui` — passed (84 tests).

Playwright: `make e2e_test_web_report_spec SPEC=e2e/smoke.spec.ts` did **not** complete in the agent
environment (`psql` missing during `test_db_init`). Run the scoped Make targets locally where Postgres
client tools and `make test_deps` / DB init succeed.

No new E2E specs were added: existing smoke and feature specs already cover the migrated surfaces;
call sites remain label/role-compatible (`TextInput` / `FormTextArea` eyebrows vs prior `Label` text).

Plan set archived under `.llm/plans/completed/web-form-shared-ui/` (all phases **01**–**07**, `COPY-PASTA`,
`00-SUMMARY`, `00-EXECUTION-ORDER`).

Follow-up (same phase): root **`prettier:check`** also required **`Banner.tsx`** / **`Banner.test.tsx`** under
`packages/ui/src/components/layout/Banner/` — formatted with Prettier; **`npm run lint`** then completed with
typecheck, ESLint, and Prettier all passing. Index cleanup: **`git rm --cached`** on
`apps/web/src/styles/components/Banner/MembershipExpiredBanner.module.scss` after the file was removed from disk
but remained tracked.
