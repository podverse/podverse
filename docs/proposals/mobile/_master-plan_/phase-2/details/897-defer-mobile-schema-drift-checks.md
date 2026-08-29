# 897-defer-mobile-schema-drift-checks

**Master step:** P2.3.11
**Model (author + implement):** Auto
**Status:** draft — deferred until after Phase 2

## Scope

After Phase 2 closes, evaluate whether the mobile SQLite schema needs automated migration-drift
protection:

- Assess `drizzle-kit` for generating or checking mobile migrations.
- Alternatively, add a CI or unit-test check that compares
  `apps/mobile/src/data/db/schema.ts`, the forward-only migration list, and the expected SQLite
  schema.
- Verify that the chosen approach handles upgrades from existing installed databases, not only fresh
  database creation.

This is a follow-up to the mobile data-layer foundation. It does **not** reopen the decision to use
Drizzle for mobile or attempt to share mobile SQLite entities with the server TypeORM model.

## Why deferred

The current mobile schema is small, migrations are explicit, and Phase 2 is focused on product
features and visual resolution. A drift check becomes more valuable as more mobile domains and
contributors add tables, indexes, and migrations. Revisit it after Phase 2 when the schema has enough
surface area to judge the maintenance cost and failure modes.

## Acceptance criteria

- The follow-up evaluates `drizzle-kit` and a lightweight schema/migration drift check.
- The chosen approach detects schema changes that lack a corresponding forward migration.
- CI or unit verification covers both a fresh database and an upgrade path.
- The check preserves the existing forward-only migration policy and does not couple mobile SQLite
  to server TypeORM migrations.

## Web parity references

- [Mobile offline-first data-layer decision](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md)
- `apps/mobile/src/data/db/schema.ts`
- `apps/mobile/src/data/db/migrations.ts`
- `apps/mobile/src/data/db/runMigrations.ts`

## Verification

N/A while deferred (documentation-only follow-up).
