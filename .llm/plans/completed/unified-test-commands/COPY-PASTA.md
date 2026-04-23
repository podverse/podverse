# Unified test commands — execution order and copy-pasta

Run phases **in order** (Metaboost phase 01 can run in parallel with Podverse 02+ only where there is no shared file conflict — usually execute Metaboost first for script naming consistency).

## Order

1. ~~[`01-metaboost-npm-and-make-wrappers.md`](./01-metaboost-npm-and-make-wrappers.md)~~ **COMPLETED**
2. ~~[`02-podverse-makefile-test-deps-and-ports.md`](./02-podverse-makefile-test-deps-and-ports.md)~~ **COMPLETED**
3. ~~[`03-podverse-check-requirements-and-run-workspaces.md`](./03-podverse-check-requirements-and-run-workspaces.md)~~ **COMPLETED**
4. ~~[`04-podverse-api-vitest-integration-setup.md`](./04-podverse-api-vitest-integration-setup.md)~~ **COMPLETED**
5. ~~[`05-podverse-playwright-and-seed-foundations.md`](./05-podverse-playwright-and-seed-foundations.md)~~ **COMPLETED**

Master reference: [`00-master-plan.md`](./00-master-plan.md)

## CI reminder (Podverse)

After implementing tests, Podverse [`.github/workflows/ci.yml`](../../../../.github/workflows/ci.yml) includes a **skipped “Test” step** and PR success comment row (mirror Metaboost): CI does **not** run the full suite; maintainers run `make test_deps` and npm test targets locally before merge.

---

## Metaboost — verify after phase 01

```bash
cd /path/to/metaboost
make test_deps
npm run test:unit
npm run test:e2e:api
# Optional full chain:
npm test
```

---

## Podverse — verify after phases 02–04

```bash
cd /path/to/podverse
make test_deps
node scripts/check-test-requirements.mjs
npm run test:unit
npm run test -w apps/api
npm run test -w apps/management-api
```

---

## Podverse — verify after phase 05

```bash
cd /path/to/podverse
make test_deps
make e2e_seed    # once implemented
npm run test:e2e -w apps/web
npm run test:e2e -w apps/management-web
# Report pipeline (must match Metaboost-style HTML + step screenshots):
make e2e_test_report   # once implemented — see phase 05
# or: npm run test:e2e:web:reports / npm run test:reports
```

---

## Port coexistence quick check (both repos)

With **Metaboost** and **Podverse** test stacks up:

```bash
docker ps --format '{{.Names}}\t{{.Ports}}' | rg 'metaboost_test_|podverse_test_'
```

Expect **no overlapping** published ports between the two (see [`00-master-plan.md`](./00-master-plan.md) tables).

---

## Agent prompt stubs

**Metaboost phase 01**

> Implement root npm scripts `test:unit`, `test:e2e:api`, `test:e2e:web`, `test:e2e:web:reports`, `test:reports`, and chain `npm test` per `.llm/plans/active/unified-test-commands/01-metaboost-npm-and-make-wrappers.md`. Preserve or migrate current `npm test` behavior; update AGENTS.md Testing.

**Podverse Makefile**

> Add `makefiles/local/Makefile.local.test.mk` with Podverse-only ports 5732/6679 and containers `podverse_test_*` per `.llm/plans/active/unified-test-commands/02-podverse-makefile-test-deps-and-ports.md`.

**Podverse scripts**

> Add `scripts/check-test-requirements.mjs` and extend `scripts/ci/run-workspaces.mjs` with `--exclude` per `.llm/plans/active/unified-test-commands/03-podverse-check-requirements-and-run-workspaces.md`.

**Podverse API tests**

> Align `apps/api` and `apps/management-api` Vitest setup with Metaboost patterns and port 5732 per `.llm/plans/active/unified-test-commands/04-podverse-api-vitest-integration-setup.md`.

**Podverse Playwright**

> Implement Playwright + Makefile E2E + **Metaboost-equivalent HTML report pipeline** (`e2e-html-steps-reporter`, `e2e_test_report`, env vars) per `.llm/plans/active/unified-test-commands/05-podverse-playwright-and-seed-foundations.md`. Minimal smoke spec count is OK; report machinery must align with Metaboost.

**Podverse CI**

> Ensure `.github/workflows/ci.yml` has skipped Test step + success comment row per review plan (already applied if present in repo).
