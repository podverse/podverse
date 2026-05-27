---
name: podverse-orm-patterns
description: TypeORM v1 patterns for @podverse/orm — DataSource lifecycle, find options, services, linear SQL migrations
version: 2.0.0
---

# Podverse ORM (TypeORM v1)

Quick reference for `@podverse/orm` (`packages/orm/`). Podverse uses **TypeORM 1.x** with **linear SQL migrations** only — not the TypeORM CLI.

## Monorepo context

- **Package:** `@podverse/orm` — entities, services, `createORMContext`, shared find-option helpers
- **Schema (canonical):** `infra/k8s/base/ops/source/database/linear-migrations/`
- **Contributor doc:** [docs/operations/database/LINEAR-MIGRATIONS.md](docs/operations/database/LINEAR-MIGRATIONS.md)
- **After SQL changes:** `make db_regen_linear_baseline` when baselines must be regenerated (see AGENTS.md / linear-baseline rule)
- **Helper packages:** `@podverse/helpers`, `@podverse/helpers-validation`, `@podverse/helpers-config`

## DataSource lifecycle

Apps call `createORMContext(config)` from `@podverse/orm`, then initialize **read** and **read-write** sources separately:

```typescript
import { createORMContext } from '@podverse/orm';

const orm = createORMContext(ormConfig);
await orm.dataSourceRead.initialize();
await orm.dataSourceReadWrite.initialize();

// shutdown
await orm.dataSourceRead.destroy();
await orm.dataSourceReadWrite.destroy();
```

- **Workers / API:** context is set at startup; services use `getDataSourceRead()` / `getDataSourceReadWrite()` internally.
- **Management-api:** four DataSources (management entities + app console raw SQL) — see `apps/management-api/src/index.ts`.
- Use **entity class references** in APIs: `manager.findOne(Queue, { where: … })`, not string entity names.

## Repository access

Use a `DataSource` instance or service base classes — **never** import repository accessors from the top-level `typeorm` package (use `dataSource.getRepository(Entity)` on an initialized source).

```typescript
import { getDataSourceRead } from '@podverse/orm';
import { Clip } from '@podverse/orm';

const repo = getDataSourceRead().getRepository(Clip);
await repo.findOne({ where: { id_text: idText } });
```

`BaseManyService` / `BaseOneService` wire repositories from context in their constructors.

## Find options (object syntax only)

TypeORM v1 requires **object** `relations` and `select` — not string arrays.

```typescript
import { IsNull } from 'typeorm';
import type { FindOptionsRelations, FindOptionsSelect } from '@podverse/orm';

const relations: FindOptionsRelations<Account> = {
  account_profile: true,
  account_membership: { account_membership_status: true },
};

const select: FindOptionsSelect<Account> = {
  id: true,
  id_text: true,
  email: true,
};

await repo.find({
  where: {
    email,
    deleted_at: IsNull(),
  },
  relations,
  select,
});
```

**Nested paths from dot strings:** use `findOptionsRelationsFromPaths` / `mergeFindOptionsRelations` from `@podverse/orm` when converting legacy path lists.

**Optional filters:** do not pass `undefined` in `where` (v1 throws). Omit keys or build the object conditionally:

```typescript
where: {
  ...(optionalName !== undefined ? { name: optionalName } : {}),
}
```

Do **not** set `invalidWhereValuesBehavior` to ignore null/undefined on the DataSource.

## Transactions

```typescript
await getDataSourceReadWrite().transaction(async (manager) => {
  const queue = await manager.findOne(Queue, { where: { id_text: queueIdText } });
  await manager.save(QueueResource, partial);
});
```

Prefer `dataSource.transaction` or `manager.transaction` inside an existing unit of work.

## QueryBuilder

For complex filters, use the repository or manager QueryBuilder with explicit aliases:

```typescript
const rows = await repo
  .createQueryBuilder('clip')
  .innerJoin('clip.item', 'item')
  .where('item.channel_id = :channelId', { channelId })
  .orderBy('clip.id', 'DESC')
  .getMany();
```

Use **entity classes** in `findOne` / `update` / `delete` — not string table names.

## Schema changes (linear SQL only)

1. Add a new forward-only `.sql` file under `linear-migrations/` (app or management tree per table).
2. Update readiness markers / docs if required.
3. Regenerate committed baseline gz when the plan or PR workflow calls for it (`make db_regen_linear_baseline`).

Do **not** use `npm run typeorm migration:*`, `infra/database/main/migrations/`, or TypeORM `MigrationInterface` classes in this repo.

## Naming strategy

Use `SnakeNamingStrategy` from `@podverse/orm` on every DataSource that maps entities:

```typescript
import { SnakeNamingStrategy } from '@podverse/orm';

namingStrategy: new SnakeNamingStrategy(),
```

## Entity conventions

- Table/column names: **snake_case** in DB; TypeScript properties match entity fields.
- Relations: `Relation<T>` on the property; `@ManyToOne` / `@JoinColumn` with explicit `name`.
- IDs: often `id` (number) + `id_text` (public string).

```typescript
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('clip')
export class Clip {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true, length: NANO_ID_V2_MAX_LENGTH })
  id_text!: string;

  @ManyToOne('Account', (account: Account) => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Relation<Account>;
}
```

## Service pattern

Business data access lives in **classes** under `packages/orm/src/services/`:

- `AccountService` — standalone class with read/write repos
- `ClipService extends BaseManyService<Clip, 'account'>` — parent-scoped CRUD
- Export services and entities from `packages/orm/src/index.ts`; apps import `@podverse/orm`

Controllers and workers should call **services**, not repositories directly.

## Type re-exports from `@podverse/orm`

Prefer importing find-option types from the package (keeps apps aligned with the ORM version):

```typescript
import type {
  FindManyOptions,
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
} from '@podverse/orm';
```

`EntityManager` is re-exported from `packages/orm/src/lib/typeORMTypes.ts`.

## `varchar` lengths

- **SQL:** explicit `VARCHAR(n)` in linear migration files.
- **TypeScript:** domain-named constants in `packages/orm/src/lib/` when reused (entity + validation); see `feedLifecycleLimits.ts`.

## File structure

```
packages/orm/src/
├── entities/
├── services/
├── lib/                 # snakeNamingStrategy, findOptionsRelationsFromPaths, limits
├── factory.ts           # createORMContext
├── context.ts           # getDataSourceRead / ReadWrite
└── index.ts

infra/k8s/base/ops/source/database/linear-migrations/
├── app/
└── management/
```

## Related skills

- **[API Patterns](../api/SKILL.md)** — using ORM in controllers
- **[Workers](../workers/SKILL.md)** — ORM context in worker commands
- **[Global Patterns](../global/SKILL.md)** — monorepo conventions
- **linear-baseline-0003** rule — baseline regeneration
