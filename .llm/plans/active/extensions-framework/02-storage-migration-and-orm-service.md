# Phase 02 — Storage migration and ORM service

Add the `extension_settings` table, regenerate the linear baseline gz, and ship the
TypeORM entity and service so phase `03` (resolver) and phase `05` (management-api)
can read and write it.

## Linear migration

New file:
`infra/k8s/base/ops/source/database/linear-migrations/app/0032_extension_settings.sql`.

Authoring rules per
[`linear-sql-greenfield-only`](../../../../.cursor/skills/linear-sql-greenfield-only/SKILL.md):
strict greenfield-only forward chain, no upgrade/idempotency clutter.

```sql
-- 0032_extension_settings.sql
-- Extension settings for the conditional extensions framework.
-- See docs/proposals/EXTENSIONS.md.

CREATE TABLE extension_settings (
  id varchar(120) PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by_admin_id integer NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX extension_settings_updated_at_idx ON extension_settings (updated_at);
```

Per the [`linear-baseline-0003`](../../../../.cursor/rules/linear-baseline-0003.mdc)
rule, after editing SQL run:

```bash
./scripts/nix/with-env make db_regen_linear_baseline
```

Commit the regenerated `0003a_app_linear_baseline.sql.gz` along with the new SQL file.
Update the readiness migration marker per the
[`migration-readiness-marker-sync`](../../../../.cursor/skills/migration-readiness-marker-sync/SKILL.md)
skill if the K8s init readiness check pins a specific marker.

## ORM entity

`packages/orm/src/entities/ExtensionSetting.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'extension_settings' })
export class ExtensionSetting {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id!: string;

  @Column({ type: 'boolean', default: false })
  enabled!: boolean;

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  config!: Record<string, unknown>;

  @Column({ name: 'updated_by_admin_id', type: 'integer', nullable: true })
  updatedByAdminId!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Index()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
```

Register the entity in `packages/orm/src/data-source.ts` alongside existing app-DB
entities, and re-export it from `packages/orm/src/index.ts` so apps can import it via
`@podverse/orm`.

## ORM service

`packages/orm/src/services/ExtensionSettingsService.ts`:

```ts
import type { DataSource, Repository } from 'typeorm';

import { ExtensionSetting } from '../entities/ExtensionSetting.js';

export class ExtensionSettingsService {
  static repo(ds: DataSource): Repository<ExtensionSetting> {
    return ds.getRepository(ExtensionSetting);
  }

  static async findById(
    ds: DataSource,
    id: string
  ): Promise<ExtensionSetting | null> {
    return this.repo(ds).findOneBy({ id });
  }

  static async findAll(ds: DataSource): Promise<ExtensionSetting[]> {
    return this.repo(ds).find({ order: { id: 'ASC' } });
  }

  static async upsert(
    ds: DataSource,
    input: {
      id: string;
      enabled: boolean;
      config: Record<string, unknown>;
      updatedByAdminId: number | null;
    }
  ): Promise<ExtensionSetting> {
    const repo = this.repo(ds);
    const existing = await repo.findOneBy({ id: input.id });
    if (existing === null) {
      const created = repo.create({
        id: input.id,
        enabled: input.enabled,
        config: input.config,
        updatedByAdminId: input.updatedByAdminId,
      });
      return repo.save(created);
    }
    existing.enabled = input.enabled;
    existing.config = input.config;
    existing.updatedByAdminId = input.updatedByAdminId;
    return repo.save(existing);
  }

  static async deleteById(ds: DataSource, id: string): Promise<void> {
    await this.repo(ds).delete({ id });
  }
}
```

Re-export from `packages/orm/src/index.ts`.

## Integration tests

`packages/orm/src/services/ExtensionSettingsService.integration.test.ts` (or follow
the test layout used by sibling services in `packages/orm`):

- Setup: connect to `podverse_app_test` per the existing service-test pattern.
- Cases:
  - `findAll` on an empty table returns `[]`.
  - `upsert` inserts a new row when none exists, and `findById` returns it.
  - `upsert` updates `enabled`, `config`, and `updatedByAdminId` when a row exists,
    and `updated_at` changes.
  - `deleteById` removes a row.
  - `config` round-trips arbitrary jsonb (object, nested object, empty object).

## Verification

```bash
./scripts/nix/with-env make test_deps
./scripts/nix/with-env npm run test -w @podverse/orm
./scripts/nix/with-env npm run lint -w @podverse/orm
./scripts/nix/with-env npm run build -w @podverse/orm
```

Confirm the regenerated `0003a_app_linear_baseline.sql.gz` is committed and that
`/test` on the PR re-verifies the linear chain in CI.
