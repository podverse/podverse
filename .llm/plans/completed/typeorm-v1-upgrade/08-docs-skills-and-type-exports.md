# Plan 08 — Docs, skills, and type exports

## Objective

Rewrite contributor guidance and audit type re-exports so documentation matches **TypeORM v1-only** patterns. Remove stale v0.3 examples and TypeORM CLI migration references.

## Scope

| Path | Action |
| ---- | ------ |
| `.cursor/skills/orm/SKILL.md` | Full rewrite |
| `packages/orm/src/index.ts` | Audit type re-exports |
| `packages/orm/src/lib/typeORMTypes.ts` | Audit EntityManager re-export |
| `docs/` | Scan for stale TypeORM migration paths |

**Hard-break:** No “upgrade from 0.3”, “formerly”, or migration narrative in updated docs.

## Part A — Rewrite ORM skill

Replace `.cursor/skills/orm/SKILL.md` content with v1 patterns:

### Required sections

1. **Monorepo context** — `@podverse/orm`, linear SQL migrations path
2. **DataSource lifecycle** — `createORMContext`, `initialize()`, `destroy()`; dual read/write
3. **Repository access** — `dataSource.getRepository(Entity)` or service base classes; **never** global `getRepository` from `'typeorm'`
4. **Find options** — object syntax only:

```typescript
// relations
relations: { account: { account_profile: true } }

// select
select: { id: true, email: true }

// where with null
import { IsNull } from 'typeorm';
where: { deleted_at: IsNull() }
```

5. **Transactions** — `dataSource.transaction` / `manager.transaction`
6. **Schema changes** — linear SQL under `infra/k8s/base/ops/source/database/linear-migrations/`; `make db_regen_linear_baseline` when needed
7. **Naming** — `SnakeNamingStrategy` from `@podverse/orm`
8. **Service pattern** — static/class services in `packages/orm/src/services/`

### Remove from skill

- `getRepository` from `'typeorm'` global import examples
- `createConnection` / `Connection` examples
- `npm run typeorm migration:*` commands
- References to `infra/database/main/migrations/` or other removed paths
- TypeORM CLI as migration path

### Entity example

Update entity snippet to match current codebase conventions (snake_case columns, `Relation<T>` types where used).

## Part B — Type re-exports

**`packages/orm/src/index.ts`:**

```typescript
export type { FindManyOptions, FindOptionsWhere, FindOptionsOrder } from 'typeorm';
```

After v1 bump:

1. Confirm these types still exist with same names (likely yes).
2. Add `FindOptionsRelations` export if API controllers/services need it consistently.
3. Remove any re-exports of removed v0.3 types.

**Consumers importing from `@podverse/orm`:**

```bash
rg "FindManyOptions|FindOptionsWhere|FindOptionsOrder|FindOptionsRelations" apps/api --glob '*.ts'
```

Update controller imports if type names changed.

**`packages/orm/src/lib/typeORMTypes.ts`:**

- Keep `EntityManager` re-export if still valid
- No `Connection` type aliases

## Part C — Docs scan

Search for stale TypeORM migration documentation:

```bash
rg -i 'typeorm migration|typeorm/cli|getRepository|createConnection|typeorm-naming-strategies|0\.3\.' \
  docs .cursor --glob '!**/.llm/**' --glob '!package-lock.json'
```

Fix repo-authored hits:

| Likely location | Fix |
| ------------- | --- |
| `docs/operations/database/` | Point to linear migrations only |
| `docs/development/` | Remove TypeORM CLI workflow if present |
| Other skills referencing ORM | Cross-link updated orm skill |

**Exclude from edits:**

- `package-lock.json` package names
- Historical `.llm/plans/completed/` unless explicitly in scope

## Part D — AGENTS.md cross-check

If `AGENTS.md` or `docs/architecture/` mentions TypeORM migrations for Podverse, update to linear SQL only. Single-sentence change — do not expand scope.

## Steps

1. Rewrite `orm/SKILL.md` following sections above.
2. Audit and update `packages/orm/src/index.ts` exports.
3. Run docs/cursor grep; fix in-scope hits.
4. Spot-check `AGENTS.md` ORM references.

## Key files

| Path | Priority |
| ---- | -------- |
| `.cursor/skills/orm/SKILL.md` | Critical |
| `packages/orm/src/index.ts` | High |
| `docs/operations/database/LINEAR-MIGRATIONS.md` | Verify consistency |

## Deliverables

- [x] ORM skill documents v1-only patterns
- [x] Type re-exports verified against typeorm 1.x (`FindManyOptions`, `FindOptionsWhere`, `FindOptionsOrder`, `FindOptionsRelations`, `FindOptionsSelect`; `EntityManager` in `typeORMTypes.ts`)
- [x] Docs/skills grep clean (per exclusions)
- [x] No pre-v1 TypeORM pattern examples in `.cursor/skills/orm/`

## Verification

```bash
rg -i 'getRepository|createConnection|typeorm-naming-strategies' .cursor/skills/orm
rg "from 'typeorm'" .cursor/skills/orm/SKILL.md
rg -i 'typeorm migration:generate|typeorm migration:run' docs .cursor --glob '!**/.llm/**'
./scripts/nix/with-env npm run build:packages
```

## Completion checklist

- [x] ORM skill rewritten
- [x] index.ts exports verified
- [x] Stale migration CLI references removed from docs/skills
- [x] packages build still passes
