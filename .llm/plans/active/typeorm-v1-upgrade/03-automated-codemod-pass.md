# Plan 03 — Automated codemod pass

## Objective

Apply the official **`@typeorm/codemod v1`** transforms across all TypeORM-touching source trees, resolve every `TODO` comment left by the codemod, and run lint fix.

Reference: [Upgrading from 0.3 to 1.0](https://typeorm.io/docs/releases/1.0/upgrading-from-0.3/).

## Scope

**Run codemod on:**

| Path | Notes |
| ---- | ----- |
| `packages/orm/src` | Largest surface (~121 entities) |
| `apps/management-api/src` | Entities + services + appDb |
| `apps/workers/src` | One command imports typeorm operators |
| `packages/parser/src` | RSS save transactions |
| `tools/web-perf/lighthouse/src` | Minimal DataSource |
| `scripts/add-by-rss/reencrypt-add-by-rss-credentials.ts` | Single script file |

**Do not run on:** `dist/`, `node_modules/`, `.llm/`, compiled i18n, linear SQL.

**Not handled by codemod (plans 04–06):**

- String-array `relations: [...]` → object syntax (45 files)
- String-array `select: [...]` → object syntax (4 files)
- `manager.findOne('Queue', …)` string entity names

## Steps

### 1. Dry run

From repo root:

```bash
./scripts/nix/with-env npx @typeorm/codemod v1 --dry \
  packages/orm/src \
  apps/management-api/src \
  apps/workers/src \
  packages/parser/src \
  tools/web-perf/lighthouse/src \
  scripts/add-by-rss/reencrypt-add-by-rss-credentials.ts
```

Review output. Note transforms that touch files outside the list above.

### 2. Apply codemod

```bash
./scripts/nix/with-env npx @typeorm/codemod v1 \
  packages/orm/src \
  apps/management-api/src \
  apps/workers/src \
  packages/parser/src \
  tools/web-perf/lighthouse/src \
  scripts/add-by-rss/reencrypt-add-by-rss-credentials.ts
```

The codemod may rename:

- `.connection` → `.dataSource` on typed instances
- `exist` → `exists`
- Import path adjustments
- Other v1 API renames per upstream transforms

### 3. Resolve all codemod TODOs

Search and fix every manual follow-up:

```bash
rg 'TODO.*typeorm|TODO.*codemod|@typeorm/codemod' \
  --glob '*.ts' --glob '!**/.llm/**'
```

Rules:

- **No deferrals** — each TODO must be fixed or replaced with correct v1 code in this plan.
- Do not add compatibility wrappers for removed APIs.
- If codemod missed untyped code (no type signal), fix manually after reviewing `git diff`.

### 4. Format and lint

```bash
./scripts/nix/with-env npm run lint:fix
./scripts/nix/with-env npm run prettier:write
```

Focus on touched paths if full-repo lint is slow; then run full lint before plan 09.

### 5. Spot-check high-value files

After codemod, confirm these still compile logically (full compile may wait until plan 04):

| File | Check |
| ---- | ----- |
| `packages/orm/src/factory.ts` | DataSource options unchanged semantically |
| `packages/orm/src/db/index.ts` | Proxy delegates intact |
| `packages/orm/src/context.ts` | Accessors unchanged |
| `apps/management-api/src/orm/db/appDb.ts` | Raw SQL DataSources |
| `packages/orm/src/lib/postgresUniqueViolation.ts` | `QueryFailedError` import |

## Transforms Podverse likely does NOT need

Baseline inventory showed **zero** usages of:

- `Connection`, `getConnection`, `createConnection`
- `loadRelationCountAndMap`
- `findByIds`, `findOneById`
- `join:` find option
- `onConflict`, `printSql`
- `EntityRepository`, `AbstractRepository`

Codemod may still touch imports or typings — review diff regardless.

## Key files

| Path | Risk |
| ---- | ---- |
| `packages/orm/src/services/base/*.ts` | Shared repository patterns |
| `packages/orm/src/lib/typeORMTypes.ts` | Re-exports `EntityManager` |
| `packages/orm/src/index.ts` | Type re-exports from typeorm |
| `apps/api/src/controllers/*.ts` | Indirect — only if codemod scope bleeds |

## Deliverables

- [ ] Codemod applied to all scoped paths
- [ ] Zero codemod TODO comments remaining
- [ ] `npm run lint:fix` clean on touched files
- [ ] `git diff` reviewed for unexpected changes outside scope

## Verification

```bash
rg 'TODO.*typeorm|TODO.*codemod' --glob '*.ts' --glob '!**/.llm/**'
rg 'getConnection|createConnection' --glob '*.ts' --glob '!**/.llm/**'
./scripts/nix/with-env npm run lint:fix
```

Compile may still fail on string `relations` — that is expected until plan 04.

## Completion checklist

- [ ] Dry run reviewed before apply
- [ ] All TODOs resolved
- [ ] Lint fix run
- [ ] No legacy global TypeORM APIs reintroduced
