# 068-ci-e2e-stub-job

**Master step:** 5.9
**Model (author + implement):** Codex 5.3
**Status:** done (superseded — no Maestro in GitHub CI)

## Scope (final decision)

- Do **not** run mobile Maestro (or other test/E2E suites) in GitHub Actions `/test`.
- Match web/server policy: CI runs lint/type-check/builds; operators run Maestro locally
  (`npm run mobile:e2e:test`) and confirm reports before merge.
- Mobile ESLint is already included in `npm run lint` via `scripts/ci/lint-with-summary.mjs`
  (`lint:mobile` → `apps/mobile`).
- No `/testmobile` slash command. No `mobile-e2e-stub.yml` workflow.

## Acceptance criteria

- `/test` (`ci.yml`) does not invoke Maestro or `mobile:e2e:test`
- `npm run lint` covers `apps/mobile`
- Isolation from `publish-staging.yml` / `publish-main.yml` (unchanged)

## Verification

```bash
test ! -f .github/workflows/mobile-e2e-stub.yml
rg -n 'lint:mobile|MOBILE_LINT' scripts/ci/lint-with-summary.mjs
rg -n 'maestro|mobile:e2e' .github/workflows/ci.yml || true
```
