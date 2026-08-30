# 897-defer-mobile-schema-and-persistence-contract-checks

**Master step:** P2.3.11
**Model (author + implement):** Auto
**Status:** deferred until after Phase 2

## Scope

After Phase 2 closes, evaluate whether mobile persistence needs automated contract protection:

- Assess `drizzle-kit` for generating or checking mobile migrations.
- Alternatively, add a CI or unit-test check that compares
  `apps/mobile/src/data/db/schema.ts`, the forward-only migration list, and the expected SQLite
  schema.
- Define how persisted DTO-shaped JSON is versioned and validated before it reaches offline
  consumers.
- Apply the same review to the Add-by-RSS path: server parse payload, parser-mapping bundle,
  `add_by_rss_feed` scalar fields and JSON bundle, and playback reconstruction.
- Cover stale, malformed, missing, and upgraded persisted payloads without making mobile SQLite
  depend on the server TypeORM model.
- Verify that the chosen approach handles upgrades from existing installed databases, not only fresh
  database creation.

This is a follow-up to the mobile data-layer foundation. It does **not** reopen the decision to use
Drizzle for mobile or attempt to share mobile SQLite entities with the server TypeORM model.

## Why deferred

The current mobile schema is small, migrations are explicit, and Phase 2 is focused on product
features and visual resolution. Contract protection becomes more valuable as more mobile domains and
persisted JSON payloads accumulate. Revisit it after Phase 2 when the schema and offline data surface
are large enough to judge the maintenance cost and failure modes.

## Confirmed against what shipped

Mobile migrations and Add-by-RSS persistence are currently maintained explicitly: scalar columns have
forward-only migrations, while the mapped feed is stored as a JSON bundle and reconstructed for
playback. The follow-up evaluates how to protect both forms as the offline data surface grows.

## Acceptance criteria

- The follow-up evaluates `drizzle-kit` and a lightweight schema/migration drift check.
- The chosen approach detects schema changes that lack a corresponding forward migration.
- Persisted DTO and Add-by-RSS bundle changes have an explicit versioning and recovery strategy.
- Runtime validation prevents malformed or incompatible bundles from reaching playback consumers.
- Tests cover fresh databases, upgrades from existing databases, and stale or malformed persisted
  payloads.
- CI or unit verification covers both a fresh database and an upgrade path.
- The check preserves the existing forward-only migration policy and does not couple mobile SQLite
  to server TypeORM migrations.

## Web parity references

- [Mobile offline-first data-layer decision](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md)
- `apps/mobile/src/data/db/schema.ts`
- `apps/mobile/src/data/db/migrations.ts`
- `apps/mobile/src/data/db/runMigrations.ts`
- `apps/mobile/src/data/repositories/addByRssRepository.ts`
- `apps/mobile/src/lib/addByRss/domain.ts`
- `packages/parser-mapping/src/addByRSS/`

## Verification

N/A while deferred (documentation-only follow-up).
