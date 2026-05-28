# Plan 02 — Dependency bump and naming strategy

## Objective

Bump `typeorm` to **1.0.0**, replace `typeorm-naming-strategies` with a **vendored `SnakeNamingStrategy`** in `@podverse/orm`, and refresh the Linux-canonical lockfile.

## Scope

| File | Change |
| ---- | ------ |
| `packages/orm/package.json` | `typeorm@^1.0.0`; remove `typeorm-naming-strategies` |
| `apps/management-api/package.json` | same |
| `apps/workers/package.json` | `typeorm@^1.0.0` only |
| `tools/web-perf/lighthouse/package.json` | align to `^1.0.0` |
| `package-lock.json` | regen via Linux script |
| `packages/orm/src/lib/snakeNamingStrategy.ts` | **new** |
| `packages/orm/src/factory.ts` | import vendored strategy |
| `apps/management-api/src/orm/db/index.ts` | import from `@podverse/orm` |
| `apps/management-api/src/orm/db/appDb.ts` | import from `@podverse/orm` |

**Not in this plan:** find-options conversions (plans 04–05), codemod (plan 03).

## Steps

### 1. Add vendored SnakeNamingStrategy

Create `packages/orm/src/lib/snakeNamingStrategy.ts` by porting the MIT-licensed implementation from [typeorm-naming-strategies](https://github.com/tonivj5/typeorm-naming-strategies) (`snake-naming.strategy.js`). Keep the class name `SnakeNamingStrategy` and implement `NamingStrategyInterface` from `typeorm`.

Minimum methods (match upstream snake strategy):

- `tableName(className, customName)`
- `columnName(propertyName, customName, embeddedPrefixes)`
- `relationName(propertyName)`
- `joinColumnName(relationName, referencedColumnName)`
- `joinTableName(firstTableName, secondTableName, firstPropertyName, secondPropertyName)`
- `joinTableColumnName(tableName, propertyName, columnName?)`
- `joinTableInverseColumnName(tableName, propertyName, columnName?)`
- `prefixTableName(prefix, tableName)`
- `nestedColumnName(propertyName, embeddedPrefixes)`
- `closureJunctionTableName(originalClosureTableName)`

Add a one-line file header comment: `Ported from typeorm-naming-strategies (MIT).`

Export from `packages/orm/src/index.ts`:

```typescript
export { SnakeNamingStrategy } from './lib/snakeNamingStrategy.js';
```

### 2. Update DataSource factories

**`packages/orm/src/factory.ts`:**

```typescript
import { SnakeNamingStrategy } from './lib/snakeNamingStrategy.js';
// Remove: import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
```

**`apps/management-api/src/orm/db/index.ts`:**

```typescript
import { SnakeNamingStrategy } from '@podverse/orm';
// Remove: import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
```

**`apps/management-api/src/orm/db/appDb.ts`:**

```typescript
import { SnakeNamingStrategy } from '@podverse/orm';
// Remove: import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
```

Do **not** add `@typeorm/legacy-naming-strategies` or `NamingStrategyV03`.

### 3. Bump typeorm version

In all four `package.json` files, set:

```json
"typeorm": "^1.0.0"
```

Remove `"typeorm-naming-strategies"` from `packages/orm` and `apps/management-api`.

### 4. Install and regenerate lockfile

```bash
./scripts/nix/with-env npm install
./scripts/development/update-lockfile-linux.sh
```

Commit `package-lock.json`. Verify resolved version:

```bash
./scripts/nix/with-env npm ls typeorm
```

### 5. Document expected compile state

After this plan, **`npm run build:packages` will likely fail** until plans 03–06 complete (string relations, codemod TODOs). That is expected — do not revert the bump.

## Key files

| Path | Notes |
| ---- | ----- |
| `packages/orm/src/lib/snakeNamingStrategy.ts` | New vendored strategy |
| `packages/orm/src/factory.ts` | App DB dual DataSource |
| `packages/orm/src/index.ts` | Export strategy for management-api |
| `apps/management-api/src/orm/db/index.ts` | Management DB DataSources |
| `apps/management-api/src/orm/db/appDb.ts` | App console raw-SQL DataSources (no entities) |

## Expected compile failures (OK until later plans)

- String `relations: [...]` type errors
- Removed deprecated APIs caught by codemod in plan 03
- Possible `FindOptionsRelationByString` type removal

## Deliverables

- [x] `SnakeNamingStrategy` vendored and exported
- [x] All four workspaces on `typeorm@^1.0.0`
- [x] `typeorm-naming-strategies` removed from package.json files
- [x] Linux lockfile regenerated (`package-lock.json`)
- [ ] Dependabot #221 closed/superseded when branch is pushed (link to `chore/typeorm-v1` / this plan set)

## Completion note

**Executed:** 2026-05-26 on `chore/typeorm-v1` in `/Users/mitcheldowney/repos/pv/podverse-typeorm-v1`.

- Added `packages/orm/src/lib/snakeNamingStrategy.ts` (MIT port); exported from `@podverse/orm`.
- Updated `factory.ts`, `management-api` `orm/db/index.ts` and `appDb.ts` imports.
- `npm ls typeorm` → **1.0.0** at root, orm, management-api, workers.
- `typeorm-naming-strategies` absent from `package-lock.json` and all `package.json` files.
- `npm run type-check -w @podverse/orm` fails on string `relations` (expected until plans 04–06).

## Verification

```bash
rg "typeorm-naming-strategies" package.json packages apps tools
rg '"typeorm".*"\\^0\\.3' package.json packages apps tools/web-perf/lighthouse
./scripts/nix/with-env npm ls typeorm
test -f packages/orm/src/lib/snakeNamingStrategy.ts
```

## Completion checklist

- [x] No `typeorm-naming-strategies` in package.json or TS imports
- [x] `npm ls typeorm` shows 1.x at repo root
- [x] Lockfile updated (commit with branch)
