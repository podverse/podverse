# Plan 09 — Verification and merge gates

## Objective

Run full **build, lint, and test** gates; execute final **grep guards**; move the plan set to `completed/`. This is the merge-readiness checkpoint for the TypeORM v1 upgrade.

## Prerequisites

Plans 01–08 complete. All prior verification gates passed.

## Part A — Build matrix

From repo root:

```bash
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run build -w apps/api
./scripts/nix/with-env npm run build -w apps/management-api
./scripts/nix/with-env npm run build -w apps/workers
./scripts/nix/with-env npm run build -w @podverse/parser
```

Optional satellite builds if wired in CI:

```bash
./scripts/nix/with-env npm run build -w tools/test-assets 2>/dev/null || true
```

All must exit 0.

## Part B — Lint

```bash
./scripts/nix/with-env npm run lint
```

Fix any remaining issues — do not disable rules for TypeORM upgrade debt.

## Part C — Unit tests

```bash
./scripts/nix/with-env npm run test:unit
./scripts/nix/with-env npm run test -w @podverse/orm
```

Pay attention to:

- `packages/orm/src/services/archiver.test.ts`
- `packages/orm/src/services/queue/queueResourceListGuardrails.test.ts`
- `packages/orm/src/services/stats/baseStatsTrackEvent.create.test.ts`
- `packages/orm/src/services/stats/statsTrackAccountGuid.test.ts`

## Part D — API integration tests

Requires test infrastructure:

```bash
make test_deps
./scripts/nix/with-env npm run test:e2e:api
```

**High-value integration coverage:**

- Auth paths (`apps/api/src/lib/auth/`) — relation loads after object syntax
- Queue/playlist controllers — plan 06 hotspots
- Entity metadata regression: `apps/api/src/test/orm-account-set-password-metadata.test.ts`
  - Re-run after v1 bump; fix Vitest duplicate-module metadata issue if it resurfaces

If integration failures are queue/item/channel related, fix before merge — do not skip.

## Part E — Final grep gates (all must pass)

From repo root:

```bash
# String find options removed
rg "relations: \[|select: \[" --glob '*.ts' --glob '!**/.llm/**'

# Legacy global TypeORM APIs
rg "getConnection|createConnection|getRepository\(" --glob '*.ts' \
  --glob '!**/.llm/**' \
  | rg -v 'dataSource\.getRepository|AppDataSource.*\.getRepository|getDataSource.*\.getRepository'

# naming-strategies package removed
rg "typeorm-naming-strategies" --glob '!**/.llm/**' --glob '!package-lock.json'

# Pre-v1 version pins in package.json
rg '"typeorm".*"\\^0\\.3' package.json packages apps tools

# String entity findOne
rg "findOne\('" --glob '*.ts' --glob '!**/.llm/**'

# Repo-authored legacy TypeORM narrative (exclude lockfile)
rg -i 'typeorm.*0\.3|before v1|legacy.*typeorm|NamingStrategyV03|legacy-naming-strategies' \
  --glob '!**/.llm/**' --glob '!package-lock.json'
```

Expected: **zero matches** for each (or only documented exclusions below).

### Permanent exclusions

| Location | Reason |
| -------- | ------ |
| `package-lock.json` | Historical resolved versions until regen — should be clean after plan 02 |
| `.llm/plans/completed/**` | Archived plans — do not rewrite history |
| Upstream URLs in comments linking to typeorm.io upgrade docs | OK if not implying Podverse still on 0.3 |

## Part F — PR checklist

Before merge:

- [ ] Close/supersede Dependabot #221 with link to this upgrade PR
- [ ] `package-lock.json` generated via Linux script
- [ ] No `invalidWhereValuesBehavior` rollback in DataSource config
- [ ] No `@typeorm/legacy-naming-strategies` dependency
- [ ] ORM skill updated (plan 08)
- [ ] CI green on PR

## Part G — Complete plan set

Per plan-completion skill:

```bash
mv .llm/plans/active/typeorm-v1-upgrade .llm/plans/completed/typeorm-v1-upgrade
```

Update `COPY-PASTA.md` progress checkboxes to all ✅ before move.

## Deliverables

- [ ] Full build matrix passes
- [ ] Lint passes
- [ ] Unit tests pass
- [ ] API integration tests pass
- [ ] All grep gates pass
- [ ] Plan set moved to `completed/`

## Verification (single copy-paste block)

```bash
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run build -w apps/api
./scripts/nix/with-env npm run build -w apps/management-api
./scripts/nix/with-env npm run build -w apps/workers
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run test:unit
./scripts/nix/with-env npm run test -w @podverse/orm
make test_deps
./scripts/nix/with-env npm run test:e2e:api
rg "relations: \[|select: \[" --glob '*.ts' --glob '!**/.llm/**'
rg "typeorm-naming-strategies" --glob '!**/.llm/**' --glob '!package-lock.json'
rg "findOne\('" packages/orm --glob '*.ts'
```

## Completion checklist

- [ ] All commands above exit 0 / zero grep matches
- [ ] PR ready for review
- [ ] Plan set archived under `completed/typeorm-v1-upgrade/`

## Non-goals (this plan)

- `make e2e_test_web_report` — run only if API changes cause suspected UI regressions
- Metaboost TypeORM upgrade — separate repo/plan
