# Plan 07 — Management-api and satellite consumers

## Objective

Ensure **management-api** (4 DataSources), **workers**, **lighthouse**, and **test-assets** compile and behave correctly under TypeORM v1 after core ORM changes (plans 02–06).

## Scope

| Consumer | TypeORM usage |
| -------- | ------------- |
| `apps/management-api` | 2× management DB + 2× app console DB DataSources |
| `apps/workers` | `@podverse/orm` context; direct operator imports in one command |
| `tools/web-perf/lighthouse` | Standalone minimal DataSource + raw SQL |
| `tools/test-assets` | Seed script with `getRepository` / QB |

## Part A — management-api (4 DataSources)

### Management schema (entities)

| DataSource | Path |
| ---------- | ---- |
| Read | `apps/management-api/src/orm/db/index.ts` |
| Read/write | same file |

- 6 entities under `apps/management-api/src/orm/entities/`
- Uses `SnakeNamingStrategy` from `@podverse/orm` (after plan 02)
- String relations in `adminAccount.ts` converted in plan 05

**Startup:** `apps/management-api/src/index.ts` initializes all four sources before HTTP.

Verify:

```typescript
await AppDataSourceRead.initialize();
await AppDataSourceReadWrite.initialize();
await AppDbDataSourceRead.initialize();
await AppDbDataSourceReadWrite.initialize();
```

Shutdown must call `.destroy()` on all four.

### App console DB (no entities, raw SQL)

| DataSource | Path |
| ---------- | ---- |
| Read | `apps/management-api/src/orm/db/appDb.ts` |
| Read/write | same file |

- `entities: []` — raw `.query()` only
- **Update import:** replace `typeorm-naming-strategies` with `SnakeNamingStrategy` from `@podverse/orm` (if not done in plan 02)

**Feed flag helper:** `apps/management-api/src/lib/feed/feedFlagStatusAppDb.ts`

- Uses app DB DataSources + transactions
- Confirm v1 `EntityManager.transaction` / `QueryRunner` API unchanged in usage

### Management-api build and tests

```bash
./scripts/nix/with-env npm run build -w apps/management-api
./scripts/nix/with-env npm run test -w apps/management-api
```

Integration tests mostly mock ORM — ensure mocks still match v1 method names if codemod renamed any (e.g. `exist` → `exists`).

## Part B — workers

| File | Notes |
| ---- | ----- |
| `apps/workers/src/index.ts` | `createORMContext` → initialize both → destroy on teardown |
| `apps/workers/src/commands/orm/addByRSS/reencryptCredentials.ts` | Direct `In`, `typeorm` operators; select converted in plan 05 |

Workers depend on `@podverse/orm` — no local DataSource config. Verify build:

```bash
./scripts/nix/with-env npm run build -w apps/workers
```

## Part C — lighthouse tool

| File | Notes |
| ---- | ----- |
| `tools/web-perf/lighthouse/package.json` | `typeorm@^1.0.0` (plan 02) |
| `tools/web-perf/lighthouse/src/user-manager.ts` | Minimal DataSource, `entities: []`, raw SQL |

- Uses `dataSource.isInitialized` (already v1-compatible naming)
- No naming strategy required (no entities)
- Align version with monorepo — do not leave on older `^0.3.20` pin

Build (if workspace wired):

```bash
./scripts/nix/with-env npm run build -w tools/web-perf/lighthouse 2>/dev/null || \
  cd tools/web-perf/lighthouse && ../../scripts/nix/with-env npm run build
```

## Part D — test-assets seed

| File | Notes |
| ---- | ----- |
| `tools/test-assets/src/populate-database.ts` | `getRepository` on DataSource instance, QueryBuilder |

- Uses **instance** `dataSource.getRepository(Entity)` — not global `getRepository` from `'typeorm'`
- Review QB after v1 bump; fix compile errors if any

## Part E — parser package (build gate)

Parser uses `AppDataSourceReadWrite.manager.transaction` — no local config. Confirm build:

```bash
./scripts/nix/with-env npm run build -w @podverse/parser
```

## Steps

1. Update `appDb.ts` naming strategy import if still on `typeorm-naming-strategies`.
2. Build management-api; fix remaining compile errors.
3. Build workers and parser.
4. Build/smoke lighthouse user-manager initialize path (optional local DB).
5. Review test-assets populate script for v1 API changes.

## Key files

| Path | Role |
| ---- | ---- |
| `apps/management-api/src/index.ts` | 4× initialize/destroy |
| `apps/management-api/src/orm/db/index.ts` | Management entities DS |
| `apps/management-api/src/orm/db/appDb.ts` | App console raw SQL DS |
| `apps/management-api/src/lib/feed/feedFlagStatusAppDb.ts` | Transactions on app DB |
| `tools/web-perf/lighthouse/src/user-manager.ts` | Isolated DataSource |
| `tools/test-assets/src/populate-database.ts` | Seed QB |

## Deliverables

- [ ] All four management-api DataSources compile and lifecycle unchanged
- [ ] `appDb.ts` uses `@podverse/orm` naming strategy
- [ ] workers, parser, management-api build successfully
- [ ] lighthouse on typeorm 1.x
- [ ] test-assets script compiles

## Verification

```bash
rg "typeorm-naming-strategies" apps/management-api tools
./scripts/nix/with-env npm run build -w apps/management-api
./scripts/nix/with-env npm run build -w apps/workers
./scripts/nix/with-env npm run build -w @podverse/parser
```

## Completion checklist

- [ ] management-api build passes
- [ ] workers build passes
- [ ] No stale naming-strategy imports in management-api
- [ ] Satellite tools reviewed for v1 API usage
