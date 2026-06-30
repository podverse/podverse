---
name: linear-sql-greenfield-only
description: Author Podverse linear SQL migrations as strict greenfield-only forward chains—no upgrade/idempotency clutter unless a prior file in the same chain requires it.
---

# Linear SQL — greenfield-only authoring (Podverse)

Use when adding or editing files under:

- `infra/k8s/base/ops/source/database/linear-migrations/app/**`
- `infra/k8s/base/ops/source/database/linear-migrations/management/**`

## Contract

Linear migrations model **ordered fresh applies**: migration `NNNN` may assume the schema and data produced by all strictly earlier files in that chain (`0000`, …, `NNNN-1`). They are **not** written for ad-hoc repair on arbitrary pre-chain database states.

## Do (greenfield)

- Use plain `CREATE TABLE`, `ALTER TABLE … ADD`, `DROP …`, `INSERT`, etc., when the object or absence is guaranteed by prior migrations.
- Keep deterministic literals for seeds when baselines must stay byte-stable (fixed timestamps, explicit UUIDs where the repo already pins them).
- After changing SQL: `make db_regen_linear_baseline`, then `make db_verify_linear_baseline`, commit updated `0004`/`0005` (see [linear-baseline-0004](/.cursor/rules/linear-baseline-0004.mdc)).

## Don’t (unless prior migrations make it necessary)

- `CREATE … IF NOT EXISTS` / `DROP … IF EXISTS` for objects wholly owned by this chain.
- `INSERT … ON CONFLICT DO NOTHING` (or `UPDATE`) solely to tolerate duplicate applies or unknown pre-state.
- `INSERT … WHERE NOT EXISTS (SELECT …)` guards when uniqueness is already guaranteed by chain order.
- Large `DO $$` blocks that introspect `information_schema` / `pg_catalog` to branch for upgrades.

## Exceptions

- **Runner/bootstrap:** Podverse’s migration runner may create `linear_migration_history` outside individual `.sql` files; do not duplicate that DDL inside migrations if it would conflict on apply.
- **Truly conditional evolution:** If a later migration must depend on a name or shape that varied across historical branches and the repo still documents one canonical predecessor state, prefer documenting the guarantee in an earlier migration rather than re-introducing catalog probes—reserve guards only when unavoidable.

## Related

- [migration-readiness-marker-sync](/.cursor/skills/migration-readiness-marker-sync/SKILL.md) — marker env when filenames advance.
- [docs/operations/database/LINEAR-MIGRATIONS.md](/docs/operations/database/LINEAR-MIGRATIONS.md) — bootstrap and baseline contract.
